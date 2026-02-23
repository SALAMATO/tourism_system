from rest_framework.viewsets import ModelViewSet
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import AllowAny
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Policy, News, SafetyAlert, Message, Statistic
from .serializers import (
    PolicySerializer, NewsSerializer, SafetyAlertSerializer,
    MessageSerializer, StatisticSerializer
)

class PublicModelViewSet(ModelViewSet):
    """
    所有继承该基类的 ViewSet 默认：
    1. 不使用 SessionAuthentication -> 禁用 CSRF
    2. 允许匿名访问
    """
    authentication_classes = [BasicAuthentication]
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        news = self.get_object()
        news.views += 1
        news.save()
        return Response({'views': news.views})

class PolicyViewSet(PublicModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'department', 'content']
    ordering_fields = ['created_at', 'publish_date']


class NewsViewSet(PublicModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'author']
    ordering_fields = ['created_at', 'publish_date', 'views']

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        news = self.get_object()
        news.views += 1
        news.save()
        return Response({'views': news.views})


class SafetyAlertViewSet(PublicModelViewSet):
    queryset = SafetyAlert.objects.all()
    serializer_class = SafetyAlertSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'report_date']


class MessageViewSet(PublicModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'content']
    ordering_fields = ['created_at']


    @action(detail=True, methods=['patch'])
    def reply(self, request, pk=None):
        """回复留言"""
        message = self.get_object()
        reply_content = request.data.get('reply')
        if reply_content:
            message.reply = reply_content
            message.status = '已回复'
            message.save()
            serializer = self.get_serializer(message)
            return Response(serializer.data)
        return Response({'error': '回复内容不能为空'}, status=400)


class StatisticViewSet(PublicModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['region']
    ordering_fields = ['year', 'region']


# api/views.py - 添加详细的错误日志

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


# class PolicyViewSet(viewsets.ModelViewSet):
#     queryset = Policy.objects.all()
#     serializer_class = PolicySerializer
#     filter_backends = [filters.SearchFilter, filters.OrderingFilter]
#     search_fields = ['title', 'department', 'content']
#     ordering_fields = ['created_at', 'publish_date']

def create(self, request, *args, **kwargs):
    logger.error(f"Received data: {request.data}")
    serializer = self.get_serializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    self.perform_create(serializer)
    return Response(serializer.data, status=status.HTTP_201_CREATED)



