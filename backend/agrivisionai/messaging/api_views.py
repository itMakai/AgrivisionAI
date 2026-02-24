from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from core.models import Conversation, Message, FarmerProfile, BuyerProfile
User = get_user_model()
from .utils import send_twilio_message
from .serializers import MessageSerializer, ConversationSerializer
import logging
from django.db.models import Q
import re

logger = logging.getLogger(__name__)


class SendMessageAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Support three modes:
        # 1) internal conversation by conversation_id
        # 2) internal user-to-user via to_user (id)
        # 3) external via phone 'to' (Twilio)
        conversation_id = request.data.get('conversation_id')
        to_user = request.data.get('to_user')
        to = request.data.get('to')
        body = request.data.get('body', '')
        channel = request.data.get('channel')

        if not body:
            return Response({'detail': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1) conversation_id provided -> post to that conversation
        if conversation_id:
            conv = get_object_or_404(Conversation, id=conversation_id)
            # ensure sender is participant
            try:
                if request.user and request.user.is_authenticated:
                    conv.participants.add(request.user)
            except Exception:
                logger.exception('Failed to add sender to conversation participants')
            msg = Message.objects.create(conversation=conv, inbound=False, body=body, response='', sender=(request.user if request.user.is_authenticated else None))
            return Response({'message_id': msg.id})

        # 2) internal user-to-user messaging
        if to_user:
            try:
                other = User.objects.get(id=to_user)
            except Exception:
                return Response({'detail': 'to_user not found'}, status=status.HTTP_400_BAD_REQUEST)
            if not request.user or not request.user.is_authenticated:
                return Response({'detail': 'authentication required for internal messages'}, status=status.HTTP_401_UNAUTHORIZED)
            # find existing internal conversation with both participants
            users = sorted([str(request.user.id), str(other.id)])
            key_phone = f"internal:{users[0]}:{users[1]}"
            conv, created = Conversation.objects.get_or_create(phone=key_phone, channel='internal')
            try:
                conv.participants.add(request.user)
                conv.participants.add(other)
            except Exception:
                logger.exception('Failed to add participants to conversation')
            msg = Message.objects.create(conversation=conv, inbound=False, body=body, response='', sender=request.user)
            return Response({'conversation_id': conv.id, 'message_id': msg.id})

        # 3) external phone via Twilio
        if not to:
            return Response({'detail': 'to (phone) required for external messages'}, status=status.HTTP_400_BAD_REQUEST)
        channel = channel or ('whatsapp' if str(to).startswith('whatsapp:') else 'sms')

        # existing behavior: create conv by phone
        conv, _ = Conversation.objects.get_or_create(phone=to, channel=channel)
        # if request has authenticated user, add to participants
        try:
            if request.user and request.user.is_authenticated:
                conv.participants.add(request.user)
        except Exception:
            logger.exception('Failed to add sender to conversation participants')

        # robust phone matching: normalize and search for profiles whose phone endswith the last 7-10 digits
        def normalize_digits(p):
            if not p:
                return ''
            return re.sub(r"\D", "", str(p))

        try:
            to_digits = normalize_digits(to)
            # try matching last 9, 8 and 7 digits for flexibility
            matched_user = None
            for tail_len in (9, 8, 7):
                if len(to_digits) < tail_len:
                    continue
                tail = to_digits[-tail_len:]
                fp = FarmerProfile.objects.filter(phone_number__icontains=tail).select_related('user').first()
                if fp:
                    matched_user = fp.user
                    break
                bp = BuyerProfile.objects.filter(phone_number__icontains=tail).select_related('user').first()
                if bp:
                    matched_user = bp.user
                    break
            if matched_user:
                conv.participants.add(matched_user)
        except Exception:
            logger.exception('Failed to add receiver to conversation participants')

        # Ensure `response` is set (DB enforces NOT NULL). For outbound messages we store an empty response
        # or the provider SID after sending.
        msg = Message.objects.create(conversation=conv, inbound=False, body=body, response='')

        sid = None
        try:
            sid = send_twilio_message(to, body)
        except Exception:
            logger.exception('Error sending Twilio message')
        # If we received a provider SID, store it in the message.response field for traceability.
        if sid:
            try:
                msg.response = f"sid:{sid}"
                msg.save(update_fields=['response'])
            except Exception:
                logger.exception('Failed to save message SID')

        return Response({'sid': sid, 'message_id': msg.id})


class ConversationMessagesAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Support fetching by conversation phone (legacy) or by conversation_id (preferred for internal chats)
        conv_id = request.query_params.get('conversation_id')
        phone = request.query_params.get('conversation')

        if conv_id:
            try:
                conv = get_object_or_404(Conversation, id=conv_id)
            except Exception:
                return Response({'detail': 'conversation not found'}, status=status.HTTP_404_NOT_FOUND)
        elif phone:
            conv = get_object_or_404(Conversation, phone=phone)
        else:
            return Response({'detail': 'conversation_id or conversation (phone) query param required'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ConversationSerializer(conv)
        return Response(serializer.data)


class ConversationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # include conversations where the authenticated user is a participant
        qs = Conversation.objects.filter(participants=request.user)

        # also include conversations whose phone matches the user's registered phone
        try:
            fp = FarmerProfile.objects.filter(user=request.user).first()
            bp = BuyerProfile.objects.filter(user=request.user).first()
            phone_candidates = []
            if fp and fp.phone_number:
                phone_candidates.append(fp.phone_number)
            if bp and bp.phone_number:
                phone_candidates.append(bp.phone_number)
            # normalize and match by tails
            import re
            def norm(p):
                return re.sub(r"\D", "", str(p or ''))

            for ph in phone_candidates:
                phd = norm(ph)
                # try several tail lengths
                for l in (9,8,7):
                    if len(phd) < l:
                        continue
                    tail = phd[-l:]
                    qs = qs | Conversation.objects.filter(phone__icontains=tail)
        except Exception:
            pass

        qs = qs.distinct().order_by('-created_at')
        serializer = ConversationSerializer(qs, many=True)
        return Response(serializer.data)


class GetOrCreateConversationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # payload: { other_user_id: <id> }
        other_id = request.data.get('other_user_id')
        if not other_id:
            return Response({'detail': 'other_user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            other = User.objects.get(id=other_id)
        except Exception:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        users = sorted([str(request.user.id), str(other.id)])
        key_phone = f"internal:{users[0]}:{users[1]}"
        conv, created = Conversation.objects.get_or_create(phone=key_phone, channel='internal')
        try:
            conv.participants.add(request.user)
            conv.participants.add(other)
        except Exception:
            logger.exception('Failed to add participants in get_or_create')
        serializer = ConversationSerializer(conv)
        return Response(serializer.data)
