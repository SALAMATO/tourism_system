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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """修改当前用户密码"""
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response({'error': '请提供原密码和新密码'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if not user.check_password(old_password):
            return Response({'error': '原密码不正确'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': '新密码长度至少6位'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        # 修改密码后使旧 token 失效
        Token.objects.filter(user=user).delete()
        return Response({'message': '密码修改成功，请使用新密码重新登录'})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """修改当前用户的邮箱和手机号"""
        user = request.user
        email = request.data.get('email')
        phone = request.data.get('phone')
        
        if email is not None:
            # 验证邮箱格式
            if email and '@' not in email:
                return Response({'error': '邮箱格式不正确'}, status=status.HTTP_400_BAD_REQUEST)
            # 检查邮箱是否已被其他用户使用
            if email and User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({'error': '该邮箱已被使用'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email
        
        if phone is not None:
            # 检查手机号是否已被其他用户使用
            if phone and User.objects.filter(phone=phone).exclude(id=user.id).exists():
                return Response({'error': '该手机号已被使用'}, status=status.HTTP_400_BAD_REQUEST)
            user.phone = phone
        
        user.save()
        return Response({
            'message': '个人信息修改成功',
            'user': UserSerializer(user).data
        })


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

    def get_permissions(self):
        """
        未登录用户只能查看留言；
        登录用户才能创建留言、回复、修改、删除，以及查看自己的留言列表。
        """
        if self.action in ['create', 'reply', 'update', 'partial_update', 'destroy', 'my']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """创建留言时关联当前用户（已登录才允许创建）"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def reply(self, request, pk=None):
        """回复留言（仅登录用户使用后台回复）"""
        message = self.get_object()
        reply_content = request.data.get('reply')
        if reply_content:
            message.reply = reply_content
            message.status = '已回复'
            message.save()
            serializer = self.get_serializer(message)
            return Response(serializer.data)
        return Response({'error': '回复内容不能为空'}, status=400)

    @action(detail=False, methods=['get'])
    def my(self, request):
        """当前用户自己发表的留言列表"""
        qs = self.get_queryset().filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


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


