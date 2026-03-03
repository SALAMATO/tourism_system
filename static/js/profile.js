// 个人主页逻辑
let currentReplyingMessageId = null;
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
    document.getElementById('profile-nickname').value = user.nickname || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';

    // 获取统计数据
    const stats = await loadUserStats();

    const html = `
      <div class="list-item" style="border: none; padding: 0;">
        <div class="list-item-header">
          <div>
            <h3>${escapeHtml(user.nickname || user.username)}</h3>
            <div class="list-item-meta">
              <span><i class="fas fa-user"></i> 账号：${escapeHtml(user.username)}</span>
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
      
      <div class="stats-card" style="margin-top: 20px;">
        <div class="stat-item">
          <div class="stat-item-value">${stats.totalLikes}</div>
          <div class="stat-item-label">获得点赞</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-value">${stats.totalComments}</div>
          <div class="stat-item-label">获得评论</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-value">${stats.totalPosts}</div>
          <div class="stat-item-label">发布动态</div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error('加载个人信息失败:', error);
    showError(container, '加载个人信息失败，请稍后重试');
  }
}

async function loadUserStats() {
  try {
    const response = await api.request('http://127.0.0.1:8000/api/messages/my/');
    const messages = Array.isArray(response) ? response : (response.data || []);
    
    let totalLikes = 0;
    let totalComments = 0;
    
    for (const msg of messages) {
      totalLikes += msg.likes_count || 0;
      totalComments += msg.comments_count || 0;
    }
    
    return {
      totalLikes,
      totalComments,
      totalPosts: messages.length
    };
  } catch (error) {
    console.error('加载统计数据失败:', error);
    return {
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0
    };
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
  const nickname = document.getElementById('profile-nickname').value.trim();
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
        nickname: nickname,
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
      <div class="card" style="margin-bottom: 20px;" data-message-id="${msg.id}">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; margin-bottom: 8px;">
              <i class="fas fa-comment-dots"></i> ${escapeHtml(msg.message_type || '留言')}
            </h3>
            <div class="list-item-meta">
              <span><i class="fas fa-clock"></i> ${formatDateTime(msg.created_at)}</span>
              <span><i class="fas fa-heart"></i> ${msg.likes_count || 0} 点赞</span>
              <span><i class="fas fa-comment"></i> ${msg.comments_count || 0} 评论</span>
            </div>
          </div>
          <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
            ${escapeHtml(msg.status || '待回复')}
          </span>
        </div>

        <div class="rich-text-content" style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
          <strong>我的留言：</strong>
          <div style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.content || '')}</div>
        </div>

        ${msg.reply ? `
          <div class="rich-text-content" style="padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color); margin-bottom: 16px;">
            <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
            <div style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.reply || '')}</div>
          </div>
        ` : ''}

        <div class="post-actions">
          <button 
            onclick="openReplyCommentModal('${msg.id}')" 
            class="btn btn-reply"
            style="display: flex; align-items: center; gap: 6px;"> 
            <i class="fa-solid fa-reply"></i>
            回复
          </button>
          <button 
            onclick="togglePostComments('${msg.id}')" 
            class="btn btn-comments "> 
            <i class="fa-solid fa-comments"></i>
            查看评论 (${msg.comments_count || 0})
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-toggle" onclick="toggleDropdown('post-menu-${msg.id}')">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-content" id="post-menu-${msg.id}">
              <button class="dropdown-item danger" onclick="deleteMyPost('${msg.id}')">
                <i class="fas fa-trash"></i> 删除帖子
              </button>
            </div>
          </div>
        </div>

        <div id="post-comments-${msg.id}" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
          <!-- 评论将动态加载 -->
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('加载我的留言失败:', error);
    showError(container, '加载我的留言失败，请稍后重试');
  }
}

// 切换显示评论
async function togglePostComments(messageId) {
  const container = document.getElementById(`post-comments-${messageId}`);
  if (!container) return;
  
  if (container.style.display === 'none') {
    container.style.display = 'block';
    await loadPostComments(messageId);
  } else {
    container.style.display = 'none';
  }
}

// 加载帖子的评论
async function loadPostComments(messageId) {
  const container = document.getElementById(`post-comments-${messageId}`);
  if (!container) return;
  
  try {
    const comments = await api.getMessageComments(messageId);
    const user = auth.getUser();
    
    if (comments && comments.length > 0) {
      const html = `
        <h4 style="margin-bottom: 12px; font-size: 16px;">评论列表</h4>
        ${comments.map(comment => `
          <div class="comment-item">
            <div class="comment-header">
              <div class="comment-author">
                <i class="fas fa-user-circle"></i> ${escapeHtml(comment.user_nickname || '匿名用户')}
                ${comment.user_is_staff ? '<span class="tag primary" style="margin-left: 8px; font-size: 12px;">官方回复</span>' : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="comment-time">${formatRelativeTime(new Date(comment.created_at).getTime())}</div>
                ${user && user.is_staff ? `
                  <div class="dropdown-menu">
                    <button class="dropdown-toggle" onclick="toggleDropdown('comment-menu-${comment.id}')" style="padding: 4px 8px; font-size: 14px;">
                      <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-content" id="comment-menu-${comment.id}">
                      <button class="dropdown-item danger" onclick="deletePostComment('${comment.id}', '${messageId}')">
                        <i class="fas fa-trash"></i> 删除评论
                      </button>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="comment-content rich-text-content">${formatRichTextContent(comment.content)}</div>
          </div>
        `).join('')}
      `;
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 16px;">暂无评论</div>';
    }
  } catch (error) {
    console.error('加载评论失败:', error);
    container.innerHTML = '<div style="text-align: center; color: var(--danger-color); padding: 16px;">加载评论失败</div>';
  }
}



