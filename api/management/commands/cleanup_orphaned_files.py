"""
Django管理命令：清理孤儿媒体文件
用法：python manage.py cleanup_orphaned_files
"""
from django.core.management.base import BaseCommand
from api.media_manager import MediaFileManager


class Command(BaseCommand):
    help = '清理孤儿媒体文件（数据库中不存在但物理文件存在的文件）'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('开始清理孤儿媒体文件...'))
        
        try:
            cleaned_count = MediaFileManager.cleanup_orphaned_files()
            
            if cleaned_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ 成功清理 {cleaned_count} 个孤儿文件')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ 没有发现孤儿文件')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ 清理失败: {str(e)}')
            )
            raise
