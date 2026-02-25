from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PolicyViewSet, NewsViewSet, SafetyAlertViewSet,
    MessageViewSet, MessageCommentViewSet, StatisticViewSet, DestinationViewSet,
    UserViewSet
)


router = DefaultRouter()
router.register(r'policies', PolicyViewSet, basename='policy')
router.register(r'news', NewsViewSet, basename='news')
router.register(r'safety-alerts', SafetyAlertViewSet, basename='safety-alert')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'message-comments', MessageCommentViewSet, basename='message-comment')
router.register(r'statistics', StatisticViewSet, basename='statistic')
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'user', UserViewSet, basename='user')


# 兼容前端：/api/auth/* 作为纯 API（返回 JSON），不再返回 HTML 模板
auth_register_view = UserViewSet.as_view({'post': 'register'})
auth_login_view = UserViewSet.as_view({'post': 'login'})
auth_logout_view = UserViewSet.as_view({'post': 'logout'})
auth_me_view = UserViewSet.as_view({'get': 'me'})

urlpatterns = [
    path('auth/register/', auth_register_view, name='auth_register'),
    path('auth/login/', auth_login_view, name='auth_login'),
    path('auth/logout/', auth_logout_view, name='auth_logout'),
    path('auth/me/', auth_me_view, name='auth_me'),
    path('', include(router.urls)),
]