from datetime import timedelta
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    Booking,
    BuyerProfile,
    Crop,
    FarmerInsight,
    FarmerProfile,
    Listing,
    Market,
    PriceForecast,
    Service,
    ServiceProvider,
    StandardPrice,
)

import requests


def _resolve_role(user):
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


def _weather_payload(city="Makueni"):
    api_key = getattr(settings, "OPENWEATHER_API_KEY", None)
    if not api_key:
        return {
            "source": "generated-fallback",
            "city": city,
            "current": {"temp": 27.5, "humidity": 63, "wind_speed": 11.0, "wind": 11.0, "description": "partly cloudy"},
            "daily": [
                {
                    "date": str((timezone.now() + timedelta(days=offset)).date()),
                    "precip_mm": max(0, 8 - offset),
                    "temp": {"min": 19 + (offset % 2), "max": 30 + (offset % 3), "day": 26 + (offset % 3)},
                }
                for offset in range(7)
            ],
        }

    try:
        resp = requests.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=10,
        )
        if resp.status_code != 200:
            raise ValueError("weather endpoint error")

        data = resp.json() or {}
        grouped = {}
        for item in data.get("list", []):
            dt_txt = item.get("dt_txt")
            if not dt_txt:
                continue

            day = dt_txt.split(" ")[0]
            bucket = grouped.setdefault(
                day,
                {"min": None, "max": None, "temp_sum": 0.0, "humid": 0.0, "count": 0, "precip": 0.0, "desc": None},
            )

            main = item.get("main") or {}
            temp = main.get("temp")
            if temp is not None:
                temp_val = float(temp)
                bucket["min"] = temp_val if bucket["min"] is None else min(bucket["min"], temp_val)
                bucket["max"] = temp_val if bucket["max"] is None else max(bucket["max"], temp_val)
                bucket["temp_sum"] += temp_val

            bucket["humid"] += float(main.get("humidity") or 0.0)
            bucket["count"] += 1
            bucket["precip"] += float((item.get("rain") or {}).get("3h") or 0.0)

            weather_items = item.get("weather") or []
            if weather_items and isinstance(weather_items, list):
                bucket["desc"] = weather_items[0].get("description") or bucket["desc"]

        daily = []
        for day, vals in list(grouped.items())[:7]:
            avg_temp = vals["temp_sum"] / max(vals["count"], 1)
            daily.append(
                {
                    "date": day,
                    "precip_mm": round(vals["precip"], 2),
                    "humidity_pct": round(vals["humid"] / max(vals["count"], 1), 1),
                    "temp": {
                        "day": round(avg_temp, 1),
                        "min": round(vals["min"], 1) if vals["min"] is not None else None,
                        "max": round(vals["max"], 1) if vals["max"] is not None else None,
                    },
                    "weather": [{"description": vals["desc"]}] if vals["desc"] else [],
                }
            )

        current_resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=10,
        )
        current = {"temp": 27.0, "humidity": 60, "wind_speed": 10.0, "wind": 10.0, "description": "clear"}
        if current_resp.status_code == 200:
            cdata = current_resp.json() or {}
            current = {
                "temp": cdata.get("main", {}).get("temp"),
                "humidity": cdata.get("main", {}).get("humidity"),
                "wind_speed": cdata.get("wind", {}).get("speed"),
                "wind": cdata.get("wind", {}).get("speed"),
                "description": (cdata.get("weather") or [{}])[0].get("description"),
            }

        return {"source": "openweather", "city": city, "current": current, "daily": daily}
    except Exception:
        return {
            "source": "generated-fallback",
            "city": city,
            "current": {"temp": 27.5, "humidity": 63, "wind_speed": 11.0, "wind": 11.0, "description": "partly cloudy"},
            "daily": [
                {
                    "date": str((timezone.now() + timedelta(days=offset)).date()),
                    "precip_mm": max(0, 8 - offset),
                    "temp": {"min": 19 + (offset % 2), "max": 30 + (offset % 3), "day": 26 + (offset % 3)},
                }
                for offset in range(7)
            ],
        }


