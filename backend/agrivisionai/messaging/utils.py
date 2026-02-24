from django.conf import settings
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)


def send_twilio_message(to, body):
    """Send SMS or WhatsApp message using Twilio REST API.

    `to` can be a plain phone number (e.g. +2547...) or 'whatsapp:+...' for WhatsApp.
    """
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_whatsapp = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', None)
    from_phone = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

    if not sid or not token:
        logger.warning('Twilio credentials not configured; skipping send.')
        return None

    client = Client(sid, token)

    if (to or '').startswith('whatsapp:'):
        from_number = from_whatsapp or f'whatsapp:{from_phone}'
    else:
        from_number = from_phone

    try:
        msg = client.messages.create(body=body, from_=from_number, to=to)
        logger.info('Sent Twilio message SID=%s to=%s', msg.sid, to)
        return msg.sid
    except Exception:
        logger.exception('Error sending Twilio message')
        return None
