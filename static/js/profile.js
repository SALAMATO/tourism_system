// 个人主页逻辑

document.addEventListener('DOMContentLoaded', async () => {
  // 必须先登录
  if (!auth.requireAuth()) {
    return;
  }

  initPasswordForm();
  initProfileForm();
  await loadProfileInfo();
  await loadMyMessages();
});

async function loadProfileInfo() {
  const container = document.getElementById('profile-info');
  try {
    showLoading(container);
    // 优先从本地缓存获取
    let user = auth.getUser();
    if (!user) {
      user = await auth.getCurrentUser();
    }
    if (!user) {
      container.innerHTML = '<div class="loading"><div>未获取到用户信息，请重新登录。</div></div>';
      return;
    }

    // 填充表单
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';

    const html = `
      <div class="list-item" style="border: none; padding: 0;">
        <div class="list-item-header">
          <div>
            <h3>${escapeHtml(user.username)}</h3>
            <div class="list-item-meta">
              <span><i class="fas fa-envelope"></i> ${escapeHtml(user.email || '未填写')}</span>
              <span><i class="fas fa-phone"></i> ${escapeHtml(user.phone || '未填写')}</span>
            </div>
          </div>
          ${user.is_staff ? '<span class="tag primary">管理员</span>' : '<span class="tag">普通用户</span>'}
        </div>
        <div class="card-content">
          <p>注册时间：${formatDateTime(user.date_joined)}</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error('加载个人信息失败:', error);
    showError(container, '加载个人信息失败，请稍后重试');
  }
}

function initPasswordForm() {
  const form = document.getElementById('password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitPasswordChange();
  });
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitProfileUpdate();
  });
}

async function submitProfileUpdate() {
  const email = document.getElementById('profile-email').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();

  if (!email) {
    showNotification('邮箱不能为空', 'error');
    return;
  }

  try {
    const response = await api.request('http://127.0.0.1:8000/api/user/update_profile/', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        phone: phone
      })
    });
    
    showNotification('个人信息修改成功', 'success');
    
    // 更新本地缓存的用户信息
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    // 重新加载个人信息
    await loadProfileInfo();
  } catch (error) {
    console.error('修改个人信息失败:', error);
    showNotification(error.message || '修改个人信息失败，请稍后重试', 'error');
  }
}

async function submitPasswordChange() {
  const oldPwd = document.getElementById('old-password').value;
  const newPwd = document.getElementById('new-password').value;
  const newPwd2 = document.getElementById('new-password-confirm').value;

  if (!oldPwd || !newPwd || !newPwd2) {
    showNotification('请填写所有密码字段', 'error');
    return;
  }
  if (newPwd.length < 6) {
    showNotification('新密码至少需要6位字符', 'error');
    return;
  }
  if (newPwd !== newPwd2) {
    showNotification('两次新密码输入不一致', 'error');
    return;
  }

  try {
    const response = await api.request('http://127.0.0.1:8000/api/user/change_password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPwd,
        new_password: newPwd
      })
    });
    console.log('修改密码结果:', response);
    showNotification('密码修改成功，请使用新密码重新登录', 'success');
    // 修改密码后安全起见清除登录状态
    await auth.logout();
    setTimeout(() => {
      window.location.href = '/auth/';
    }, 1500);
  } catch (error) {
    console.error('修改密码失败:', error);
    showNotification('修改密码失败，请检查原密码是否正确', 'error');
  }
}

async function loadMyMessages() {
  const container = document.getElementById('my-messages-container');
  try {
    showLoading(container);
    const response = await api.request('http://127.0.0.1:8000/api/messages/my/');
    const messages = Array.isArray(response) ? response : (response.data || []);

    if (!messages.length) {
      container.innerHTML = '<div class="loading"><div>您还没有发表过留言</div></div>';
      return;
    }

    const html = messages.map(msg => `
      <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; margin-bottom: 8px;">
              <i class="fas fa-comment-dots"></i> ${escapeHtml(msg.message_type || '留言')}
            </h3>
            <div class="list-item-meta">
              <span><i class="fas fa-clock"></i> ${formatDateTime(msg.created_at)}</span>
              <span><i class="fas fa-info-circle"></i> ${escapeHtml(msg.status || '待回复')}</span>
            </div>
          </div>
          <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
            ${escapeHtml(msg.status || '待回复')}
          </span>
        </div>

        <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
          <strong>我的留言：</strong>
          <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.content || '')}</p>
        </div>

        ${msg.reply ? `
          <div style="padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
            <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
            <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.reply || '')}</p>
          </div>
        ` : ''}
      </div>
    `).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('加载我的留言失败:', error);
    showError(container, '加载我的留言失败，请稍后重试');
  }
}

