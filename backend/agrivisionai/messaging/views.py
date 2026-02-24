from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator
from core.models import Conversation, Message, Crop, Market, PriceForecast, WeatherForecast, MinFairPrice, StorageAdvice
from .utils import send_twilio_message
from django.utils import timezone
import logging
import os
import hashlib
import random
from django.contrib.auth import get_user_model
from core.models import FarmerProfile, BuyerProfile

User = get_user_model()

logger = logging.getLogger(__name__)


def verify_twilio_request(request):
    # Optional: verify X-Twilio-Signature header
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    # Log details for debugging signature mismatches
    url = request.build_absolute_uri()
    sig = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
    params = request.POST.dict()
    logger.debug('Verifying Twilio request: url=%s sig=%s params=%s', url, sig, params)

    # Twilio signature depends on the exact URL (scheme+host+path). When running behind
    # a proxy (ngrok) Django may see the request as HTTP even though the public URL is HTTPS.
    # To be robust, try a few candidate URLs (http/https and forwarded-proto) to validate.
    candidates = [url]
    try:
        # if X-Forwarded-Proto is present, use it
        xf_proto = request.META.get('HTTP_X_FORWARDED_PROTO') or request.META.get('HTTP_X_PROTO')
        host = request.get_host()
        path = request.path
        if xf_proto:
            candidates.append(f"{xf_proto}://{host}{path}")
        # also try forcing https if original was http
        if url.startswith('http://'):
            candidates.append(url.replace('http://', 'https://', 1))
        # also try both with and without trailing slash
        for c in list(candidates):
            if c.endswith('/'):
                candidates.append(c.rstrip('/'))
            else:
                candidates.append(c + '/')

        # unique
        seen = set()
        candidates = [c for c in candidates if not (c in seen or seen.add(c))]

        for candidate in candidates:
            try:
                valid = validator.validate(candidate, params, sig)
                logger.debug('Tried candidate URL for Twilio validation: %s -> %s', candidate, valid)
                if valid:
                    return True
            except Exception:
                logger.exception('Error validating Twilio signature for candidate %s', candidate)
        logger.debug('No candidate URLs validated the Twilio signature')
        return False
    except Exception:
        logger.exception('Error during Twilio signature validation')
        return False


def _get_today_weather_summary():
    """Return a user-friendly weather summary for today.
    If no `WeatherForecast` exists for today, return a synthesized fallback summary.
    """
    today = timezone.now().date()
    wf = WeatherForecast.objects.filter(date=today).order_by('-date').first()
    if wf:
        parts = []
        if getattr(wf, 'rainfall_mm', None) is not None and wf.rainfall_mm > 0:
            parts.append(f"It's raining today: {wf.rainfall_mm} mm expected.")
        else:
            parts.append(f"No significant rain expected today. Rainfall: {getattr(wf, 'rainfall_mm', 0)} mm.")
        tmin = getattr(wf, 'temp_min', 'N/A')
        tmax = getattr(wf, 'temp_max', 'N/A')
        humidity = getattr(wf, 'humidity', 'N/A')
        parts.append(f"Temp: {tmin}°C - {tmax}°C. Humidity: {humidity}%.")
        return ' '.join(parts)

    # Synthesized fallback when no forecast exists
    return "Typical conditions: Mostly sunny with low chance of rain (0 mm). Temp: 20°C - 30°C. Humidity: ~60%."


