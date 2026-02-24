from django.db import models
from django.conf import settings

class Crop(models.Model):
    name = models.CharField(max_length=50)  # Maize, Mangoes, Beans
    swahili_name = models.CharField(max_length=50)

class Market(models.Model):
    name = models.CharField(max_length=100)  # Wote, Kibwezi, Emali
    county = models.CharField(max_length=50, default="Makueni")

class PriceForecast(models.Model):
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    market = models.ForeignKey(Market, on_delete=models.CASCADE)
    date = models.DateField()
    predicted_price = models.DecimalField(max_digits=8, decimal_places=2)
    confidence = models.FloatField()  # 0-100%
    created_at = models.DateTimeField(auto_now_add=True)

class WeatherForecast(models.Model):
    date = models.DateField()
    temp_max = models.FloatField()
    temp_min = models.FloatField()
    humidity = models.FloatField()
    rainfall_mm = models.FloatField()
    drought_risk = models.CharField(max_length=20)  # Low, Moderate, High, Severe


class FarmerProfile(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    verified = models.BooleanField(default=False)
    location = models.CharField(max_length=150, blank=True)
    rating = models.FloatField(default=0.0)
    produce_description = models.TextField(blank=True, null=True, help_text='Short description of the farmer\'s produce')
    seasonality = models.JSONField(blank=True, null=True, default=dict, help_text='JSON map of month->availability')

    def __str__(self):
        return f"Farmer: {self.user.username}"


class BuyerProfile(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    verified = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0)
    # List of product requests the buyer is looking for. Each item is an object like:
    # {"name": "Maize", "quantity": 1000, "unit": "kg", "price_per_kg": 45}
    products = models.JSONField(blank=True, null=True, default=list, help_text='List of product requests (JSON)')
    # buyer-specific fields
    description = models.TextField(blank=True, null=True, help_text='Short description of buyer needs')
    has_transport = models.BooleanField(default=False, help_text='Does the buyer have means of transport?')
    transport_capacity = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Transport capacity in chosen unit')
    transport_unit = models.CharField(max_length=20, default='kg', blank=True)
    location = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"Buyer: {self.user.username}"


class Rating(models.Model):
    rater = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='given_ratings')
    target = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='received_ratings')
    score = models.PositiveSmallIntegerField()  # 1-5
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class MinFairPrice(models.Model):
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    market = models.ForeignKey(Market, on_delete=models.CASCADE)
    min_price = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('crop', 'market')


class StorageAdvice(models.Model):
    # permaculture-based storage advice
    title = models.CharField(max_length=200)
    content = models.TextField(help_text='Advice text, e.g., "Use neem + ventilate"')
    severity = models.CharField(max_length=20, choices=[('low','Low'),('medium','Medium'),('high','High')], default='medium')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Conversation(models.Model):
    # Tracks WhatsApp/SMS conversations
    phone = models.CharField(max_length=30)
    channel = models.CharField(max_length=20, choices=[('sms','SMS'),('whatsapp','WhatsApp'),('internal','Internal')])
    created_at = models.DateTimeField(auto_now_add=True)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='conversations')


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    # Optional platform user sender for internal chat
    sender = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    inbound = models.BooleanField(default=True)
    body = models.TextField()
    response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ServiceProvider(models.Model):
    # Individual or company offering services (storage, transport)
    name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    verified = models.BooleanField(default=False)
    # New capability flags and capacities
    offers_transport = models.BooleanField(default=False)
    transport_capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transport_unit = models.CharField(max_length=20, blank=True, default='kg')
    offers_cold_storage = models.BooleanField(default=False)
    cold_storage_capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cold_storage_unit = models.CharField(max_length=20, blank=True, default='tonne')

    def __str__(self):
        return self.name


class Service(models.Model):
    SERVICE_TYPES = [('storage', 'Storage'), ('transport', 'Transport'), ('other', 'Other')]
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES, default='storage')
    unit = models.CharField(max_length=50, default='per tonne')

    def __str__(self):
        return f"{self.title} — {self.provider.name}"


class StandardPrice(models.Model):
    # Standardized price for a service in a market/area
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='standard_prices')
    market = models.ForeignKey(Market, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='KSh')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('service', 'market')

    def __str__(self):
        return f"{self.service.title} @ {self.market.name}: {self.price} {self.currency}"


class Booking(models.Model):
    STATUS = [('pending', 'Pending'), ('accepted', 'Accepted'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    farmer = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    market = models.ForeignKey(Market, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking {self.id} {self.service.title} for {self.farmer.username}"


class FarmerInsight(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='insights')
    title = models.CharField(max_length=200)
    content = models.TextField()
    severity = models.CharField(max_length=20, choices=[('low','Low'),('medium','Medium'),('high','High')], default='low')
    source = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Insight for {self.user.username}: {self.title}"


class Listing(models.Model):
    """Marketplace listing for crops offered by farmers or buyers wanting to buy."""
    owner = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='listings')
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=30, default='kg')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    market = models.ForeignKey(Market, on_delete=models.SET_NULL, null=True, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Listing {self.id} {self.crop.name} by {self.owner.username} - {self.quantity}{self.unit} @ {self.price}"
