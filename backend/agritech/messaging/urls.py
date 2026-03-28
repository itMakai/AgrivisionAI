from django.urls import path
from . import api_views

urlpatterns = [
    path('send/', api_views.SendMessageAPIView.as_view(), name='messaging-send'),
    path('messages/', api_views.ConversationMessagesAPIView.as_view(), name='messaging-messages'),
    path('messages/<int:message_id>/', api_views.MessageDeleteAPIView.as_view(), name='messaging-message-delete'),
    path('conversations/', api_views.ConversationListAPIView.as_view(), name='messaging-conversations'),
    path('conversations/get_or_create/', api_views.GetOrCreateConversationAPIView.as_view(), name='messaging-get-or-create'),
]

