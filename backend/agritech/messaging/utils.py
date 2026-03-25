"""
Messaging utilities — channel layer broadcast helpers.
Twilio has been removed; real-time delivery uses Django Channels + Redis.
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_to_conversation(conversation_id, message_data):
    """
    Synchronously push *message_data* to all WebSocket clients in the
    conversation's channel group.  Safe to call from synchronous Django views.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{conversation_id}',
            {
                'type': 'chat_message',
                'message': message_data,
            },
        )
    except Exception:
        logger.exception('broadcast_to_conversation failed for conv %s', conversation_id)


def notify_participants(conversation_id, sender_user, message_body):
    """
    Push a notification to each participant's personal notification channel
    (except the sender).  Used so the Inbox updates in real-time.
    """
    try:
        from core.models import Conversation
        conv = Conversation.objects.get(id=conversation_id)
        participant_ids = list(
            conv.participants.exclude(id=sender_user.id).values_list('id', flat=True)
        )
        channel_layer = get_channel_layer()
        for uid in participant_ids:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{uid}',
                {
                    'type': 'new_message_notification',
                    'notification': {
                        'conversation_id': conversation_id,
                        'sender': sender_user.username,
                        'preview': message_body[:80],
                    },
                },
            )
    except Exception:
        logger.exception('notify_participants failed for conv %s', conversation_id)

