from django.contrib.auth import get_user_model
from django.contrib.admin.models import LogEntry
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.models import Booking, BuyerProfile, Conversation, FarmerProfile, Listing, Message, Service, ServiceProvider


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

        return Response(
            {
                "generated_at": timezone.now().isoformat(),
                "totals": {
                    "users": User.objects.count(),
                    "providers": ServiceProvider.objects.count(),
                    "listings": Listing.objects.count(),
                    "transport_requests": transport_qs.count(),
                    "conversations": Conversation.objects.count(),
                    "messages": Message.objects.count(),
                },
                "recent": {
                    "transport_requests": recent_transport,
                    "messages": recent_messages,
                    "conversations": recent_conversations,
                    "admin_actions": recent_admin_actions,
                },
            }
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

