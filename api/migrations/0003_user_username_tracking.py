# Generated migration for adding username change tracking fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_mediafile'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='username_change_count',
            field=models.IntegerField(default=0, verbose_name='用户名修改次数'),
        ),
        migrations.AddField(
            model_name='user',
            name='last_username_change_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='上次用户名修改时间'),
        ),
    ]
