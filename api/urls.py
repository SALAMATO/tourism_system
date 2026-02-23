from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PolicyViewSet, NewsViewSet, SafetyAlertViewSet,
    MessageViewSet, StatisticViewSet
)
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

router = DefaultRouter()
router.register(r'policies', PolicyViewSet, basename='policy')
router.register(r'news', NewsViewSet, basename='news')
router.register(r'safety-alerts', SafetyAlertViewSet, basename='safety-alert')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'statistics', StatisticViewSet, basename='statistic')

urlpatterns = [
    path('', include(router.urls)),
]

# 本地 DEBUG=False 静态文件映射
if not settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)