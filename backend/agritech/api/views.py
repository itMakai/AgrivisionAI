# api/views.py
from core.models import WeatherForecast, PriceForecast, ServiceProvider, Service, StandardPrice, Booking, FarmerInsight, Listing, Crop, Market
from rest_framework import viewsets, generics, permissions
from .serializers import CropSerializer, MarketSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import get_user_model
import requests
import os
import logging
from rest_framework.permissions import AllowAny, BasePermission

logger = logging.getLogger(__name__)
from .serializers import (
    PriceForecastSerializer, WeatherForecastSerializer,
    ServiceProviderSerializer, ServiceSerializer, StandardPriceSerializer,
    BookingSerializer, FarmerInsightSerializer
)

from .serializers import ListingSerializer
from .serializers import RatingSerializer
from core.models import Rating
from core.models import FarmerProfile, BuyerProfile


def resolve_user_role(user):
    if not user or not user.is_authenticated:
        return 'anonymous'
    if user.is_staff or user.is_superuser:
        return 'admin'
    if ServiceProvider.objects.filter(user=user).exists():
        return 'provider'
    if FarmerProfile.objects.filter(user=user).exists():
        return 'farmer'
    if BuyerProfile.objects.filter(user=user).exists():
        return 'buyer'
    return 'user'


class IsFarmerBuyerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return resolve_user_role(request.user) in ['farmer', 'buyer', 'admin']

class FarmerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        out = []
        for f in FarmerProfile.objects.select_related('user').all().order_by('user__username'):
            out.append({
                'id': f.user.id,
                'username': f.user.username,
                'phone_number': f.phone_number,
                'location': f.location,
                'profile_image': request.build_absolute_uri(f.profile_image.url) if f.profile_image else None,
                'produce_description': f.produce_description,
                'seasonality': f.seasonality or {},
                'rating': f.rating,
                'verified': f.verified,
            })
        return Response(out)


class BuyerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        out = []
        for b in BuyerProfile.objects.select_related('user').all().order_by('user__username'):
            out.append({
                'id': b.user.id,
                'username': b.user.username,
                'phone_number': b.phone_number,
                'profile_image': request.build_absolute_uri(b.profile_image.url) if b.profile_image else None,
                'description': b.description,
                'products': b.products or [],
                'has_transport': b.has_transport,
                'transport_capacity': b.transport_capacity,
                'transport_unit': b.transport_unit,
                'rating': b.rating,
                'verified': b.verified,
            })
        return Response(out)


class ProfileDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=404)

        # try farmer then buyer
        try:
            f = FarmerProfile.objects.get(user=user)
            data = {
                'id': user.id,
                'username': user.username,
                'role': 'farmer',
                'phone_number': f.phone_number,
                'profile_image': request.build_absolute_uri(f.profile_image.url) if f.profile_image else None,
                'produce_description': f.produce_description,
                'seasonality': f.seasonality or {},
                'location': f.location,
                'rating': f.rating,
                'verified': f.verified,
            }
            return Response(data)
        except FarmerProfile.DoesNotExist:
            pass

        try:
            b = BuyerProfile.objects.get(user=user)
            data = {
                'id': user.id,
                'username': user.username,
                'role': 'buyer',
                'phone_number': b.phone_number,
                'profile_image': request.build_absolute_uri(b.profile_image.url) if b.profile_image else None,
                'description': b.description,
                'products': b.products or [],
                'has_transport': b.has_transport,
                'transport_capacity': b.transport_capacity,
                'transport_unit': b.transport_unit,
                'rating': b.rating,
                'verified': b.verified,
            }
            return Response(data)
        except BuyerProfile.DoesNotExist:
            pass

        # fallback: return basic user info
        return Response({'id': user.id, 'username': user.username, 'role': 'unknown'})


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        return obj.owner_id == request.user.id


class PriceForecastViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PriceForecast.objects.all().order_by('-date')
    serializer_class = PriceForecastSerializer
    filterset_fields = ['crop__name', 'market__name']


class WeatherForecastViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WeatherForecast.objects.all().order_by('date')
    serializer_class = WeatherForecastSerializer


class ServiceProviderViewSet(viewsets.ModelViewSet):
    queryset = ServiceProvider.objects.all().order_by('name')
    serializer_class = ServiceProviderSerializer

    def get_permissions(self):
        # Allow anyone to read; require admin for create/update/delete
        from rest_framework.permissions import IsAdminUser
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.AllowAny()]


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.all().order_by('title')
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]


class StandardPriceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StandardPrice.objects.all().order_by('-updated_at')
    serializer_class = StandardPriceSerializer
    permission_classes = [permissions.AllowAny]


