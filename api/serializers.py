from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Policy, News, SafetyAlert, Message, Statistic, Destination

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'avatar', 'bio', 'date_joined', 'is_staff']
        read_only_fields = ['date_joined', 'is_staff']


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
        user = User.objects.create_user(**validated_data)
        return user


class DestinationSerializer(serializers.ModelSerializer):
    """旅游目的地序列化器"""

    class Meta:
        model = Destination
        fields = '__all__'

class PolicySerializer(serializers.ModelSerializer):
    # 允许接收多种日期时间格式（包括前端使用的 ISO 字符串）
    """政策法规序列化器"""
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

        # risk_level 必须给一个合法值
        if 'risk_level' not in validated_data:
            validated_data['risk_level'] = '低'

        return super().create(validated_data)


class MessageSerializer(serializers.ModelSerializer):
    """留言反馈序列化器"""
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Message
        fields = '__all__'


class StatisticSerializer(serializers.ModelSerializer):
    """统计数据序列化器"""
    class Meta:
        model = Statistic
        fields = '__all__'