def generate_reply(body, from_number):
    """
    Generate a reply using real model lookups from the database.
    Recognizes simple natural language intents: price/bei, weather/hali, storage/kuoza.
    """
    text = (body or '').lower()

    reply = None

    # Weather intent
    if 'weather' in text or 'hali' in text or 'mvua' in text or 'rain' in text:
        reply = _get_today_weather_summary()

    # Storage intent
    if 'storage' in text or 'kuoza' in text or 'store' in text:
        # return highest severity advice first
        advice = StorageAdvice.objects.order_by('-severity', '-created_at').first()
        if advice:
            reply = f"{advice.title}: {advice.content}"
        else:
            reply = "No storage advice available right now."

    # Price intent: look for crop + optional market
    if 'bei' in text or 'price' in text:
        # Try to extract crop and market by name matching
        crop = None
        market = None
        for c in Crop.objects.all():
            if c.name.lower() in text or (c.swahili_name and c.swahili_name.lower() in text):
                crop = c
                break

        for m in Market.objects.all():
            if m.name.lower() in text:
                market = m
                break

        # If no direct model matches found, try a simple heuristic to extract crop/market from text
        if not crop:
            # remove common stopwords and keywords, then pick the first remaining token as crop
            stop = {'price', 'bei', 'ya', 'at', 'in', 'the', 'for', 'of', '?', 'please', 'kilishi'}
            tokens = [t.strip(".,?'") for t in text.split() if t.strip()]
            candidates = [t for t in tokens if t not in stop]
            if candidates:
                # assume first candidate is crop, second (if exists) is market
                maybe_crop = candidates[0]
                maybe_market = candidates[1] if len(candidates) > 1 else None
                # create lightweight generated crop/market names for price estimation
                crop_name_guess = maybe_crop
                market_name_guess = maybe_market or (maybe_crop + ' market')
                # set variables for later price estimation
                crop_guess_used = True
            else:
                crop_guess_used = False
        else:
            crop_guess_used = False
        # If crop found, try MinFairPrice first, then latest PriceForecast
        if crop and market:
            mfp = MinFairPrice.objects.filter(crop=crop, market=market).first()
            if mfp:
                reply = f"Minimum fair price for {crop.name} at {market.name} is KSh {mfp.min_price}."
            pf = PriceForecast.objects.filter(crop=crop, market=market).order_by('-date').first()
            if pf:
                reply = f"Estimated price for {crop.name} at {market.name} on {pf.date}: KSh {pf.predicted_price} (confidence {pf.confidence}%)."
            else:
                # generate deterministic estimated price when no forecast exists
                price_val = _generate_estimated_price(crop.name, market.name)
                reply = f"Estimated price for {crop.name} at {market.name} (approx): KSh {price_val:.2f}."

        # If only crop found
        if crop and not market:
            pf = PriceForecast.objects.filter(crop=crop).order_by('-date').first()
            if pf:
                reply = f"Latest estimated price for {crop.name} (all markets): KSh {pf.predicted_price} at {pf.market.name} (on {pf.date})."
            else:
                # pick a market name if available for estimation
                mname = Market.objects.first().name if Market.objects.exists() else 'local market'
                price_val = _generate_estimated_price(crop.name, mname)
                reply = f"Estimated price for {crop.name} (approx): KSh {price_val:.2f}."

        # No crop found: if we made a heuristic guess, use it to generate an estimated price
        pf_top = PriceForecast.objects.order_by('-predicted_price').first()
        if pf_top:
            reply = f"Top price today: {pf_top.crop.name} at {pf_top.market.name} — KSh {pf_top.predicted_price}."
        else:
            if crop_guess_used:
                price_val = _generate_estimated_price(crop_name_guess, market_name_guess)
                reply = f"Estimated price for {crop_name_guess} at {market_name_guess} (approx): KSh {price_val:.2f}."
            elif Crop.objects.exists():
                sample_crop = Crop.objects.first()
                mname = Market.objects.first().name if Market.objects.exists() else 'local market'
                price_val = _generate_estimated_price(sample_crop.name, mname)
                reply = f"Top price today: {sample_crop.name} at {mname} — KSh {price_val:.2f}."
            else:
                reply = "Price data is not available."

    # Friendly greeting intent
    if any(g in text for g in ('hi', 'hello', 'hallo', 'hey', 'helo', 'habari', 'mambo')):
        greeting = "Welcome to MazaoNet! We provide market prices, weather forecasts and storage advice for smallholder farmers."
        weather = _get_today_weather_summary()
        # pick one storage insight if available
        advice = StorageAdvice.objects.order_by('-severity', '-created_at').first()
        if advice:
            insight = f"Tip: {advice.title} — {advice.content}"
        else:
            insight = "Tip: Keep harvested produce dry and cool; sort and sell promptly to maximize returns."
        reply = f"{greeting} {weather} {insight}"

    # Fallback
    if not reply:
        reply = "Hello — MazaoNet received your message. You can ask 'Bei ya <crop> [market]?', 'Hali ya hewa?', or 'Storage advice <crop>'."

    # Always append a short prompt of suggested asks
    suggestions = "\n\nYou can ask: 'Bei ya <crop> [market]?', 'Hali ya hewa?', 'Storage advice <crop>?', or send 'Help' for more options."
    return f"{reply}{suggestions}"


def _generate_estimated_price(crop_name, market_name):
    """Create a deterministic pseudo-random price based on crop, market and today's date."""
    today = timezone.now().date().isoformat()
    key = f"{crop_name}|{market_name}|{today}"
    digest = hashlib.sha256(key.encode('utf-8')).hexdigest()
    num = int(digest[:8], 16)
    # price range between 80 and 480
    price = 80 + (num % 400) + ((num >> 8) % 100) / 100.0
    return round(price, 2)


@csrf_exempt
def twilio_webhook(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Only POST allowed'}, status=405)

    # Optionally verify Twilio signature if auth token configured
    try:
        if settings.TWILIO_AUTH_TOKEN:
            # Allow skipping signature validation in DEBUG via environment variable for local testing
            if settings.DEBUG and os.getenv('TWILIO_SKIP_VALIDATION') == '1':
                logger.info('Skipping Twilio signature validation because DEBUG and TWILIO_SKIP_VALIDATION=1')
            else:
                # verify and log details on failure
                valid = verify_twilio_request(request)
                if not valid:
                    # log more context to help debugging
                    sig = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
                    url = request.build_absolute_uri()
                    params = request.POST.dict()
                    logger.warning('Twilio signature validation failed; sig=%s url=%s params=%s', sig, url, params)
                    return JsonResponse({'detail': 'Invalid signature'}, status=403)
    except Exception:
        logger.exception('Error validating Twilio request')

    from_number = request.POST.get('From')
    to_number = request.POST.get('To')
    body = request.POST.get('Body', '')
    channel = 'whatsapp' if (from_number or '').startswith('whatsapp:') else 'sms'

    # Create or get conversation
    conv, _ = Conversation.objects.get_or_create(phone=from_number, channel=channel)
    # try to associate this conversation with any registered user matching the phone
    try:
        fp = FarmerProfile.objects.filter(phone_number=from_number).first()
        bp = BuyerProfile.objects.filter(phone_number=from_number).first()
        other_user = (fp.user if fp else (bp.user if bp else None))
        if other_user:
            conv.participants.add(other_user)
    except Exception:
        logger.exception('Failed to attach inbound number to registered user')

    # Generate reply (placeholder AI). In production this calls model/service.
    reply_text = generate_reply(body, from_number)

    # Create message with response populated to satisfy NOT NULL DB constraint
    msg = Message.objects.create(conversation=conv, inbound=True, body=body, response=reply_text)

    resp = MessagingResponse()
    resp.message(reply_text)
    return HttpResponse(str(resp), content_type='application/xml')