def _generated_price_predictions():
    seeded = random.Random(2026)
    crop_names = list(Crop.objects.values_list("name", flat=True)[:4]) or ["Maize", "Beans", "Tomato", "Onions"]
    market_names = list(Market.objects.values_list("name", flat=True)[:3]) or ["Wote", "Emali", "Kibwezi"]
    today = timezone.now().date()

    rows = []
    for crop_name in crop_names:
        base = seeded.randint(2500, 5800)
        for market_name in market_names:
            slope = seeded.uniform(-2.8, 4.2)
            for day in range(1, 8):
                drift = slope * day
                noise = seeded.uniform(-60, 60)
                rows.append(
                    {
                        "date": str(today + timedelta(days=day)),
                        "crop": crop_name,
                        "market": market_name,
                        "predicted_price": round(base + drift + noise, 2),
                        "confidence": round(seeded.uniform(74, 93), 1),
                        "source": "generated-model",
                    }
                )
    return rows


def _chart_series(price_rows):
    per_crop = {}
    for row in price_rows:
        crop_name = row["crop"]
        per_crop.setdefault(crop_name, []).append(row)

    series = []
    for crop_name, rows in per_crop.items():
        rows = sorted(rows, key=lambda r: r["date"])
        series.append(
            {
                "crop": crop_name,
                "points": [{"date": r["date"], "value": r["predicted_price"], "confidence": r.get("confidence", 0)} for r in rows[:12]],
            }
        )
    return series


class PlatformOverviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "platform": "Agritech",
                "modules": ["authentication", "marketplace", "messaging", "logistics", "intelligence", "climate", "administration"],
                "flows": [
                    "Users authenticate and manage profiles",
                    "Farmers list produce and buyers discover listings",
                    "Buyers and farmers negotiate via in-app chat (no payments on-platform)",
                    "After agreement, logistics requests coordinate transport providers",
                    "Agricultural intelligence provides recommendations and advisories",
                    "Climate forecasts and alerts support better decisions",
                    "Admins supervise users and system activity",
                ],
                "generated_at": timezone.now().isoformat(),
            }
        )


class PlatformAuthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        User = get_user_model()
        farmers = FarmerProfile.objects.count()
        buyers = BuyerProfile.objects.count()
        providers = ServiceProvider.objects.count()
        with_phone = FarmerProfile.objects.exclude(phone_number__isnull=True).exclude(phone_number="").count() + BuyerProfile.objects.exclude(phone_number__isnull=True).exclude(phone_number="").count()

        return Response(
            {
                "module": "authentication",
                "totals": {
                    "users": User.objects.count(),
                    "farmers": farmers,
                    "buyers": buyers,
                    "providers": providers,
                    "profile_completion_pct": round((with_phone / max(farmers + buyers, 1)) * 100, 1),
                },
                "session": {
                    "authenticated": bool(request.user and request.user.is_authenticated),
                    "username": request.user.username if request.user and request.user.is_authenticated else None,
                },
            }
        )


class PlatformMarketplaceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        recent_listings = list(
            Listing.objects.select_related("crop", "market", "owner")
            .order_by("-created_at")[:12]
            .values("id", "owner_id", "owner__username", "crop__name", "market__name", "quantity", "unit", "price", "active")
        )

        booking_counts = dict(Booking.objects.values("status").annotate(total=Count("id")).values_list("status", "total"))

        return Response(
            {
                "module": "marketplace",
                "totals": {
                    "active_listings": Listing.objects.filter(active=True).count(),
                    "providers": ServiceProvider.objects.count(),
                    "bookings_by_status": booking_counts,
                },
                "recent_listings": recent_listings,
            }
        )


class PlatformAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        weather_payload = _weather_payload(city=request.query_params.get("city", "Makueni"))

        stored = list(
            PriceForecast.objects.select_related("crop", "market")
            .order_by("-date")[:32]
            .values("date", "crop__name", "market__name", "predicted_price", "confidence")
        )
        forecasts = [
            {
                "date": str(item["date"]),
                "crop": item["crop__name"],
                "market": item["market__name"],
                "predicted_price": float(item["predicted_price"]),
                "confidence": float(item["confidence"]),
                "source": "stored-model",
            }
            for item in stored
        ]
        if not forecasts:
            forecasts = _generated_price_predictions()

        advisories = list(FarmerInsight.objects.order_by("-created_at")[:8].values("title", "content", "severity", "created_at", "source"))
        if not advisories:
            advisories = [
                {
                    "title": "Moisture conservation window",
                    "content": "Lower rainfall is projected in coming days. Prioritize mulching and staged irrigation.",
                    "severity": "medium",
                    "created_at": timezone.now().isoformat(),
                    "source": "generated-advisory",
                },
                {
                    "title": "Price timing alert",
                    "content": "A short upside movement is projected for major grains across local markets.",
                    "severity": "low",
                    "created_at": timezone.now().isoformat(),
                    "source": "generated-advisory",
                },
            ]

        avg_listing_price = Listing.objects.values("crop__name").annotate(avg_price=Avg("price")).order_by("crop__name")[:8]
        history = [{"crop": item["crop__name"] or "Unknown", "avg_price": round(float(item["avg_price"]), 2)} for item in avg_listing_price if item["avg_price"] is not None]
        if not history:
            history = [
                {"crop": "Maize", "avg_price": 5100.0},
                {"crop": "Beans", "avg_price": 4700.0},
                {"crop": "Tomato", "avg_price": 3950.0},
            ]

        # Simple climate alerts derived from the weather payload (works for both live and fallback data)
        climate_alerts = []
        try:
            daily = (weather_payload or {}).get("daily") or []
            if daily:
                today = daily[0]
                precip = float(today.get("precip_mm") or 0.0)
                hum = float(today.get("humidity_pct") or 0.0)
                tmax = None
                try:
                    tmax = today.get("temp", {}).get("max")
                except Exception:
                    tmax = None

                if precip >= 20:
                    climate_alerts.append({"type": "heavy_rain", "severity": "high", "message": "Heavy rainfall expected. Plan harvest, storage and transport accordingly."})
                elif precip >= 8:
                    climate_alerts.append({"type": "rain", "severity": "medium", "message": "Rainfall likely. Protect harvested produce and improve drainage."})
                elif precip <= 1:
                    climate_alerts.append({"type": "dry_spell", "severity": "medium", "message": "Low rainfall expected. Prioritize moisture conservation and staged irrigation."})

                if hum >= 85:
                    climate_alerts.append({"type": "high_humidity", "severity": "medium", "message": "High humidity increases spoilage risk. Improve ventilation and drying."})
                if tmax is not None and float(tmax) >= 34:
                    climate_alerts.append({"type": "heat_stress", "severity": "medium", "message": "High temperatures expected. Consider shade, mulching and early watering."})
        except Exception:
            climate_alerts = []

        # Intelligence recommendations: merge latest advisories with a few rule-based tips
        recommendations = [
            {"category": "crop_management", "message": "Monitor soil moisture and apply mulching to reduce evaporation."},
            {"category": "pest_control", "message": "Scout twice weekly for pests and apply integrated pest management (IPM) early."},
            {"category": "post_harvest", "message": "Sort and grade produce; keep it dry and cool to reduce spoilage."},
        ]

        return Response(
            {
                "module": "analytics",
                "weather": weather_payload,
                "climate_alerts": climate_alerts,
                "price_predictions": forecasts,
                "price_series": _chart_series(forecasts),
                "history": history,
                "advisories": advisories,
                "recommendations": recommendations,
            }
        )


class TransportOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = _resolve_role(request.user)
        if role not in ['farmer', 'buyer', 'admin']:
            return Response({'detail': 'Only farmers and buyers can request transport options'}, status=403)

        listing_id = request.query_params.get("listing_id")
        listing = None
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            if not request.user.is_staff and listing.owner_id != request.user.id:
                return Response({'detail': 'You can only request transport options for your own listings'}, status=403)

        # A provider may already have a transport service record even if the
        # capability flag has not been toggled on its profile yet. Use the
        # service catalog as the source of truth for requestable providers.
        transport_services = Service.objects.select_related("provider").filter(service_type="transport")
        out = []
        for service in transport_services:
            standard_price = None
            if listing and listing.market_id:
                standard_price = StandardPrice.objects.filter(service=service, market=listing.market).first()

            unit_cost = float(standard_price.price) if standard_price else 120.0
            quantity = float(listing.quantity) if listing else 1.0
            estimate = round(unit_cost * quantity, 2)

            out.append(
                {
                    "service_id": service.id,
                    "provider_id": service.provider.id,
                    "provider_name": service.provider.name,
                    "contact_phone": service.provider.contact_phone,
                    "transport_capacity": service.provider.transport_capacity,
                    "transport_unit": service.provider.transport_unit,
                    "estimated_unit_cost": unit_cost,
                    "estimated_total": estimate,
                    "market": listing.market.name if listing and listing.market else None,
                }
            )

        return Response(out)


class TransportRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Booking.objects.select_related("provider", "service", "market", "farmer", "listing", "listing__crop").filter(service__service_type="transport")

        # Scope by role:
        # - admins see all
        # - providers see requests assigned to their provider record
        # - everyone else sees their own (farmer/buyer) requests
        provider = ServiceProvider.objects.filter(user=request.user).first()
        if not request.user.is_staff:
            if provider:
                qs = qs.filter(provider=provider)
            else:
                qs = qs.filter(farmer=request.user)

        payload = [
            {
                "id": item.id,
                "provider_id": item.provider_id,
                "farmer_id": item.farmer_id,
                "farmer": item.farmer.username,
                "provider": item.provider.name,
                "service": item.service.title,
                "listing_id": item.listing_id,
                "listing_crop": item.listing.crop.name if item.listing and item.listing.crop_id else None,
                "listing_quantity": float(item.listing.quantity) if item.listing and item.listing.quantity is not None else None,
                "listing_unit": item.listing.unit if item.listing else None,
                "market": item.market.name if item.market else None,
                "scheduled_date": item.scheduled_date,
                "quantity": float(item.quantity) if item.quantity is not None else None,
                "status": item.status,
                "created_at": item.created_at,
            }
            for item in qs.order_by("-created_at")[:50]
        ]
        return Response(payload)

    def post(self, request):
        role = _resolve_role(request.user)
        if role not in ['farmer', 'buyer', 'admin']:
            return Response({'detail': 'Only farmers and buyers can create transport requests'}, status=403)

        provider_id = request.data.get("provider_id")
        service_id = request.data.get("service_id")
        listing_id = request.data.get("listing_id")
        market_id = request.data.get("market_id")
        quantity = request.data.get("quantity")
        scheduled_date = request.data.get("scheduled_date")

        if not provider_id:
            return Response({"detail": "provider_id is required"}, status=400)

        provider = get_object_or_404(ServiceProvider, id=provider_id)
        if service_id:
            service = get_object_or_404(Service, id=service_id, provider=provider)
        else:
            service = Service.objects.filter(provider=provider, service_type="transport").first()
            if not service:
                return Response({"detail": "No transport service available for selected provider"}, status=400)

        if service.service_type != "transport":
            return Response({"detail": "Selected service is not transport-enabled"}, status=400)

        listing = None
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            if not request.user.is_staff and listing.owner_id != request.user.id:
                return Response({"detail": "You can only create transport requests for your own listings"}, status=403)

        market = None
        if market_id:
            market = get_object_or_404(Market, id=market_id)
        elif listing and listing.market_id:
            market = listing.market

        booking_quantity = quantity
        if (booking_quantity is None or str(booking_quantity).strip() == "") and listing:
            booking_quantity = listing.quantity

        booking = Booking.objects.create(
            farmer=request.user,
            provider=provider,
            service=service,
            listing=listing,
            market=market,
            scheduled_date=scheduled_date or None,
            quantity=booking_quantity or None,
            status="pending",
        )

        return Response(
            {
                "id": booking.id,
                "provider": provider.name,
                "service": service.title,
                "listing_id": booking.listing_id,
                "status": booking.status,
                "scheduled_date": booking.scheduled_date,
                "quantity": booking.quantity,
            },
            status=201,
        )


class TransportRequestStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, service__service_type="transport")
        provider = ServiceProvider.objects.filter(user=request.user).first()
        is_assigned_provider = bool(provider and booking.provider_id == provider.id)
        if not request.user.is_staff and booking.farmer != request.user and not is_assigned_provider:
            return Response({"detail": "Not allowed to modify this request"}, status=403)

        new_status = request.data.get("status")
        allowed = {"pending", "accepted", "completed", "cancelled"}
        if new_status not in allowed:
            return Response({"detail": "Invalid status value"}, status=400)

        # Farmers/buyers can only cancel their own requests; providers can accept/complete assigned requests.
        if not request.user.is_staff and booking.farmer == request.user and not is_assigned_provider:
            if new_status != "cancelled":
                return Response({"detail": "Only cancellation is allowed for request owners"}, status=403)

        booking.status = new_status
        booking.save(update_fields=["status"])
        return Response({"id": booking.id, "status": booking.status})

    def delete(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, service__service_type="transport")
        if not request.user.is_staff:
            return Response({"detail": "Only admins can delete service requests"}, status=403)
        bid = booking.id
        booking.delete()
        return Response({"detail": f"Transport request {bid} deleted"})
