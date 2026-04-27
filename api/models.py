from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """自定义用户模型"""
    nickname = models.CharField(max_length=50, blank=True, null=True, verbose_name='昵称')
    phone = models.CharField(max_length=11, blank=True, null=True, verbose_name='手机号')
    avatar = models.URLField(blank=True, null=True, verbose_name='头像')
    bio = models.TextField(blank=True, null=True, verbose_name='个人简介')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='注册时间')

    class Meta:
        db_table = 'users'
        verbose_name = '用户'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.nickname or self.username


class Destination(models.Model):
    """低空旅游目的地"""

    RECOMMENDATION_CHOICES = [
        ('nearby', 'IP周边推荐'),
        ('managed', '管理员推荐'),
    ]

    name = models.CharField(max_length=200, verbose_name='目的地名称')
    city = models.CharField(max_length=100, db_index=True, verbose_name='所属城市')
    location = models.CharField(max_length=200, verbose_name='地理位置')
    description = models.TextField(verbose_name='详细介绍')
    cover_image = models.ImageField(upload_to='media-destination/', blank=True, null=True, verbose_name='封面图片')
    category = models.CharField(max_length=100, verbose_name='类别')
    price_range = models.CharField(max_length=100, verbose_name='价格区间')
    duration = models.CharField(max_length=100, verbose_name='游玩时长')
    best_season = models.CharField(max_length=100, verbose_name='最佳季节')
    features = models.JSONField(default=list, verbose_name='特色亮点')
    rating = models.FloatField(default=5.0, verbose_name='评分')
    views = models.IntegerField(default=0, verbose_name='浏览次数')
    is_hot = models.BooleanField(default=False, verbose_name='是否热门')
    is_featured = models.BooleanField(default=False, verbose_name='首页推荐')
    recommendation_type = models.CharField(
        max_length=20,
        choices=RECOMMENDATION_CHOICES,
        default='managed',
        verbose_name='推荐类型'
    )
    sort_order = models.PositiveIntegerField(default=0, verbose_name='排序值')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'destinations'
        verbose_name = '旅游目的地'
        verbose_name_plural = verbose_name
        ordering = ['sort_order', '-is_hot', '-rating', '-views', '-created_at']

    def __str__(self):
        return f'{self.city} - {self.name}'


class Policy(models.Model):
    """政策法规模型"""
    title = models.CharField(max_length=200, verbose_name='政策标题')
    level = models.CharField(max_length=50, verbose_name='政策级别')
    category = models.CharField(max_length=100, verbose_name='分类')
    department = models.CharField(max_length=200, verbose_name='发布部门')
    publish_date = models.DateTimeField(verbose_name='发布日期')
    content = models.TextField(verbose_name='政策内容')
    cover_image = models.URLField(blank=True, null=True, verbose_name='封面图片')  # 新增
    file_url = models.URLField(blank=True, null=True, verbose_name='文件链接')
    tags = models.JSONField(default=list, verbose_name='标签')
    views = models.IntegerField(default=0, verbose_name='浏览次数')  # 新增
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'policies'
        verbose_name = '政策法规'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class News(models.Model):
    """新闻资讯模型"""
    title = models.CharField(max_length=200, verbose_name='新闻标题')
    category = models.CharField(max_length=100, verbose_name='分类')
    author = models.CharField(max_length=100, verbose_name='作者')
    cover_image = models.URLField(blank=True, null=True, verbose_name='封面图片')
    content = models.TextField(verbose_name='新闻内容')
    publish_date = models.DateTimeField(verbose_name='发布日期')
    views = models.IntegerField(default=0, verbose_name='浏览次数')
    tags = models.JSONField(default=list, verbose_name='标签')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'news'
        verbose_name = '新闻资讯'
        verbose_name_plural = verbose_name
        ordering = ['-publish_date']

    def __str__(self):
        return self.title


class SafetyAlert(models.Model):
    """安全隐患模型"""
    RISK_CHOICES = [
        ('高', '高风险'),
        ('中', '中风险'),
        ('低', '低风险'),
    ]

    STATUS_CHOICES = [
        ('待处理', '待处理'),
        ('处理中', '处理中'),
        ('已解决', '已解决'),
    ]

    title = models.CharField(max_length=200, verbose_name='隐患标题')
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES, verbose_name='风险等级')
    category = models.CharField(max_length=100, verbose_name='隐患类别')
    description = models.TextField(verbose_name='详细描述')
    prevention = models.TextField(verbose_name='预防措施')
    emergency_plan = models.TextField(verbose_name='应急预案')
    report_date = models.DateTimeField(verbose_name='报告日期')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='待处理', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'safety_alerts'
        verbose_name = '安全隐患'
        verbose_name_plural = verbose_name
        ordering = ['-report_date']

    def __str__(self):
        return self.title


class Message(models.Model):
    """留言反馈模型"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name='用户')
    message_type = models.CharField(max_length=50, verbose_name='消息类型')
    content = models.TextField(verbose_name='消息内容')
    reply = models.TextField(blank=True, null=True, verbose_name='回复内容')
    status = models.CharField(max_length=20, default='待回复', verbose_name='状态')
    is_hidden = models.BooleanField(default=False, verbose_name='是否屏蔽')
    likes_count = models.IntegerField(default=0, verbose_name='点赞数')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'messages'
        verbose_name = '留言反馈'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname if self.user and self.user.nickname else (self.user.username if self.user else "匿名")} - {self.message_type}'


class MessageComment(models.Model):
    """留言评论模型"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='comments', verbose_name='留言')
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='评论用户')
    content = models.TextField(verbose_name='评论内容')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='评论时间')

    class Meta:
        db_table = 'message_comments'
        verbose_name = '留言评论'
        verbose_name_plural = verbose_name
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user.nickname or self.user.username} 评论了 {self.message.id}'


class MessageLike(models.Model):
    """留言点赞模型"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='likes', verbose_name='留言')
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='点赞用户')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'message_likes'
        verbose_name = '留言点赞'
        verbose_name_plural = verbose_name
        unique_together = ['message', 'user']  # 一个用户只能给一条留言点赞一次

    def __str__(self):
        return f'{self.user.nickname or self.user.username} 点赞了 {self.message.id}'


class Statistic(models.Model):
    """统计数据模型"""
    region = models.CharField(max_length=100, verbose_name='地区')
    year = models.IntegerField(verbose_name='年份')
    tourist_count = models.FloatField(verbose_name='游客数量(万人次)')
    revenue = models.FloatField(verbose_name='营收(万元)')
    flight_count = models.IntegerField(verbose_name='航班次数')
    aircraft_count = models.IntegerField(verbose_name='航空器数量')
    growth_rate = models.FloatField(verbose_name='增长率(%)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'statistics'
        verbose_name = '统计数据'
        verbose_name_plural = verbose_name
        ordering = ['-year', 'region']
        unique_together = [['region', 'year']]

    def __str__(self):
        return f'{self.region} - {self.year}年'
