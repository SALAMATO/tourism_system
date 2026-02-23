from django.contrib.auth import logout
from django.shortcuts import redirect


def admin_logout(request):
  """
  简单的登出视图，允许通过 GET 访问，然后跳回首页。
  这样就不会出现 LogoutView 只允许 POST 导致的 405 错误。
  """
  logout(request)
  return redirect('home')

