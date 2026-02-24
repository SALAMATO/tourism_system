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
    path('policies/policy-detail.html', TemplateView.as_view(template_name='policy-detail.html'), name='policy-detail'),
    path('policy-detail.html', TemplateView.as_view(template_name='policy-detail.html'), name='policy-detail'),
    path('statistics/', TemplateView.as_view(template_name='statistics.html'), name='statistics'),
    path('safety/', TemplateView.as_view(template_name='safety.html'), name='safety'),
    path('news/', TemplateView.as_view(template_name='news.html'), name='news'),
    path('news/news-detail.html/', TemplateView.as_view(template_name='news-detail.html'), name='news-detail'),
    path('news-detail.html/', TemplateView.as_view(template_name='news-detail.html'), name='news-detail'),
    path('community/', TemplateView.as_view(template_name='community.html'), name='community'),

    # 用户登录/注册页面（前端）
    path('auth/', TemplateView.as_view(template_name='auth.html'), name='auth_page'),
    # 个人主页
    path('profile/', TemplateView.as_view(template_name='profile.html'), name='profile_page'),
    # 管理后台（前端单页，由前端基于 Token 和 is_staff 进行权限控制）
    path(
        'admin-page/',
        TemplateView.as_view(template_name='admin.html'),
        name='admin_page'
    ),  # 避免与 admin 冲突


    # 兼容旧的 messages 路由
    path('messages/', TemplateView.as_view(template_name='community.html'), name='community'),
]

