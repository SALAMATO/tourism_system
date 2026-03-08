from rest_framework.viewsets import ModelViewSet
from rest_framework.authentication import BasicAuthentication, TokenAuthentication
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from .models import Policy, News, SafetyAlert, Message, MessageComment, MessageLike, Statistic, Destination
from .serializers import (
    PolicySerializer, NewsSerializer, SafetyAlertSerializer,
    MessageSerializer, MessageCommentSerializer, MessageLikeSerializer,
    StatisticSerializer, DestinationSerializer,
    UserSerializer, UserRegisterSerializer
)
from ai import lowsky_ai


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
        account = request.data.get('username')  # 兼容前端字段名
        password = request.data.get('password')

        if not account or not password:
            return Response({'error': '请提供账号和密码'}, status=status.HTTP_400_BAD_REQUEST)

        # 尝试多种登录方式
        user = None
        
        # 1. 尝试用户名登录（不区分大小写）
        user = User.objects.filter(username__iexact=account).first()
        
        # 2. 如果用户名登录失败，尝试邮箱登录
        if not user and '@' in account:
            user = User.objects.filter(email__iexact=account).first()
        
        # 3. 如果邮箱登录失败，尝试手机号登录
        if not user and account.isdigit():
            user = User.objects.filter(phone=account).first()
        
        # 验证密码
        if user and user.check_password(password):
            # 检查账号是否被冻结
            if not user.is_active:
                return Response({'error': '账号已被冻结，请联系管理员'}, status=status.HTTP_403_FORBIDDEN)
            
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        
        return Response({'error': '账号或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)

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
        """修改当前用户的昵称、邮箱和手机号"""
        user = request.user
        nickname = request.data.get('nickname')
        email = request.data.get('email')
        phone = request.data.get('phone')
        
        if nickname is not None:
            user.nickname = nickname
        
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """管理员重置用户密码"""
        if not request.user.is_staff:
            return Response({'error': '只有管理员可以重置密码'}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        new_password = request.data.get('new_password', '123456')
        
        if len(new_password) < 6:
            return Response({'error': '密码长度至少6位'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        # 删除该用户的所有token，强制重新登录
        Token.objects.filter(user=user).delete()
        
        return Response({'message': f'密码已重置为：{new_password}'}, status=status.HTTP_200_OK)


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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def fetch_from_url(self, request):
        from .fetchers import PolicyFetcher

        url = request.data.get('url')
        if not url:
            return Response({'error': '请提供URL'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fetcher = PolicyFetcher(url)
            data = fetcher.fetch()
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def fetch_from_url(self, request):
        from .fetchers import NewsFetcher

        url = request.data.get('url')
        if not url:
            return Response({'error': '请提供URL'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fetcher = NewsFetcher(url)
            data = fetcher.fetch()
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)



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
    search_fields = ['content']
    ordering_fields = ['created_at', 'likes_count']

    def get_permissions(self):
        """
        未登录用户只能查看留言；
        登录用户才能创建留言、回复、修改、删除，以及查看自己的留言列表。
        """
        if self.action in ['create', 'reply', 'update', 'partial_update', 'destroy', 'my', 'like', 'unlike', 'add_comment']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

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

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """点赞留言"""
        message = self.get_object()
        user = request.user
        
        # 检查是否已经点赞
        if MessageLike.objects.filter(message=message, user=user).exists():
            return Response({'error': '您已经点赞过了'}, status=400)
        
        # 创建点赞记录
        MessageLike.objects.create(message=message, user=user)
        
        # 更新点赞数
        message.likes_count += 1
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        """取消点赞"""
        message = self.get_object()
        user = request.user
        
        # 查找点赞记录
        like = MessageLike.objects.filter(message=message, user=user).first()
        if not like:
            return Response({'error': '您还没有点赞'}, status=400)
        
        # 删除点赞记录
        like.delete()
        
        # 更新点赞数
        message.likes_count = max(0, message.likes_count - 1)
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """添加评论"""
        message = self.get_object()
        content = request.data.get('content')
        
        if not content:
            return Response({'error': '评论内容不能为空'}, status=400)
        
        comment = MessageComment.objects.create(
            message=message,
            user=request.user,
            content=content
        )
        
        serializer = MessageCommentSerializer(comment)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """获取留言的所有评论"""
        message = self.get_object()
        comments = message.comments.all()
        serializer = MessageCommentSerializer(comments, many=True)
        return Response(serializer.data)


# 统计数据视图集
class StatisticViewSet(PublicModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['region']
    ordering_fields = ['year', 'region']


# 留言评论视图集
class MessageCommentViewSet(PublicModelViewSet):
    queryset = MessageComment.objects.all()
    serializer_class = MessageCommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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


# LowSkyAI 智能助手视图集
class LowSkyAIViewSet(viewsets.ViewSet):
    """LowSkyAI智能助手API"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def chat(self, request):
        """与AI对话（非流式）"""
        message = request.data.get('message')
        context = request.data.get('context', {})
        
        if not message:
            return Response({'error': '消息不能为空'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            response = lowsky_ai.chat(message, context, stream=False)
            return Response(response)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def chat_stream(self, request):
        """与AI对话（流式）"""
        from django.http import StreamingHttpResponse
        import json
        
        message = request.data.get('message')
        context = request.data.get('context', {})
        
        if not message:
            return Response({'error': '消息不能为空'}, status=status.HTTP_400_BAD_REQUEST)
        
        def event_stream():
            try:
                for chunk in lowsky_ai.chat_stream(message, context):
                    # 使用SSE格式
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_model(self, request):
        """添加AI模型配置（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        model_name = request.data.get('model_name')
        api_key = request.data.get('api_key')
        api_base = request.data.get('api_base')
        max_tokens = request.data.get('max_tokens', 8000)
        temperature = request.data.get('temperature', 0.7)
        
        if not all([model_id, model_name, api_key]):
            return Response({'error': '缺少必要参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.add_model(
            model_id=model_id,
            model_name=model_name,
            api_key=api_key,
            api_base=api_base,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        if success:
            return Response({'message': '模型添加成功', 'model_id': model_id})
        else:
            return Response({'error': '模型添加失败'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove_model(self, request):
        """移除AI模型配置（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        if not model_id:
            return Response({'error': '缺少model_id参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.remove_model(model_id)
        if success:
            return Response({'message': '模型移除成功'})
        else:
            return Response({'error': '模型不存在'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def switch_model(self, request):
        """切换当前使用的模型（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        if not model_id:
            return Response({'error': '缺少model_id参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.switch_model(model_id)
        if success:
            return Response({'message': '模型切换成功', 'current_model': model_id})
        else:
            return Response({'error': '模型不存在'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def models(self, request):
        """获取所有已配置的模型"""
        models = lowsky_ai.get_models()
        return Response({'models': models})
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """获取对话历史"""
        limit = int(request.query_params.get('limit', 10))
        history = lowsky_ai.get_history(limit)
        return Response({'history': history})
    
    @action(detail=False, methods=['post'])
    def clear_history(self, request):
        """清空对话历史"""
        lowsky_ai.clear_history()
        return Response({'message': '对话历史已清空'})


