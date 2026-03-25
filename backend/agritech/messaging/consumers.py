import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Per-conversation WebSocket consumer.
    Connect via: ws://<host>/ws/chat/<conversation_id>/?token=<auth_token>
    """

    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        can_access = await self._check_access(user, self.conversation_id)
        if not can_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.debug('WS connected: user=%s conv=%s', user.username, self.conversation_id)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            return

        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        body = (data.get('body') or '').strip()
        if not body:
            return

        msg = await self._save_message(user, self.conversation_id, body)

        # Broadcast to all clients in this conversation (including sender for confirmation)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': msg.id,
                    'body': msg.body,
                    'sender': {'id': user.id, 'username': user.username},
                    'inbound': False,
                    'created_at': msg.created_at.isoformat(),
                    'conversation': int(self.conversation_id),
                },
            },
        )

        # Also notify other participants via their personal notification channel
        participant_ids = await self._get_other_participant_ids(user, self.conversation_id)
        for uid in participant_ids:
            await self.channel_layer.group_send(
                f'notifications_{uid}',
                {
                    'type': 'new_message_notification',
                    'notification': {
                        'conversation_id': int(self.conversation_id),
                        'sender': user.username,
                        'preview': body[:80],
                    },
                },
            )

    # --- Channel layer event handlers ---

    async def chat_message(self, event):
        """Relay a chat_message event to the WebSocket client."""
        await self.send(text_data=json.dumps(event['message']))

    # --- DB helpers ---

    @database_sync_to_async
    def _check_access(self, user, conversation_id):
        from core.models import Conversation
        try:
            conv = Conversation.objects.get(id=conversation_id)
            return conv.participants.filter(id=user.id).exists() or user.is_staff
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_message(self, user, conversation_id, body):
        from core.models import Conversation, Message
        conv = Conversation.objects.get(id=conversation_id)
        return Message.objects.create(
            conversation=conv,
            sender=user,
            inbound=False,
            body=body,
            response='',
        )

    @database_sync_to_async
    def _get_other_participant_ids(self, user, conversation_id):
        from core.models import Conversation
        try:
            conv = Conversation.objects.get(id=conversation_id)
            return list(
                conv.participants.exclude(id=user.id).values_list('id', flat=True)
            )
        except Conversation.DoesNotExist:
            return []


class NotificationsConsumer(AsyncWebsocketConsumer):
    """
    Per-user notification channel.
    Connect via: ws://<host>/ws/notifications/?token=<auth_token>
    Delivers real-time inbox alerts when the user receives a new message in any conversation.
    """

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_group = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        logger.debug('Notifications WS connected: user=%s', user.username)

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        # Clients only listen; no inbound messages on this channel
        pass

    async def new_message_notification(self, event):
        await self.send(text_data=json.dumps(event['notification']))
