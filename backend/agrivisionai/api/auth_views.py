from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from core.models import FarmerProfile, BuyerProfile, Rating


def _resolve_role(user):
    if user.is_staff or user.is_superuser:
        return 'admin'
    if FarmerProfile.objects.filter(user=user).exists():
        return 'farmer'
    if BuyerProfile.objects.filter(user=user).exists():
        return 'buyer'
    return 'user'


def _build_privileges(role):
    is_admin = role == 'admin'
    return {
        'is_admin': is_admin,
        'can_manage_providers': is_admin,
        'can_update_any_transport_request': is_admin,
        'can_create_listing': role in ['admin', 'farmer', 'buyer', 'user'],
        'can_create_transport_request': role in ['admin', 'farmer', 'buyer', 'user'],
        'can_manage_profile': role in ['admin', 'farmer', 'buyer', 'user'],
    }


def _serialize_auth_user(user):
    role = _resolve_role(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'privileges': _build_privileges(role),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    # expected payload: username, password, email, role, phone_number, location
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')
    role = request.data.get('role', 'farmer')
    phone = request.data.get('phone_number')
    location = request.data.get('location', '')

    if not username or not password:
        return Response({'detail': 'username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    if role not in ['farmer', 'buyer']:
        return Response({'detail': 'invalid role. allowed roles are farmer and buyer'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)

    if role == 'buyer':
        BuyerProfile.objects.create(user=user, phone_number=phone or '', location=location or '')
    else:
        FarmerProfile.objects.create(user=user, phone_number=phone or '', location=location)

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            'token': token.key,
            'user': _serialize_auth_user(user),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'detail': 'username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            'token': token.key,
            'user': _serialize_auth_user(user),
        }
    )


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    # find farmer/buyer profile
    role = _resolve_role(user)
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': role,
        'privileges': _build_privileges(role),
    }
    profile_obj = None
    try:
        fp = FarmerProfile.objects.get(user=user)
        profile_obj = fp
        data.update({'role': 'farmer', 'phone_number': fp.phone_number, 'location': fp.location, 'verified': fp.verified, 'produce_description': fp.produce_description, 'seasonality': fp.seasonality, 'rating': fp.rating, 'rating_count': Rating.objects.filter(target=user).count()})
        if fp.profile_image:
            data['profile_image'] = request.build_absolute_uri(fp.profile_image.url)
    except FarmerProfile.DoesNotExist:
        try:
            bp = BuyerProfile.objects.get(user=user)
            profile_obj = bp
            data.update({'role': 'buyer', 'phone_number': bp.phone_number, 'verified': bp.verified, 'description': bp.description, 'has_transport': bp.has_transport, 'transport_capacity': bp.transport_capacity, 'transport_unit': bp.transport_unit, 'rating': bp.rating, 'rating_count': Rating.objects.filter(target=user).count(), 'products': bp.products or []})
            if bp.profile_image:
                data['profile_image'] = request.build_absolute_uri(bp.profile_image.url)
        except BuyerProfile.DoesNotExist:
            data.update({'role': role})

    if request.method == 'PUT':
        # Support both JSON and multipart/form-data (for image upload)
        phone = request.data.get('phone_number')
        location = request.data.get('location')
        produce_description = request.data.get('produce_description')
        seasonality = request.data.get('seasonality')
        # file upload
        img = request.FILES.get('profile_image')

        if profile_obj:
            if phone is not None:
                profile_obj.phone_number = phone or profile_obj.phone_number
            if hasattr(profile_obj, 'location') and location is not None:
                profile_obj.location = location or getattr(profile_obj, 'location', '')
            # buyer-specific updates
            description = request.data.get('description')
            has_transport = request.data.get('has_transport')
            transport_capacity = request.data.get('transport_capacity')
            transport_unit = request.data.get('transport_unit')

            if hasattr(profile_obj, 'description') and description is not None:
                # server-side validation: limit description length
                if isinstance(description, str) and len(description) > 500:
                    return Response({'detail': 'description too long (max 500 chars)'}, status=400)
                profile_obj.description = description or ''

            # products: accept JSON array or stringified JSON
            products = request.data.get('products')
            if hasattr(profile_obj, 'products') and products is not None:
                try:
                    import json
                    parsed = json.loads(products) if isinstance(products, str) and products.strip() != '' else products
                except Exception:
                    parsed = products
                # validate parsed is a list
                if parsed is None:
                    profile_obj.products = []
                elif isinstance(parsed, list):
                    profile_obj.products = parsed
                else:
                    return Response({'detail': 'products must be a list'}, status=400)

            if hasattr(profile_obj, 'has_transport') and has_transport is not None:
                # Accept boolean or string
                if isinstance(has_transport, str):
                    profile_obj.has_transport = has_transport.lower() in ['1','true','yes','on']
                else:
                    profile_obj.has_transport = bool(has_transport)

            if hasattr(profile_obj, 'transport_capacity') and transport_capacity is not None:
                try:
                    # accept numeric or string
                    profile_obj.transport_capacity = float(transport_capacity) if transport_capacity != '' else None
                except Exception:
                    return Response({'detail': 'invalid transport_capacity'}, status=400)

            if hasattr(profile_obj, 'transport_unit') and transport_unit is not None:
                profile_obj.transport_unit = transport_unit or ''
            # farmer-specific fields
            if hasattr(profile_obj, 'produce_description') and produce_description is not None:
                profile_obj.produce_description = produce_description or ''
            if hasattr(profile_obj, 'seasonality') and seasonality is not None:
                # Accept JSON string or already-parsed structure
                try:
                    import json
                    parsed = json.loads(seasonality) if isinstance(seasonality, str) and seasonality.strip() != '' else seasonality
                except Exception:
                    parsed = seasonality
                profile_obj.seasonality = parsed or {}
            if img:
                profile_obj.profile_image = img
            profile_obj.save()
            return Response({'detail': 'updated'})

        return Response({'detail': 'profile not found'}, status=400)

    return Response(data)
