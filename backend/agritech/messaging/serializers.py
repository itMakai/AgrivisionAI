from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Conversation, Message

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'inbound', 'body', 'response', 'created_at', 'sender']

    def get_sender(self, obj):
        try:
            if obj.sender:
                return {'id': obj.sender.id, 'username': getattr(obj.sender, 'username', str(obj.sender))}
        except Exception:
            pass
        return None


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'phone', 'channel', 'created_at', 'participants', 'messages']

    def get_participants(self, obj):
        try:
            return [{'id': u.id, 'username': getattr(u, 'username', str(u))} for u in obj.participants.all()]
        except Exception:
            # If the DB table doesn't exist yet (migrations pending), avoid crashing the serializer.
            return []
