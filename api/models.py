from django.db import models


class Policy(models.Model):
    """政策法规模型"""
    title = models.CharField(max_length=200, verbose_name='政策标题')
    level = models.CharField(max_length=50, verbose_name='政策级别')
    category = models.CharField(max_length=100, verbose_name='分类')
    department = models.CharField(max_length=200, verbose_name='发布部门')
    publish_date = models.DateTimeField(verbose_name='发布日期')
    content = models.TextField(verbose_name='政策内容')
    file_url = models.URLField(blank=True, null=True, verbose_name='文件链接')
    tags = models.JSONField(default=list, verbose_name='标签')
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
    username = models.CharField(max_length=100, verbose_name='用户名')
    email = models.EmailField(verbose_name='邮箱')
    message_type = models.CharField(max_length=50, verbose_name='消息类型')
    content = models.TextField(verbose_name='消息内容')
    reply = models.TextField(blank=True, null=True, verbose_name='回复内容')
    status = models.CharField(max_length=20, default='待回复', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'messages'
        verbose_name = '留言反馈'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} - {self.message_type}'


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