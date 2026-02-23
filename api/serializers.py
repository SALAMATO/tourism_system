from rest_framework import serializers
from django.utils import timezone
from .models import Policy, News, SafetyAlert, Message, Statistic


class PolicySerializer(serializers.ModelSerializer):
    # 允许接收多种日期时间格式（包括前端使用的 ISO 字符串）
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
    class Meta:
        model = Message
        fields = '__all__'


class StatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statistic
        fields = '__all__'