class BookingCreateAPIView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsFarmerBuyerOrAdmin]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)


class FarmerInsightsListView(generics.ListAPIView):
    serializer_class = FarmerInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FarmerInsight.objects.filter(user=self.request.user).order_by('-created_at')


class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().order_by('-created_at')
    serializer_class = ListingSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsFarmerBuyerOrAdmin()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        # Accept crop by id (crop_id) or name (crop). Same for market.
        data = self.request.data.copy()
        # resolve crop
        crop_obj = None
        if data.get('crop_id'):
            try:
                crop_obj = Crop.objects.get(id=data.get('crop_id'))
            except Crop.DoesNotExist:
                crop_obj = None
        elif data.get('crop'):
            # try numeric id
            try:
                crop_obj = Crop.objects.get(id=int(data.get('crop')))
            except Exception:
                crop_obj = Crop.objects.filter(name__iexact=data.get('crop')).first()

        market_obj = None
        if data.get('market_id'):
            try:
                market_obj = Market.objects.get(id=data.get('market_id'))
            except Market.DoesNotExist:
                market_obj = None
        elif data.get('market'):
            try:
                market_obj = Market.objects.get(id=int(data.get('market')))
            except Exception:
                market_obj = Market.objects.filter(name__iexact=data.get('market')).first()

        # prepare kwargs for serializer
        save_kwargs = {'owner': self.request.user}
        if crop_obj:
            save_kwargs['crop'] = crop_obj
        if market_obj is not None:
            save_kwargs['market'] = market_obj

        serializer.save(**save_kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional filters:
        # - owner=me (requires auth)
        # - active=true|false
        # - crop=<name or id>
        # - market=<name or id>
        # - q=<search term> (crop/market/owner)
        # optional filter by owner
        owner = self.request.query_params.get('owner')
        if owner == 'me' and self.request.user.is_authenticated:
            qs = qs.filter(owner=self.request.user)

        active = self.request.query_params.get("active")
        if active is not None and str(active).strip() != "":
            if str(active).lower() in ["1", "true", "yes", "on"]:
                qs = qs.filter(active=True)
            elif str(active).lower() in ["0", "false", "no", "off"]:
                qs = qs.filter(active=False)

        crop = self.request.query_params.get("crop")
        if crop:
            try:
                qs = qs.filter(crop_id=int(crop))
            except Exception:
                qs = qs.filter(crop__name__icontains=crop)

        market = self.request.query_params.get("market")
        if market:
            try:
                qs = qs.filter(market_id=int(market))
            except Exception:
                qs = qs.filter(market__name__icontains=market)

        q = self.request.query_params.get("q")
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(crop__name__icontains=q)
                | Q(market__name__icontains=q)
                | Q(owner__username__icontains=q)
            )
        return qs


class CropViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Crop.objects.all().order_by('name')
    permission_classes = [permissions.AllowAny]
    serializer_class = CropSerializer


