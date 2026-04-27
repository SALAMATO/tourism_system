# Migration to change recommendation_type from CharField to JSONField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_update_recommendation_choices'),
    ]

    operations = [
        # 先临时将字段改为TextField以便迁移
        migrations.AlterField(
            model_name='destination',
            name='recommendation_type',
            field=models.JSONField(
                default=list,
                verbose_name='推荐类型（多选）',
                help_text='支持多选：default(默认推荐), nearby(IP周边推荐), managed(管理员精选), selected(出行推荐)'
            ),
        ),
    ]
