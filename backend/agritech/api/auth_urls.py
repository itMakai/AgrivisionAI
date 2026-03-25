from django.urls import path # type: ignore
from . import auth_views

urlpatterns = [
    path('register/', auth_views.register, name='api-register'),
    path('login/', auth_views.login, name='api-login'),
    path('profile/', auth_views.profile, name='api-profile'),
]
