from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from core.models import Conversation, Message, FarmerProfile, BuyerProfile

User = get_user_model()
from .serializers import MessageSerializer, ConversationSerializer
from .utils import broadcast_to_conversation, notify_participants
import logging
import re

logger = logging.getLogger(__name__)


def _normalize_digits(p):
    if not p:
        return ""
    return re.sub(r"\D", "", str(p))


def _user_phone_tails(user):
    tails = set()
    try:
        fp = FarmerProfile.objects.filter(user=user).first()
        bp = BuyerProfile.objects.filter(user=user).first()
        for ph in [getattr(fp, "phone_number", None), getattr(bp, "phone_number", None)]:
            dig = _normalize_digits(ph)
            for l in (9, 8, 7):
                if len(dig) >= l:
                    tails.add(dig[-l:])
    except Exception:
        pass
    return tails


def _can_access_conversation(user, conv):
    if not user or not user.is_authenticated:
        return False
    if conv.channel == "internal":
        return conv.participants.filter(id=user.id).exists() or user.is_staff
    if user.is_staff:
        return True
    if conv.participants.filter(id=user.id).exists():
        return True
    conv_digits = _normalize_digits(conv.phone)
    for tail in _user_phone_tails(user):
        if tail and tail in conv_digits:
            return True
    return False


class SendMessageAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        conversation_id = request.data.get('conversation_id')
        to_user = request.data.get('to_user')
        body = (request.data.get('body') or '').strip()

        if not body:
            return Response({'detail': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Mode 1: post into an existing conversation ---
        if conversation_id:
            conv = get_object_or_404(Conversation, id=conversation_id)
            if not _can_access_conversation(request.user, conv):
                return Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)
            try:
                conv.participants.add(request.user)
            except Exception:
                logger.exception('Failed to add sender to participants')
            msg = Message.objects.create(
                conversation=conv, sender=request.user,
                inbound=False, body=body, response='',
            )
            _broadcast_message(conv, msg, request.user)
            return Response({'message_id': msg.id, 'conversation_id': conv.id})

        # --- Mode 2: user-to-user (create / get internal conversation) ---
        if to_user:
            try:
                other = User.objects.get(id=to_user)
            except User.DoesNotExist:
                return Response({'detail': 'to_user not found'}, status=status.HTTP_400_BAD_REQUEST)
            users = sorted([str(request.user.id), str(other.id)])
            key_phone = f"internal:{users[0]}:{users[1]}"
            conv, _ = Conversation.objects.get_or_create(phone=key_phone, channel='internal')
            try:
                conv.participants.add(request.user, other)
            except Exception:
                logger.exception('Failed to add participants to conversation')
            msg = Message.objects.create(
                conversation=conv, sender=request.user,
                inbound=False, body=body, response='',
            )
            _broadcast_message(conv, msg, request.user)
            return Response({'conversation_id': conv.id, 'message_id': msg.id})

        return Response({'detail': 'conversation_id or to_user required'}, status=status.HTTP_400_BAD_REQUEST)


def _broadcast_message(conv, msg, sender):
    """Push the saved message to WebSocket clients (via channel layer) using Celery."""
    message_data = {
        'id': msg.id,
        'body': msg.body,
        'sender': {'id': sender.id, 'username': sender.username},
        'inbound': False,
        'created_at': msg.created_at.isoformat(),
        'conversation': conv.id,
    }
    # Use Celery for async broadcast so the HTTP response is not delayed
    try:
        from .tasks import broadcast_chat_message, notify_user
        broadcast_chat_message.delay(conv.id, message_data)
        # Notify other participants' inbox
        participant_ids = list(
            conv.participants.exclude(id=sender.id).values_list('id', flat=True)
        )
        notification = {
            'conversation_id': conv.id,
            'sender': sender.username,
            'preview': msg.body[:80],
        }
        for uid in participant_ids:
            notify_user.delay(uid, notification)
    except Exception:
        # If Celery is not running (dev without Redis), fall back to synchronous broadcast
        logger.warning('Celery unavailable; falling back to sync broadcast for conv %s', conv.id)
        broadcast_to_conversation(conv.id, message_data)
        notify_participants(conv.id, sender, msg.body)


class ConversationMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conv_id = request.query_params.get('conversation_id')
        phone = request.query_params.get('conversation')

        if conv_id:
            conv = get_object_or_404(Conversation, id=conv_id)
        elif phone:
            conv = get_object_or_404(Conversation, phone=phone)
        else:
            return Response(
                {'detail': 'conversation_id or conversation (phone) query param required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _can_access_conversation(request.user, conv):
            return Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConversationSerializer(conv)
        return Response(serializer.data)


class ConversationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Conversation.objects.filter(participants=request.user)

        try:
            fp = FarmerProfile.objects.filter(user=request.user).first()
            bp = BuyerProfile.objects.filter(user=request.user).first()
            phone_candidates = []
            if fp and fp.phone_number:
                phone_candidates.append(fp.phone_number)
            if bp and bp.phone_number:
                phone_candidates.append(bp.phone_number)

            for ph in phone_candidates:
                phd = _normalize_digits(ph)
                for l in (9, 8, 7):
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
        other_id = request.data.get('other_user_id')
        if not other_id:
            return Response({'detail': 'other_user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            other = User.objects.get(id=other_id)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)

        users = sorted([str(request.user.id), str(other.id)])
        key_phone = f"internal:{users[0]}:{users[1]}"
        conv, _ = Conversation.objects.get_or_create(phone=key_phone, channel='internal')
        try:
            conv.participants.add(request.user, other)
        except Exception:
            logger.exception('Failed to add participants in get_or_create')
        serializer = ConversationSerializer(conv)
        return Response(serializer.data)


class MessageDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, message_id):
        msg = get_object_or_404(Message, id=message_id)
        if not request.user.is_staff and msg.sender_id != request.user.id:
            return Response({'detail': 'You can only delete your own sent messages'}, status=status.HTTP_403_FORBIDDEN)

        conv_id = msg.conversation_id
        msg_id = msg.id
        msg.delete()

        # Push best-effort notification to clients so message can be removed from open chat views.
        try:
            payload = {'type': 'message_deleted', 'id': msg_id, 'conversation': conv_id}
            from .tasks import broadcast_chat_message
            broadcast_chat_message.delay(conv_id, payload)
        except Exception:
            pass

        return Response({'detail': 'Message deleted', 'id': msg_id})

