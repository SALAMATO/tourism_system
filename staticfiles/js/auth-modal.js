// 登录注册弹窗管理
const authModal = {
  modal: null,
  currentTab: 'login',

  init() {
    // 创建弹窗HTML
    this.createModal();
    // 绑定事件
    this.bindEvents();
  },

  createModal() {
    const modalHTML = `
      <div id="auth-modal" class="auth-modal">
        <div class="auth-modal-content">
          <button class="auth-modal-close" onclick="authModal.close()">
            <i class="fas fa-times"></i>
          </button>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">登录</button>
            <button class="auth-tab" data-tab="register">注册</button>
          </div>

          <!-- 登录表单 -->
          <form id="modal-login-form" class="auth-form active">
            <h2 class="auth-title">欢迎回来</h2>
            <p style="text-align: center; color: var(--text-secondary); font-size: 14px; margin-bottom: 20px;">
              支持用户名、邮箱或手机号登录
            </p>
            
            <div class="form-group">
              <label class="form-label">账号</label>
              <input type="text" id="modal-login-account" class="form-input" required placeholder="请输入用户名/邮箱/手机号">
              <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                支持用户名、邮箱或手机号登录
              </small>
            </div>
            
            <div class="form-group">
              <label class="form-label">密码</label>
              <input type="password" id="modal-login-password" class="form-input" required placeholder="请输入密码">
            </div>
            
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-sign-in-alt"></i> 登录
            </button>
            
            <div class="auth-footer">
              还没有账号？<a onclick="authModal.switchTab('register')">立即注册</a>
            </div>
          </form>

          <!-- 注册表单 -->
          <form id="modal-register-form" class="auth-form">
            <h2 class="auth-title">创建账号</h2>
            
            <div class="form-group">
              <label class="form-label">用户名 *</label>
              <input type="text" id="modal-register-username" class="form-input" required placeholder="请输入用户名">
            </div>
            
            <div class="form-group">
              <label class="form-label">邮箱 *</label>
              <input type="email" id="modal-register-email" class="form-input" required placeholder="请输入邮箱">
            </div>
            
            <div class="form-group">
              <label class="form-label">手机号（选填）</label>
              <input type="tel" id="modal-register-phone" class="form-input" placeholder="请输入手机号">
            </div>
            
            <div class="form-group">
              <label class="form-label">密码 *</label>
              <input type="password" id="modal-register-password" class="form-input" required placeholder="至少6位字符" minlength="6">
            </div>
            
            <div class="form-group">
              <label class="form-label">确认密码 *</label>
              <input type="password" id="modal-register-password-confirm" class="form-input" required placeholder="请再次输入密码" minlength="6">
            </div>
            
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-user-plus"></i> 注册
            </button>
            
            <div class="auth-footer">
              已有账号？<a onclick="authModal.switchTab('login')">立即登录</a>
            </div>
          </form>
        </div>
      </div>
    `;

    // 添加到body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('auth-modal');
  },

  bindEvents() {
    // 标签切换
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // 点击背景关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.close();
      }
    });

    // 登录表单提交
    document.getElementById('modal-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    // 注册表单提交
    document.getElementById('modal-register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // 更新标签状态
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // 更新表单显示
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.toggle('active', form.id === `modal-${tabName}-form`);
    });
  },

  open(tab = 'login') {
    this.switchTab(tab);
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
    // 清空表单
    document.getElementById('modal-login-form').reset();
    document.getElementById('modal-register-form').reset();
  },

  async handleLogin() {
    const account = document.getElementById('modal-login-account').value.trim();
    const password = document.getElementById('modal-login-password').value;
    
    if (!account || !password) {
      showNotification('请填写所有字段', 'error');
      return;
    }
    
    try {
      await auth.login(account, password);
      showNotification('登录成功', 'success');
      this.close();
      
      // 刷新页面或更新用户菜单
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('登录失败:', error);
      showNotification(error.message || '登录失败，请检查账号和密码', 'error');
    }
  },

  async handleRegister() {
    const username = document.getElementById('modal-register-username').value.trim();
    const email = document.getElementById('modal-register-email').value.trim();
    const phone = document.getElementById('modal-register-phone').value.trim();
    const password = document.getElementById('modal-register-password').value;
    const passwordConfirm = document.getElementById('modal-register-password-confirm').value;
    
    if (!username || !email || !password || !passwordConfirm) {
      showNotification('请填写所有必填字段', 'error');
      return;
    }
    
    if (password !== passwordConfirm) {
      showNotification('两次密码输入不一致', 'error');
      return;
    }
    
    if (password.length < 6) {
      showNotification('密码至少需要6位字符', 'error');
      return;
    }
    
    try {
      await auth.register(username, email, password, passwordConfirm, phone);
      showNotification('注册成功，正在登录...', 'success');
      this.close();
      
      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('注册失败:', error);
      try {
        const errorObj = JSON.parse(error.message);
        const errorMsg = Object.values(errorObj).flat().join(', ');
        showNotification(`注册失败: ${errorMsg}`, 'error');
      } catch {
        showNotification('注册失败，请稍后重试', 'error');
      }
    }
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  authModal.init();
});



