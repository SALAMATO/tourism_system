from pathlib import Path
import os
# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent

# 静态文件 URL 前缀（必须）
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 本地开发静态文件目录
STATICFILES_DIRS = [BASE_DIR / 'static']

# 指向你的 urls.py 文件
ROOT_URLCONF = 'tourism_system.urls'


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 第三方应用
    'rest_framework.authtoken',  # 新增：Token认证
    'rest_framework',
    'corsheaders',

    # 自己的应用
    'api'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # 添加CORS中间件
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 使用CORS配置（开发环境）
CORS_ALLOW_ALL_ORIGINS = True  # 开发环境允许所有来源
CORS_ALLOW_CREDENTIALS = True  # 允许携带认证信息

# 生产环境使用：
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:8000",
#     "http://127.0.0.1:8000",
# ]

# # 数据库配置
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # 开发环境用SQLite
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,  # 增加超时时间，避免数据库锁定
        }
    }
}

# 如果需要使用MySQL，请先安装 mysqlclient：
# pip install mysqlclient
# 然后取消下面的注释并注释掉上面的SQLite配置
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': 'low_altitude_tourism',
#         'USER': 'root',
#         'PASSWORD': '123456',
#         'HOST': 'localhost',
#         'PORT': '3306',
#     }
# }

# REST Framework配置
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # 默认允许所有人访问
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',  # 必须这样写
        'DIRS': [BASE_DIR / 'templates'],  # 指向 templates 文件夹
        'APP_DIRS': True,  # 自动寻找 app 内的 templates 目录
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# settings.py
SECRET_KEY = 'django-insecure-!a_random_secret_key_for_dev_1234567890'

# 自定义用户模型
AUTH_USER_MODEL = 'api.User'

# 语言和时区
LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_TZ = True
DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

