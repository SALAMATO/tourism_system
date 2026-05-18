import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tourism_system.settings')
django.setup()

from django.core.management import execute_from_command_line

if __name__ == '__main__':
    # 执行collectstatic命令
    execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])