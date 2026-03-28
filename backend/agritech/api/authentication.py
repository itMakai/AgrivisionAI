from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


def get_token_timeout_seconds():
    configured = getattr(settings, 'SESSION_TIMEOUT_SECONDS', None)
    if configured is not None:
        return int(configured)
    return int(getattr(settings, 'SESSION_TIMEOUT_MINUTES', 60)) * 60


def token_has_expired(token):
    created = getattr(token, 'created', None)
    if created is None:
        return False
    return timezone.now() >= created + timedelta(seconds=get_token_timeout_seconds())


class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)

        if token_has_expired(token):
            token.delete()
            raise AuthenticationFailed('Session expired. Please log in again.')

        return user, token
