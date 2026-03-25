from django.contrib import admin
from core.models import Conversation, Message, StorageAdvice, MinFairPrice, FarmerProfile, BuyerProfile, Rating


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('phone', 'channel', 'created_at')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'inbound', 'created_at')


@admin.register(StorageAdvice)
class StorageAdviceAdmin(admin.ModelAdmin):
    list_display = ('title', 'severity', 'created_at')


@admin.register(MinFairPrice)
class MinFairPriceAdmin(admin.ModelAdmin):
    list_display = ('crop', 'market', 'min_price', 'updated_at')
@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('rater', 'target', 'score', 'created_at')
