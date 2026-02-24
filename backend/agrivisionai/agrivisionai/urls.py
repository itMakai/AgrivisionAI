# agrivisionai/urls.py
from django.urls import include, path
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from api import views
from api import platform_views
from messaging import views as messaging_views
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'prices', views.PriceForecastViewSet)
router.register(r'weather', views.WeatherForecastViewSet)
router.register(r'providers', views.ServiceProviderViewSet)
router.register(r'services', views.ServiceViewSet)
router.register(r'standard-prices', views.StandardPriceViewSet)
router.register(r'listings', views.ListingViewSet)
router.register(r'crops', views.CropViewSet)
router.register(r'markets', views.MarketViewSet)
router.register(r'ratings', views.RatingViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/platform/overview/', platform_views.PlatformOverviewView.as_view()),
    path('api/platform/auth/', platform_views.PlatformAuthView.as_view()),
    path('api/platform/marketplace/', platform_views.PlatformMarketplaceView.as_view()),
    path('api/platform/analytics/', platform_views.PlatformAnalyticsView.as_view()),
    path('api/platform/transport/options/', platform_views.TransportOptionsView.as_view()),
    path('api/platform/transport/requests/', platform_views.TransportRequestsView.as_view()),
    path('api/platform/transport/requests/<int:booking_id>/status/', platform_views.TransportRequestStatusView.as_view()),
    # register explicit API routes first so they are not captured by the generic router include
    path('api/weather/realtime/', views.RealTimeWeatherView.as_view()),
    path('api/farmers/', views.FarmerListView.as_view()),
    path('api/buyers/', views.BuyerListView.as_view()),
    path('api/profiles/<str:username>/', views.ProfileDetailView.as_view()),
    # compatibility endpoints for Twilio sandbox or custom webhook URLs that post to /whatsapp
    # map both '/whatsapp/' (with trailing slash) and '/whatsapp' (without) to the messaging webhook
    # This prevents Django's APPEND_SLASH redirect from failing on POST requests coming from external services.
    path('whatsapp/', messaging_views.twilio_webhook, name='twilio-whatsapp-root'),
    path('whatsapp', messaging_views.twilio_webhook, name='twilio-whatsapp-root-no-slash'),
    path('api/messaging/', include('messaging.urls')),
    path('api/auth/', include('api.auth_urls')),
    path('api/bookings/', views.BookingCreateAPIView.as_view()),
    path('api/insights/', views.FarmerInsightsListView.as_view()),
    # catch-all router (registers prices, weather, providers, services, etc.)
    path('api/', include(router.urls)),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)