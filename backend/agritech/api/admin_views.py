from django.contrib.auth import get_user_model
from django.contrib.admin.models import LogEntry
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.models import Booking, BuyerProfile, Conversation, FarmerProfile, Listing, MarketplaceOrder, Message, Service, ServiceProvider


class AdminMetricsView(APIView):
    """Admin-only metrics for supervising system activity."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()

        transport_qs = Booking.objects.select_related("service").filter(service__service_type="transport")
        recent_transport = list(
            transport_qs.order_by("-created_at")[:10].values(
                "id",
                "status",
                "scheduled_date",
                "quantity",
                "created_at",
                "farmer__username",
                "provider__name",
                "service__title",
            )
        )

        recent_messages = list(
            Message.objects.select_related("conversation", "sender")
            .order_by("-created_at")[:10]
            .values("id", "created_at", "inbound", "body", "conversation__channel", "conversation__phone", "sender__username")
        )

        recent_conversations = list(
            Conversation.objects.order_by("-created_at")[:10].values("id", "created_at", "channel", "phone")
        )

        recent_admin_actions = list(
            LogEntry.objects.select_related("user")
            .order_by("-action_time")[:10]
            .values("action_time", "user__username", "content_type__model", "object_repr", "change_message", "action_flag")
        )

        recent_complaints = list(
            MarketplaceOrder.objects.select_related('listing__crop', 'buyer', 'seller', 'complaint_filed_by')
            .filter(complaint_open=True)
            .order_by('-updated_at')[:20]
            .values(
                'id',
                'status',
                'complaint_subject',
                'complaint_message',
                'updated_at',
                'listing__crop__name',
                'buyer__username',
                'seller__username',
                'complaint_filed_by__username',
            )
        )

        return Response(
            {
                "generated_at": timezone.now().isoformat(),
                "totals": {
                    "users": User.objects.count(),
                    "providers": ServiceProvider.objects.count(),
                    "listings": Listing.objects.count(),
                    "transport_requests": transport_qs.count(),
                    "open_complaints": MarketplaceOrder.objects.filter(complaint_open=True).count(),
                    "conversations": Conversation.objects.count(),
                    "messages": Message.objects.count(),
                },
                "recent": {
                    "transport_requests": recent_transport,
                    "complaints": recent_complaints,
                    "messages": recent_messages,
                    "conversations": recent_conversations,
                    "admin_actions": recent_admin_actions,
                },
            }
        )


def _get_internal_conversation(user_a, user_b):
    users = sorted([str(user_a.id), str(user_b.id)])
    key_phone = f"internal:{users[0]}:{users[1]}"
    conv, _ = Conversation.objects.get_or_create(phone=key_phone, channel='internal')
    try:
        conv.participants.add(user_a, user_b)
    except Exception:
        pass
    return conv


def _notify_admin_resolution(sender, recipient, body):
    if not sender or not recipient:
        return
    conv = _get_internal_conversation(sender, recipient)
    msg = Message.objects.create(
        conversation=conv,
        sender=sender,
        inbound=False,
        body=body,
        response='',
    )
    payload = {
        'id': msg.id,
        'body': msg.body,
        'sender': {'id': sender.id, 'username': sender.username},
        'inbound': False,
        'created_at': msg.created_at.isoformat(),
        'conversation': conv.id,
    }
    try:
        from messaging.tasks import broadcast_chat_message, notify_user
        broadcast_chat_message.delay(conv.id, payload)
        notify_user.delay(recipient.id, {
            'conversation_id': conv.id,
            'sender': sender.username,
            'preview': msg.body[:80],
        })
    except Exception:
        try:
            from messaging.utils import broadcast_to_conversation, notify_participants
            broadcast_to_conversation(conv.id, payload)
            notify_participants(conv.id, sender, msg.body)
        except Exception:
            pass


def _send_admin_warning(sender, recipient, body):
    if not sender or not recipient:
        return
    conv = _get_internal_conversation(sender, recipient)
    Message.objects.create(
        conversation=conv,
        sender=sender,
        inbound=False,
        body=body,
        response='',
    )


def _resolve_role(user):
    if user.is_staff or user.is_superuser:
        return 'admin'
    if ServiceProvider.objects.filter(user=user).exists():
        return 'provider'
    if FarmerProfile.objects.filter(user=user).exists():
        return 'farmer'
    if BuyerProfile.objects.filter(user=user).exists():
        return 'buyer'
    return 'user'


class AdminUserManagementView(APIView):
    """Admin-only user management endpoints."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()
        users = User.objects.all().order_by('-date_joined')[:500]
        payload = [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'role': _resolve_role(u),
                'date_joined': u.date_joined,
                'is_active': u.is_active,
            }
            for u in users
        ]
        return Response({'results': payload, 'count': len(payload)})

    def patch(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)

        is_active = request.data.get('is_active')
        make_admin = request.data.get('make_admin')

        if is_active is not None:
            user.is_active = bool(is_active)

        if make_admin is not None:
            should_be_admin = bool(make_admin)
            user.is_staff = should_be_admin
            user.is_superuser = should_be_admin

        user.save(update_fields=['is_active', 'is_staff', 'is_superuser'])
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'role': _resolve_role(user),
            }
        )

    def delete(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)
        if user.id == request.user.id:
            return Response({'detail': 'You cannot delete your own account from this endpoint'}, status=400)
        username = user.username
        user.delete()
        return Response({'detail': f'User {username} deleted'})

    def post(self, request):
        User = get_user_model()
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password')
        email = (request.data.get('email') or '').strip()
        role = (request.data.get('role') or 'farmer').strip().lower()

        if not username or not password:
            return Response({'detail': 'username and password are required'}, status=400)
        if role not in ['farmer', 'buyer', 'provider', 'admin']:
            return Response({'detail': 'invalid role. allowed roles are farmer, buyer, provider and admin'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'username already exists'}, status=400)

        user = User.objects.create_user(username=username, password=password, email=email)
        if role == 'admin':
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])
        elif role == 'farmer':
            FarmerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': request.data.get('phone_number') or '',
                    'location': request.data.get('location') or '',
                },
            )
        elif role == 'buyer':
            BuyerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': request.data.get('phone_number') or '',
                    'location': request.data.get('location') or '',
                },
            )
        elif role == 'provider':
            provider_name = request.data.get('provider_name') or username
            provider = ServiceProvider.objects.create(
                user=user,
                name=provider_name,
                contact_name=request.data.get('contact_name') or username,
                contact_phone=request.data.get('phone_number') or '',
                email=email,
                address=request.data.get('location') or '',
                offers_transport=bool(request.data.get('offers_transport') in [True, 'true', '1', 1, 'yes', 'on']),
                offers_cold_storage=bool(request.data.get('offers_cold_storage') in [True, 'true', '1', 1, 'yes', 'on']),
            )
            if provider.offers_transport and not Service.objects.filter(provider=provider, service_type='transport').exists():
                Service.objects.create(
                    provider=provider,
                    title='Transport service',
                    description='Produce pickup and delivery service.',
                    service_type='transport',
                    unit='per kg',
                )
            if provider.offers_cold_storage and not Service.objects.filter(provider=provider, service_type='storage').exists():
                Service.objects.create(
                    provider=provider,
                    title='Cold storage',
                    description='Cold storage and preservation service for produce.',
                    service_type='storage',
                    unit='per tonne',
                )

        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': _resolve_role(user),
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            },
            status=201,
        )


