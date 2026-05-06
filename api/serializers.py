from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Policy, News, SafetyAlert, Message, MessageComment, MessageLike, Statistic, Destination
from .media_manager import MediaFileManager

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""

    class Meta:
        model = User
        fields = ['id', 'username', 'nickname', 'email', 'phone', 'avatar', 'bio', 'date_joined', 'is_staff', 'is_active',
                  'country', 'province', 'city', 'latitude', 'longitude', 'last_login_ip', 
                  'username_change_count', 'last_username_change_at']
        read_only_fields = ['date_joined', 'username_change_count', 'last_username_change_at']


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

    cover_image = serializers.ImageField(required=False, allow_null=True)
    gallery_image_1 = serializers.ImageField(required=False, allow_null=True)
    gallery_image_2 = serializers.ImageField(required=False, allow_null=True)
    gallery_image_3 = serializers.ImageField(required=False, allow_null=True)
    gallery_image_4 = serializers.ImageField(required=False, allow_null=True)
    cover_image_url = serializers.SerializerMethodField(read_only=True)
    gallery_image_1_url = serializers.SerializerMethodField(read_only=True)
    gallery_image_2_url = serializers.SerializerMethodField(read_only=True)
    gallery_image_3_url = serializers.SerializerMethodField(read_only=True)
    gallery_image_4_url = serializers.SerializerMethodField(read_only=True)
    features_display = serializers.CharField(write_only=True, required=False, allow_blank=True)
    features_rich_text = serializers.SerializerMethodField(read_only=True)
    is_domestic = serializers.BooleanField(read_only=True)
    publish_date = serializers.DateTimeField(
        input_formats=['iso-8601', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S'],
        required=False,
        allow_null=True
    )
    
    def get_features_rich_text(self, obj):
        features = obj.features or []
        if not features:
            return ''
        return '\n'.join(features) if len(features) > 1 else features[0]
    
    def get_is_domestic(self, obj):
        """获取是否国内的布尔值"""
        return obj.is_domestic
    

    class Meta:
        model = Destination
        fields = '__all__'

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if not obj.cover_image:
            return ''
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def _build_image_url(self, image_field):
        request = self.context.get('request')
        if not image_field:
            return ''
        url = image_field.url
        return request.build_absolute_uri(url) if request else url

    def get_gallery_image_1_url(self, obj):
        return self._build_image_url(obj.gallery_image_1)

    def get_gallery_image_2_url(self, obj):
        return self._build_image_url(obj.gallery_image_2)

    def get_gallery_image_3_url(self, obj):
        return self._build_image_url(obj.gallery_image_3)

    def get_gallery_image_4_url(self, obj):
        return self._build_image_url(obj.gallery_image_4)

    def validate_features_display(self, value):
        if not value:
            return ''
        return value.strip()

    def _normalize_features(self, validated_data):
        features_display = validated_data.pop('features_display', None)
        if features_display is not None:
            validated_data['features'] = [features_display.strip()] if features_display.strip() else []
        elif 'features' in validated_data and isinstance(validated_data['features'], str):
            validated_data['features'] = [validated_data['features'].strip()] if validated_data['features'].strip() else []
        return validated_data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['features_display'] = self.get_features_rich_text(instance)
        return data

    def create(self, validated_data):
        """创建目的地时使用媒体文件管理器处理图片"""
        validated_data = self._normalize_features(validated_data)
        
        # 处理封面图片
        if 'cover_image' in validated_data and validated_data['cover_image']:
            uploaded_file = validated_data.pop('cover_image')
            media_file, _ = MediaFileManager.save_file_with_deduplication(
                uploaded_file, 
                upload_to='media-destination/'
            )
            validated_data['cover_image'] = media_file.file_path
        
        # 处理展示图片1-4
        for i in range(1, 5):
            field_name = f'gallery_image_{i}'
            if field_name in validated_data and validated_data[field_name]:
                uploaded_file = validated_data.pop(field_name)
                media_file, _ = MediaFileManager.save_file_with_deduplication(
                    uploaded_file,
                    upload_to='media-destination/'
                )
                validated_data[field_name] = media_file.file_path
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """更新目的地时处理图片的引用计数"""
        from django.core.files.uploadedfile import UploadedFile
        
        validated_data = self._normalize_features(validated_data)
        
        # 处理封面图片
        if 'cover_image' in validated_data:
            new_cover = validated_data['cover_image']
            old_cover = instance.cover_image
            
            # 如果是新上传的文件
            if isinstance(new_cover, UploadedFile):
                # 释放旧文件引用
                if old_cover:
                    try:
                        from .models import MediaFile
                        media_file = MediaFile.objects.get(file_path=str(old_cover), is_deleted=False)
                        MediaFileManager.release_file_reference(media_file)
                    except MediaFile.DoesNotExist:
                        pass
                
                # 保存新文件
                media_file, _ = MediaFileManager.save_file_with_deduplication(
                    new_cover,
                    upload_to='media-destination/'
                )
                validated_data['cover_image'] = media_file.file_path
            elif not new_cover:
                # 如果清空了图片
                if old_cover:
                    try:
                        from .models import MediaFile
                        media_file = MediaFile.objects.get(file_path=str(old_cover), is_deleted=False)
                        MediaFileManager.release_file_reference(media_file)
                    except MediaFile.DoesNotExist:
                        pass
        
        # 处理展示图片1-4
        for i in range(1, 5):
            field_name = f'gallery_image_{i}'
            if field_name in validated_data:
                new_image = validated_data[field_name]
                old_image = getattr(instance, field_name)
                
                # 如果是新上传的文件
                if isinstance(new_image, UploadedFile):
                    # 释放旧文件引用
                    if old_image:
                        try:
                            from .models import MediaFile
                            media_file = MediaFile.objects.get(file_path=str(old_image), is_deleted=False)
                            MediaFileManager.release_file_reference(media_file)
                        except MediaFile.DoesNotExist:
                            pass
                    
                    # 保存新文件
                    media_file, _ = MediaFileManager.save_file_with_deduplication(
                        new_image,
                        upload_to='media-destination/'
                    )
                    validated_data[field_name] = media_file.file_path
                elif not new_image:
                    # 如果清空了图片
                    if old_image:
                        try:
                            from .models import MediaFile
                            media_file = MediaFile.objects.get(file_path=str(old_image), is_deleted=False)
                            MediaFileManager.release_file_reference(media_file)
                        except MediaFile.DoesNotExist:
                            pass
        
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
    cover_image = serializers.ImageField(required=False, allow_null=True)
    cover_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = News
        fields = '__all__'

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if not obj.cover_image:
            return ''
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def create(self, validated_data):
        """创建新闻时使用媒体文件管理器处理封面图片"""
        # 处理封面图片
        if 'cover_image' in validated_data and validated_data['cover_image']:
            uploaded_file = validated_data.pop('cover_image')
            media_file, _ = MediaFileManager.save_file_with_deduplication(
                uploaded_file,
                upload_to='news/'
            )
            validated_data['cover_image'] = media_file.file_path
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """更新新闻时处理封面图片的引用计数"""
        from django.core.files.uploadedfile import UploadedFile
        
        # 处理封面图片
        if 'cover_image' in validated_data:
            new_cover = validated_data['cover_image']
            old_cover = instance.cover_image
            
            # 如果是新上传的文件
            if isinstance(new_cover, UploadedFile):
                # 释放旧文件引用
                if old_cover:
                    try:
                        from .models import MediaFile
                        media_file = MediaFile.objects.get(file_path=str(old_cover), is_deleted=False)
                        MediaFileManager.release_file_reference(media_file)
                    except MediaFile.DoesNotExist:
                        pass
                
                # 保存新文件
                media_file, _ = MediaFileManager.save_file_with_deduplication(
                    new_cover,
                    upload_to='news/'
                )
                validated_data['cover_image'] = media_file.file_path
            elif not new_cover:
                # 如果清空了图片
                if old_cover:
                    try:
                        from .models import MediaFile
                        media_file = MediaFile.objects.get(file_path=str(old_cover), is_deleted=False)
                        MediaFileManager.release_file_reference(media_file)
                    except MediaFile.DoesNotExist:
                        pass
        
        return super().update(instance, validated_data)


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


