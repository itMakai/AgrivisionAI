from urllib.parse import parse_qs

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user_from_token(token_key):
    """Resolve a DRF auth token to the owning User, or return AnonymousUser."""
    from rest_framework.authtoken.models import Token
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using a DRF token passed as a query
    parameter: ?token=<auth_token>
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token_key = (params.get('token') or [None])[0]

        if token_key:
            scope['user'] = await _get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