class RatingViewSet(viewsets.ModelViewSet):
    """Simple rating API. POST to create a rating (authenticated), GET to list ratings.

    Query params:
    - target: optional user id to filter ratings for a specific user
    """
    queryset = Rating.objects.all().order_by('-created_at')
    serializer_class = RatingSerializer

    def get_permissions(self):
        if self.action in ['create', 'partial_update', 'update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        target = self.request.query_params.get('target')
        if target:
            try:
                t = int(target)
                qs = qs.filter(target__id=t)
            except Exception:
                pass
        return qs


class MarketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Market.objects.all().order_by('name')
    permission_classes = [permissions.AllowAny]
    serializer_class = MarketSerializer


class RealTimeWeatherView(APIView):
    """Proxy to OpenWeather API to provide simple daily aggregates for the frontend.

    Query params:
    - city: optional city name (defaults to Nairobi)
    - lat, lon: optional coordinates (if provided they take precedence)
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        api_key = os.environ.get('OPENWEATHER_API_KEY') or getattr(settings, 'OPENWEATHER_API_KEY', None)
        if not api_key:
            return Response({'error': 'OpenWeather API key not configured.'}, status=500)

        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        city = request.query_params.get('city', 'Nairobi')

        try:
            if lat and lon:
                # call One Call API (historically) - fall back to current + forecast endpoints
                params = {'lat': lat, 'lon': lon, 'appid': api_key, 'units': 'metric'}
                # use 'forecast' for multi-step data
                resp = requests.get('https://api.openweathermap.org/data/2.5/forecast', params={**params})
            else:
                params = {'q': city, 'appid': api_key, 'units': 'metric'}
                # get current + 5-day forecast
                resp = requests.get('https://api.openweathermap.org/data/2.5/forecast', params=params)

            if resp.status_code != 200:
                logger.warning('OpenWeather forecast request failed: %s %s', resp.status_code, resp.text)
                # fall back to empty dataset instead of returning 502 to the client
                data = {'list': []}
            else:
                data = resp.json()
            # group forecast list (3-hourly) by date and compute precipitation sum and average humidity
            daily = {}
            for item in data.get('list', []):
                dt_txt = item.get('dt_txt')  # e.g., '2025-11-15 12:00:00'
                if not dt_txt:
                    continue
                date = dt_txt.split(' ')[0]
                # Initialize per-day aggregation with temperature and description fields
                entry = daily.setdefault(date, {
                    'precip_mm': 0.0,
                    'hum_sum': 0.0,
                    'count': 0,
                    'temp_sum': 0.0,
                    'min_temp': None,
                    'max_temp': None,
                    'last_desc': None,
                })

                # precipitation may be under 'rain' or 'snow' with '3h'
                precip = 0.0
                rain = item.get('rain') or {}
                if isinstance(rain, dict):
                    precip += float(rain.get('3h', 0.0) or 0.0)
                snow = item.get('snow') or {}
                if isinstance(snow, dict):
                    precip += float(snow.get('3h', 0.0) or 0.0)
                entry['precip_mm'] += precip

                main = item.get('main') or {}
                hum = float(main.get('humidity') or 0.0)
                entry['hum_sum'] += hum
                # temperature aggregation
                try:
                    temp_val = float(main.get('temp')) if main.get('temp') is not None else None
                except Exception:
                    temp_val = None
                if temp_val is not None:
                    entry['temp_sum'] += temp_val
                    if entry['min_temp'] is None or temp_val < entry['min_temp']:
                        entry['min_temp'] = temp_val
                    if entry['max_temp'] is None or temp_val > entry['max_temp']:
                        entry['max_temp'] = temp_val

                # capture a description (latest available in the day's 3-hour blocks)
                try:
                    w = item.get('weather') or []
                    if isinstance(w, list) and len(w) > 0:
                        entry['last_desc'] = w[0].get('description') or entry.get('last_desc')
                except Exception:
                    pass

                entry['count'] += 1

            # Build a list for the next 7 days (or available)
            out_days = []
            for d, vals in list(daily.items())[:7]:
                avg_hum = vals['hum_sum'] / max(1, vals['count'])
                # compute average temp and include min/max where available
                avg_temp = None
                if vals.get('count') and vals.get('temp_sum') is not None and vals.get('temp_sum') != 0:
                    try:
                        avg_temp = vals['temp_sum'] / max(1, vals['count'])
                    except Exception:
                        avg_temp = None

                day_obj = {'date': d, 'precip_mm': round(vals['precip_mm'], 2), 'humidity_pct': round(avg_hum, 1)}
                if avg_temp is not None:
                    day_obj['temp'] = {
                        'day': round(avg_temp, 1),
                        'min': round(vals['min_temp'], 1) if vals.get('min_temp') is not None else None,
                        'max': round(vals['max_temp'], 1) if vals.get('max_temp') is not None else None,
                    }
                # include a description if we captured one
                if vals.get('last_desc'):
                    day_obj['weather'] = [{ 'description': vals.get('last_desc') }]
                out_days.append(day_obj)

            # also include current weather via separate endpoint
            current = None
            try:
                if lat and lon:
                    curr_params = {'lat': lat, 'lon': lon, 'appid': api_key, 'units': 'metric'}
                else:
                    curr_params = {'q': city, 'appid': api_key, 'units': 'metric'}
                curr_resp = requests.get('https://api.openweathermap.org/data/2.5/weather', params=curr_params)
                if curr_resp.status_code == 200:
                    cdata = curr_resp.json()
                    current = {
                        'temp': cdata.get('main', {}).get('temp'),
                        'humidity': cdata.get('main', {}).get('humidity'),
                        'wind_speed': cdata.get('wind', {}).get('speed'),
                        'description': cdata.get('weather', [{}])[0].get('description')
                    }
                else:
                    logger.warning('OpenWeather current request failed: %s %s', curr_resp.status_code, curr_resp.text)
            except Exception as e:
                logger.exception('Error fetching OpenWeather current weather: %s', e)

            return Response({'current': current, 'daily': out_days, 'source': 'openweather'})
        except Exception as e:
            return Response({'error': 'Failed to fetch OpenWeather data', 'details': str(e)}, status=500)
