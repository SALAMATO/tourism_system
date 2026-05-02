from django.contrib.auth import logout
from django.shortcuts import redirect, render
from django.http import HttpResponse


def admin_logout(request):
  """
  简单的登出视图，允许通过 GET 访问，然后跳回首页。
  这样就不会出现 LogoutView 只允许 POST 导致的 405 错误。
  """
  logout(request)
  return redirect('home')


def admin_module_loader(request, module_name):
    """
    动态加载管理后台模块HTML片段
    :param request: HTTP请求
    :param module_name: 模块名称 (policy, news, safety, destination, statistics, message, user)
    :return: HTML片段
    """
    # 模块名称映射到模板文件
    module_templates = {
        'policy': 'admin_modules/policy.html',
        'news': 'admin_modules/news.html',
        'safety': 'admin_modules/safety.html',
        'destination': 'admin_modules/destination.html',
        'statistics': 'admin_modules/statistics.html',
        'message': 'admin_modules/message.html',
        'user': 'admin_modules/user.html',
    }
    
    template_path = module_templates.get(module_name)
    if not template_path:
        return HttpResponse('<div class="error">无效的模块</div>', status=404)
    
    try:
        return render(request, template_path)
    except Exception as e:
        return HttpResponse(f'<div class="error">加载模块失败: {str(e)}</div>', status=500)

