from rest_framework.viewsets import ModelViewSet
from rest_framework.authentication import BasicAuthentication, TokenAuthentication
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from .models import Policy, News, SafetyAlert, Message, Statistic, Destination
from .serializers import (
    PolicySerializer, NewsSerializer, SafetyAlertSerializer,
    MessageSerializer, StatisticSerializer, DestinationSerializer,
    UserSerializer, UserRegisterSerializer
)


# 禁用CSRF类
class PublicModelViewSet(ModelViewSet):
    """
    所有继承该基类的 ViewSet 默认：
    1. 不使用 SessionAuthentication -> 禁用 CSRF
    2. 允许匿名访问
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        news = self.get_object()
        news.views += 1
        news.save()
        return Response({'views': news.views})

User = get_user_model()
class UserViewSet(PublicModelViewSet):
    """用户管理（管理员可管理用户）"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['date_joined']

    # -------------------
    # 注册
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # -------------------
    # 登录
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': '请提供用户名和密码'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        return Response({'error': '用户名或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)

    # -------------------
    # 登出
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        request.user.auth_token.delete()
        return Response({'message': '登出成功'})

    # -------------------
    # 当前用户信息
    # -------------------
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# 目的地视图集
class DestinationViewSet(PublicModelViewSet):
    """旅游目的地"""
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['rating', 'views', 'created_at']

    @action(detail=False, methods=['get'])
    def hot(self, request):
        """获取热门目的地"""
        hot_destinations = self.queryset.filter(is_hot=True)[:6]
        serializer = self.get_serializer(hot_destinations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        destination = self.get_object()
        destination.views += 1
        destination.save()
        return Response({'views': destination.views})


# 政策法规视图集
class PolicyViewSet(PublicModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'department', 'content']
    ordering_fields = ['created_at', 'publish_date']

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        policy = self.get_object()
        policy.views += 1
        policy.save()
        return Response({'views': policy.views})

# 新闻资讯视图集
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


# 安全隐患视图集
class SafetyAlertViewSet(PublicModelViewSet):
    queryset = SafetyAlert.objects.all()
    serializer_class = SafetyAlertSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'report_date']


# 留言反馈视图集
class MessageViewSet(PublicModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'content']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        """创建留言时关联当前用户"""
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

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


# 统计数据视图集
class StatisticViewSet(PublicModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['region']
    ordering_fields = ['year', 'region']


# api/views.py - 添加详细的错误日志
import logging
logger = logging.getLogger(__name__)

def create(self, request, *args, **kwargs):
    logger.error(f"Received data: {request.data}")
    serializer = self.get_serializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    self.perform_create(serializer)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


