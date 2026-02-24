from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.views.generic import TemplateView
from .views import (
    PolicyViewSet, NewsViewSet, SafetyAlertViewSet,
    MessageViewSet, StatisticViewSet, DestinationViewSet,
    UserViewSet
)


router = DefaultRouter()
router.register(r'policies', PolicyViewSet, basename='policy')
router.register(r'news', NewsViewSet, basename='news')
router.register(r'safety-alerts', SafetyAlertViewSet, basename='safety-alert')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'statistics', StatisticViewSet, basename='statistic')
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'user', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    # 用户登录界面（需要登录）
    path('auth/register/', TemplateView.as_view(template_name='auth.html'), name='user_register'),
    path('auth/login/', TemplateView.as_view(template_name='auth.html'), name='user_login'),
    path('auth/logout/', TemplateView.as_view(template_name='auth.html'), name='user_logout'),
    path('auth/me/', TemplateView.as_view(template_name='auth.html'), name='current_user'),
]

# 本地 DEBUG=False 静态文件映射
if not settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)