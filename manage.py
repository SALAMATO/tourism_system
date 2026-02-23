import os
import sys

def main():
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        'tourism_system.settings'  # 改成你真实项目名
    )

    from django.core.management import execute_from_command_line

    if len(sys.argv) == 1:
        sys.argv.append('runserver')

    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()