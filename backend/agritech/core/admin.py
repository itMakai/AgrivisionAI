from django.contrib import admin
from .models import (
	Crop, Market, PriceForecast, WeatherForecast,
	FarmerProfile, BuyerProfile, Rating, MinFairPrice, StorageAdvice,
	Conversation, Message,
	ServiceProvider, Service, StandardPrice, Booking, FarmerInsight, Listing
)

# Register existing models
admin.site.register(Crop)
admin.site.register(Market)
admin.site.register(PriceForecast)
admin.site.register(WeatherForecast)

admin.site.register(FarmerProfile)
admin.site.register(BuyerProfile)
# Rating, MinFairPrice, StorageAdvice, Conversation and Message are registered in messaging.admin
# to avoid duplicate registration we don't re-register them here.

# Register new marketplace & insights models
admin.site.register(ServiceProvider)
admin.site.register(Service)
admin.site.register(StandardPrice)
admin.site.register(Booking)
admin.site.register(FarmerInsight)
admin.site.register(Listing)
