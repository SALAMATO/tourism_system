class AuthManager {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.init();
  }

  init() {
    // 页面加载时更新用户菜单
    this.updateUserMenu();
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  async register(username, email, password, passwordConfirm, phone = '') {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password,
          password_confirm: passwordConfirm,
          phone
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json();
      this.setAuth(data.token, data.user);
      return data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '登录失败');
      }

      const data = await response.json();
      this.setAuth(data.token, data.user);
      return data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.token) {
        await fetch('http://127.0.0.1:8000/api/auth/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.token}`
          }
        });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      this.clearAuth();
    }
  }

  async getCurrentUser() {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
        headers: {
          'Authorization': `Token ${this.token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      } else {
        // Token无效，清除认证信息
        this.clearAuth();
        return null;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.updateUserMenu();
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    this.updateUserMenu();
  }

  updateUserMenu() {
    const userMenuContainer = document.getElementById('user-menu');
    if (!userMenuContainer) return;

    if (this.isAuthenticated() && this.user) {
      // 如果是管理员，在最右侧增加“管理后台”入口（在退出登录按钮的右边）
      const adminLink = this.user.is_staff ? `
        <li style="margin-left: 8px;">
          <a href="/admin-page/" 
          class="btn btn-primary"
          style="
            padding: 6px 16px; 
            font-size: 12px;
            color: #ffffff;
          "
          >
            管理后台
          </a>
        </li>
      ` : '';
      
      userMenuContainer.innerHTML = `
        <ul class="navbar-menu" style="margin: 0; align-items: center;">
          <li>
            <a href="/profile/" style="cursor: pointer;">
              欢迎，${escapeHtml(this.user.username)}
            </a>
          </li>
          <li>
            <button 
              onclick="auth.logout().then(() => location.reload())" 
              class="btn btn-secondary" 
              style="
                padding: 6px 16px; 
                font-size: 12px;
                /*border: 1px solid #ddd;*/
                color: #999;
              "
            >
              退出登录
            </button>
          </li>
          ${adminLink}
        </ul>
      `;
    } else {
      userMenuContainer.innerHTML = `
        <a href="/auth/" class="btn btn-primary" style="padding: 6px 16px; font-size: 12px;">
          <i class="fas fa-sign-in-alt"></i> 登录/注册
        </a>
      `;
    }
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      showNotification('请先登录', 'error');
      setTimeout(() => {
        window.location.href = '/auth/?redirect=' + encodeURIComponent(window.location.pathname);
      }, 1500);
      return false;
    }
    return true;
  }
}

// 创建全局认证管理器实例
const auth = new AuthManager();

// 工具函数：为API请求添加认证头
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (auth.isAuthenticated()) {
    headers['Authorization'] = `Token ${auth.getToken()}`;
  }
  
  return headers;
}
