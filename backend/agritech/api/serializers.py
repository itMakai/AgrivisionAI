from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import PriceForecast, WeatherForecast, ServiceProvider, Service, StandardPrice, Booking, FarmerInsight, Crop, Market, Rating
from core.models import Listing
from core.models import Crop as CropModel, Market as MarketModel


class PriceForecastSerializer(serializers.ModelSerializer):
    crop = serializers.CharField(source='crop.name')
    market = serializers.CharField(source='market.name')

    class Meta:
        model = PriceForecast
        fields = ['id', 'crop', 'market', 'date', 'predicted_price', 'confidence']


class WeatherForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherForecast
        fields = ['id', 'date', 'temp_max', 'temp_min', 'humidity', 'rainfall_mm', 'drought_risk']


class ServiceMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'title', 'description', 'service_type', 'unit']


class ServiceProviderMiniSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True, allow_null=True)

    class Meta:
        model = ServiceProvider
        fields = [
            'id', 'user_id', 'name', 'contact_name', 'contact_phone', 'email', 'address', 'verified',
            'offers_transport', 'transport_capacity', 'transport_unit',
            'offers_cold_storage', 'cold_storage_capacity', 'cold_storage_unit',
        ]


class ServiceProviderSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True, allow_null=True)
    services = ServiceMiniSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceProvider
        fields = [
            'id', 'user_id', 'name', 'contact_name', 'contact_phone', 'email', 'address', 'verified',
            'offers_transport', 'transport_capacity', 'transport_unit',
            'offers_cold_storage', 'cold_storage_capacity', 'cold_storage_unit',
            'services',
        ]


class ServiceSerializer(serializers.ModelSerializer):
    provider = ServiceProviderMiniSerializer(read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'provider', 'title', 'description', 'service_type', 'unit']


class StandardPriceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    market = serializers.CharField(source='market.name')

    class Meta:
        model = StandardPrice
        fields = ['id', 'service', 'market', 'price', 'currency', 'updated_at']


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'farmer', 'provider', 'service', 'listing', 'market', 'scheduled_date', 'quantity', 'status', 'created_at']
        read_only_fields = ['farmer', 'status', 'created_at']


class FarmerInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerInsight
        fields = ['id', 'title', 'content', 'severity', 'source', 'metadata', 'created_at', 'read']


class ListingSerializer(serializers.ModelSerializer):
    crop = serializers.CharField(source='crop.name', read_only=True)
    market = serializers.CharField(source='market.name', allow_null=True, read_only=True)
    owner = serializers.CharField(source='owner.username', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    # write fields
    crop_id = serializers.PrimaryKeyRelatedField(queryset=Crop.objects.all(), source='crop', write_only=True, required=False)
    market_id = serializers.PrimaryKeyRelatedField(queryset=Market.objects.all(), source='market', write_only=True, allow_null=True, required=False)
    owner_description = serializers.SerializerMethodField(read_only=True)
    owner_has_transport = serializers.SerializerMethodField(read_only=True)
    owner_transport_capacity = serializers.SerializerMethodField(read_only=True)
    owner_transport_unit = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'owner', 'owner_id', 'owner_description', 'owner_has_transport', 'owner_transport_capacity', 'owner_transport_unit',
            'crop', 'crop_id', 'quantity', 'unit', 'price', 'market', 'market_id', 'contact_phone', 'active', 'created_at'
        ]
        read_only_fields = ['owner', 'created_at']

    def get_owner_description(self, obj):
        try:
            bp = obj.owner.buyerprofile
            return bp.description
        except Exception:
            return None

    def validate(self, attrs):
        """Resolve crop and market from names or ids when creating/updating listings.

        This ensures `crop` is provided (required by the model) even if the client
        sent a `crop` name string instead of a `crop_id`.
        """
        data = self.initial_data or {}

        # Resolve crop: accept 'crop_id' (pk) or 'crop' (name or id)
        if 'crop' not in attrs:
            crop_val = data.get('crop') or data.get('crop_id')
            crop_obj = None
            if crop_val is not None:
                try:
                    crop_obj = Crop.objects.get(id=int(crop_val))
                except Exception:
                    crop_obj = Crop.objects.filter(name__iexact=str(crop_val)).first()

            if not crop_obj:
                raise serializers.ValidationError({'crop': 'Crop not found. Create the crop first or provide a valid crop_id.'})

            attrs['crop'] = crop_obj

        # Resolve market if provided by name/id
        if 'market' not in attrs and (data.get('market') or data.get('market_id')):
            market_val = data.get('market') or data.get('market_id')
            market_obj = None
            try:
                market_obj = Market.objects.get(id=int(market_val))
            except Exception:
                market_obj = Market.objects.filter(name__iexact=str(market_val)).first()
            if market_obj:
                attrs['market'] = market_obj

        return attrs

    def get_owner_has_transport(self, obj):
        try:
            bp = obj.owner.buyerprofile
            return bp.has_transport
        except Exception:
            return False

    def get_owner_transport_capacity(self, obj):
        try:
            bp = obj.owner.buyerprofile
            return bp.transport_capacity
        except Exception:
            return None

    def get_owner_transport_unit(self, obj):
        try:
            bp = obj.owner.buyerprofile
            return bp.transport_unit
        except Exception:
            return None


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropModel
        fields = ['id', 'name', 'swahili_name']


class MarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketModel
        fields = ['id', 'name', 'county']


class RatingSerializer(serializers.ModelSerializer):
    rater = serializers.CharField(source='rater.username', read_only=True)
    target = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())

    class Meta:
        model = Rating
        fields = ['id', 'rater', 'target', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'rater', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            validated_data['rater'] = user
        return super().create(validated_data)
 
