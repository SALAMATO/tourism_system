from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_destination_options_destination_city_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='destination',
            name='cover_image',
            field=models.ImageField(blank=True, null=True, upload_to='media-destination/', verbose_name='封面图片'),
        ),
        migrations.AddField(
            model_name='destination',
            name='gallery_image_1',
            field=models.ImageField(blank=True, null=True, upload_to='media-destination/', verbose_name='展示图片1'),
        ),
        migrations.AddField(
            model_name='destination',
            name='gallery_image_2',
            field=models.ImageField(blank=True, null=True, upload_to='media-destination/', verbose_name='展示图片2'),
        ),
        migrations.AddField(
            model_name='destination',
            name='gallery_image_3',
            field=models.ImageField(blank=True, null=True, upload_to='media-destination/', verbose_name='展示图片3'),
        ),
        migrations.AddField(
            model_name='destination',
            name='gallery_image_4',
            field=models.ImageField(blank=True, null=True, upload_to='media-destination/', verbose_name='展示图片4'),
        ),
    ]
