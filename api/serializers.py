from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Policy, News, SafetyAlert, Message, MessageComment, MessageLike, Statistic, Destination

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""

    class Meta:
        model = User
        fields = ['id', 'username', 'nickname', 'email', 'phone', 'avatar', 'bio', 'date_joined', 'is_staff', 'is_active']
        read_only_fields = ['date_joined']


class UserRegisterSerializer(serializers.ModelSerializer):
    """用户注册序列化器"""
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'phone']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("两次密码不一致")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = User(**validated_data)
        user.set_password(password)

        if not user.nickname:
            user.nickname = user.username

        user.save()
        return user


class DestinationSerializer(serializers.ModelSerializer):
    """旅游目的地序列化器"""

    cover_image_url = serializers.SerializerMethodField(read_only=True)
    features_display = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Destination
        fields = '__all__'

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if not obj.cover_image:
            return ''
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def validate_features_display(self, value):
        if not value:
            return ''
        return value.strip()

    def _normalize_features(self, validated_data):
        features_display = validated_data.pop('features_display', None)
        if features_display is not None:
            validated_data['features'] = [item.strip() for item in features_display.split('\n') if item.strip()]
        elif 'features' in validated_data and isinstance(validated_data['features'], str):
            validated_data['features'] = [item.strip() for item in validated_data['features'].split('\n') if item.strip()]
        return validated_data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['features_display'] = '\n'.join(instance.features or [])
        return data

    def create(self, validated_data):
        validated_data = self._normalize_features(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._normalize_features(validated_data)
        return super().update(instance, validated_data)


class PolicySerializer(serializers.ModelSerializer):
    publish_date = serializers.DateTimeField(
        input_formats=['iso-8601', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S']
    )
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    class Meta:
        model = Policy
        fields = '__all__'


class NewsSerializer(serializers.ModelSerializer):
    """新闻资讯序列化器"""
    publish_date = serializers.DateTimeField(
        input_formats=['iso-8601', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S']
    )
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    class Meta:
        model = News
        fields = '__all__'


class SafetyAlertSerializer(serializers.ModelSerializer):
    report_date = serializers.DateTimeField(
        input_formats=['iso-8601', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S'],
        required=False
    )

    class Meta:
        model = SafetyAlert
        fields = '__all__'

    def create(self, validated_data):
        if 'status' not in validated_data:
            validated_data['status'] = '待处理'

        if 'report_date' not in validated_data:
            validated_data['report_date'] = timezone.now()

        if 'risk_level' not in validated_data:
            validated_data['risk_level'] = '低'

        return super().create(validated_data)


class MessageSerializer(serializers.ModelSerializer):
    """留言反馈序列化器"""
    user_nickname = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    user_liked = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'

    def get_user_nickname(self, obj):
        if obj.user:
            return obj.user.nickname or obj.user.username
        return '匿名用户'

    def get_user_avatar(self, obj):
        if obj.user and obj.user.avatar:
            return obj.user.avatar
        return None

    def get_user_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

    def get_user_email(self, obj):
        if obj.user:
            return obj.user.email
        return None

    def get_user_phone(self, obj):
        if obj.user:
            return obj.user.phone
        return None

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_user_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return MessageLike.objects.filter(message=obj, user=request.user).exists()
        return False


class MessageCommentSerializer(serializers.ModelSerializer):
    """留言评论序列化器"""
    user_nickname = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    user_is_staff = serializers.SerializerMethodField()

    class Meta:
        model = MessageComment
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

    def get_user_nickname(self, obj):
        return obj.user.nickname or obj.user.username

    def get_user_avatar(self, obj):
        return obj.user.avatar if obj.user.avatar else None

    def get_user_is_staff(self, obj):
        return obj.user.is_staff


class MessageLikeSerializer(serializers.ModelSerializer):
    """留言点赞序列化器"""

    class Meta:
        model = MessageLike
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class StatisticSerializer(serializers.ModelSerializer):
    """统计数据序列化器"""
    class Meta:
        model = Statistic
        fields = '__all__'