// 删除自己的帖子
async function deleteMyPost(messageId) {
  if (!confirm('确定要删除这条帖子吗？删除后无法恢复。')) {
    return;
  }
  
  try {
    await api.deleteMessage(messageId);
    showNotification('删除成功', 'success');
    await loadMyMessages();
  } catch (error) {
    console.error('删除失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 删除评论
async function deletePostComment(commentId, messageId) {
  if (!confirm('确定要删除这条评论吗？')) {
    return;
  }
  
  try {
    await api.deleteComment(commentId);
    showNotification('删除成功', 'success');
    await loadPostComments(messageId);
    await loadMyMessages(); // 刷新评论数
  } catch (error) {
    console.error('删除评论失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 显示回复模态框
function openReplyCommentModal(messageId) {
  currentReplyingMessageId = messageId;
  
  // 创建模态框HTML（如果不存在）
  let modal = document.getElementById('reply-comment-modal');
  if (!modal) {
    const modalHtml = `
      <div class="modal" id="reply-comment-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">回复评论</h2>
            <button class="modal-close" onclick="closeReplyCommentModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">评论内容</label>
              <textarea id="reply-comment-content" class="form-textarea" placeholder="输入您的回复..." rows="4"></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
            <button class="btn btn-secondary" onclick="closeReplyCommentModal()">取消</button>
            <button class="btn btn-primary" onclick="submitReplyComment()">提交回复</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('reply-comment-modal');
    
    // 初始化CKEditor
    if (window.CKEditorHelper) {
      setTimeout(() => {
        window.CKEditorHelper.initEditor('reply-comment-content');
      }, 100);
    }
  }
  
  // 清空内容并显示
  document.getElementById('reply-comment-content').value = '';
  
  // 如果编辑器已存在，清空内容
  if (window.CKEditorHelper) {
    setTimeout(() => {
      window.CKEditorHelper.clearContent('reply-comment-content');
    }, 50);
  }
  
  modal.classList.add('active');
}

function closeReplyCommentModal() {
  const modal = document.getElementById('reply-comment-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  currentReplyingMessageId = null;
}

async function submitReplyComment() {
  const content = document.getElementById('reply-comment-content').value.trim();
  
  if (!content) {
    showNotification('请输入回复内容', 'error');
    return;
  }
  
  if (!currentReplyingMessageId) {
    showNotification('无效的留言ID', 'error');
    return;
  }
  
  try {
    await api.addComment(currentReplyingMessageId, content);
    showNotification('回复成功', 'success');
    
    // 清空CKEditor
    if (window.CKEditorHelper) {
      window.CKEditorHelper.clearContent('reply-comment-content');
    }
    
    closeReplyCommentModal();
    await loadMyMessages();
  } catch (error) {
    console.error('回复失败:', error);
    showNotification('回复失败：' + error.message, 'error');
  }
}
function toggleEditProfile() {
  const content = document.getElementById('edit-profile-content');
  const icon = document.getElementById('edit-profile-icon');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('active');
    icon.style.transform = 'rotate(180deg)';
  }
}

// 切换下拉菜单
function toggleDropdown(menuId) {
  // 关闭所有其他下拉菜单
  document.querySelectorAll('.dropdown-content').forEach(menu => {
    if (menu.id !== menuId) {
      menu.classList.remove('show');
    }
  });
  
  // 切换当前菜单
  const menu = document.getElementById(menuId);
  if (menu) {
    menu.classList.toggle('show');
  }
}

// 点击外部关闭下拉菜单
document.addEventListener('click', function(event) {
  if (!event.target.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown-content').forEach(menu => {
      menu.classList.remove('show');
    });
  }
});

