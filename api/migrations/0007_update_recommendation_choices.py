# Generated migration for updating recommendation_type choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_destination_is_domestic'),
    ]

    operations = [
        migrations.AlterField(
            model_name='destination',
            name='recommendation_type',
            field=models.CharField(
                choices=[('nearby', 'IP周边推荐'), ('managed', '管理员精选'), ('selected', '出行推荐')],
                db_index=True,
                default='managed',
                max_length=20,
                verbose_name='推荐类型'
            ),
        ),
    ]
