from django.contrib import admin
from django.urls import path, include
from django.views.static import serve
from django.conf import settings
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required
from django.contrib.auth import views as auth_views
from .views import admin_logout
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # 首页直接返回模板
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('policies/', TemplateView.as_view(template_name='policies.html'), name='policies'),
    path('statistics/', TemplateView.as_view(template_name='statistics.html'), name='statistics'),
    path('safety/', TemplateView.as_view(template_name='safety.html'), name='safety'),
    path('news/', TemplateView.as_view(template_name='news.html'), name='news'),
    path('news/news-detail.html/', TemplateView.as_view(template_name='news-detail.html'), name='news-detail'),
    path('news-detail.html/', TemplateView.as_view(template_name='news-detail.html'), name='news-detail'),
    path('community/', TemplateView.as_view(template_name='community.html'), name='community'),

    # 管理后台（需要登录）
    path(
        'admin-page/',
        login_required(
            TemplateView.as_view(template_name='admin.html'),
            login_url='/admin-login/'
        ),
        name='admin_page'
    ),  # 避免与 admin 冲突

    # 管理员登录/退出
    path(
        'admin-login/',
        auth_views.LoginView.as_view(template_name='admin_login.html'),
        name='admin_login'
    ),
    path('logout/', admin_logout, name='logout'),


    # 兼容旧的 messages 路由
    path('messages/', TemplateView.as_view(template_name='community.html'), name='community'),
]

