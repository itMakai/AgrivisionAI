import logging
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=2)
def broadcast_chat_message(self, conversation_id, message_data):
    """
    Push a chat message to every WebSocket client listening in the given
    conversation's channel group.  Called after a message is saved via the
    REST API (not via WebSocket directly).
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
    except Exception as exc:
        logger.exception('broadcast_chat_message failed for conv %s', conversation_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=2)
def notify_user(self, user_id, notification_data):
    """
    Push a new-message notification to a user's personal notification channel.
    Called when a message is saved via the REST API so the recipient's Inbox
    updates in real-time even if the chat modal is not open.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'new_message_notification',
                'notification': notification_data,
            },
        )
    except Exception as exc:
        logger.exception('notify_user failed for user %s', user_id)
        raise self.retry(exc=exc)