class AdminTransportRequestModerationView(APIView):
    """Admin-only moderation of transport service requests."""

    permission_classes = [IsAdminUser]

    def patch(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, service__service_type='transport')
        new_status = request.data.get('status')
        allowed = {'pending', 'accepted', 'completed', 'cancelled'}
        if new_status not in allowed:
            return Response({'detail': 'Invalid status value'}, status=400)

        booking.status = new_status
        booking.save(update_fields=['status'])
        return Response({'id': booking.id, 'status': booking.status})

    def delete(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, service__service_type='transport')
        bid = booking.id
        booking.delete()
        return Response({'detail': f'Transport request {bid} deleted'})


class AdminMessageModerationView(APIView):
    """Admin-only message deletion endpoint."""

    permission_classes = [IsAdminUser]

    def delete(self, request, message_id):
        msg = get_object_or_404(Message, id=message_id)
        msg.delete()
        return Response({'detail': 'Message deleted'})


class AdminOrderComplaintModerationView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):
        order = get_object_or_404(MarketplaceOrder.objects.select_related('listing__crop', 'buyer', 'seller'), id=order_id)
        resolution = (request.data.get('resolution') or '').strip()
        account_action = (request.data.get('account_action') or 'none').strip().lower()
        target_user_id = request.data.get('target_user_id')
        if not resolution:
            return Response({'detail': 'resolution is required'}, status=400)
        if account_action not in {'none', 'activate', 'warn', 'delete'}:
            return Response({'detail': 'Invalid account_action'}, status=400)

        target_user = None
        if account_action != 'none':
            if not target_user_id:
                return Response({'detail': 'target_user_id is required for this action'}, status=400)
            if str(target_user_id) == str(order.buyer_id):
                target_user = order.buyer
            elif str(target_user_id) == str(order.seller_id):
                target_user = order.seller
            else:
                return Response({'detail': 'target_user_id must match the buyer or seller of this order'}, status=400)

        target_action_result = None
        delete_target_user = None
        if target_user:
            if target_user.id == request.user.id:
                return Response({'detail': 'Admins cannot apply this action to their own account from this page'}, status=400)
            if account_action == 'activate':
                target_user.is_active = True
                target_user.save(update_fields=['is_active'])
                target_action_result = f'Activated account for {target_user.username}'
            elif account_action == 'warn':
                _send_admin_warning(
                    request.user,
                    target_user,
                    f"Admin warning regarding order complaint for {order.listing.crop.name}: {resolution}",
                )
                target_action_result = f'Sent warning to {target_user.username}'
            elif account_action == 'delete':
                _send_admin_warning(
                    request.user,
                    target_user,
                    f"Admin warning before account deletion regarding order complaint for {order.listing.crop.name}: {resolution}",
                )
                delete_target_user = target_user
                target_action_result = f'Deleted account for {target_user.username}'

        order.complaint_open = False
        order.complaint_resolution = resolution
        order.complaint_resolved_by = request.user
        order.complaint_resolved_at = timezone.now()
        order.save(update_fields=[
            'complaint_open',
            'complaint_resolution',
            'complaint_resolved_by',
            'complaint_resolved_at',
            'updated_at',
        ])

        message = f"Admin complaint decision for {order.listing.crop.name}: {resolution}"
        _notify_admin_resolution(request.user, order.buyer, message)
        _notify_admin_resolution(request.user, order.seller, message)

        if delete_target_user is not None:
            delete_target_user.delete()

        return Response({
            'id': order.id,
            'complaint_open': order.complaint_open,
            'complaint_resolution': order.complaint_resolution,
            'complaint_resolved_at': order.complaint_resolved_at,
            'account_action_result': target_action_result,
        })
