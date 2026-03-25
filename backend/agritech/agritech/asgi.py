"""
ASGI config for agritech project — Django Channels with WebSocket support.
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agritech.settings')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
import messaging.routing
from messaging.middleware import TokenAuthMiddleware

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': TokenAuthMiddleware(
        URLRouter(
            messaging.routing.websocket_urlpatterns
        )
    ),
})
