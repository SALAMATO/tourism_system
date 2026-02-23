// 互动交流平台逻辑

let currentStatus = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initStatusTabs();
  loadMessages();
});

function initForm() {
  const form = document.getElementById('message-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitMessage();
  });
}

function initStatusTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.dataset.status;
      loadMessages();
    });
  });
}

async function submitMessage() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const messageType = document.getElementById('message-type').value;
  const content = document.getElementById('content').value.trim();
  
  if (!username || !email || !messageType || !content) {
    showNotification('请填写所有必填字段', 'error');
    return;
  }
  
  try {
    const data = {
      username,
      email,
      message_type: messageType,
      content,
      reply: '',
      status: '待回复'
      // created_at 由后端自动生成
    };
    
    console.log('提交留言数据:', data);
    await api.createMessage(data);
    showNotification('提交成功，我们会尽快回复您', 'success');
    
    // 清空表单
    document.getElementById('message-form').reset();
    
    // 刷新列表
    loadMessages();
  } catch (error) {
    console.error('提交留言失败:', error);
    showNotification('提交失败：' + error.message, 'error');
  }
}

async function loadMessages() {
  const container = document.getElementById('messages-container');
  
  try {
    showLoading(container);
    const response = await api.getMessages({ limit: 50, sort: '-created_at' });
    
    if (response.data && response.data.length > 0) {
      let filteredData = response.data;
      if (currentStatus !== 'all') {
        filteredData = response.data.filter(msg => msg.status === currentStatus);
      }
      
      if (filteredData.length > 0) {
        renderMessages(container, filteredData);
      } else {
        container.innerHTML = '<div class="loading"><div>未找到相关留言</div></div>';
      }
    } else {
      container.innerHTML = '<div class="loading"><div>暂无留言</div></div>';
    }
  } catch (error) {
    console.error('加载留言失败:', error);
    showError(container);
  }
}

function renderMessages(container, messages) {
  const html = messages.map(msg => `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 20px; margin-bottom: 8px;">
            <i class="fas fa-user-circle"></i> ${escapeHtml(msg.username)}
          </h3>
          <div class="list-item-meta">
            <span><i class="fas fa-envelope"></i> ${escapeHtml(msg.email)}</span>
            <span><i class="fas fa-tag"></i> ${escapeHtml(msg.message_type)}</span>
            <span><i class="fas fa-clock"></i> ${formatRelativeTime(new Date(msg.created_at).getTime())}</span>
          </div>
        </div>
        <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
          ${escapeHtml(msg.status)}
        </span>
      </div>
      
      <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <strong>问题/建议：</strong>
        <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.content)}</p>
      </div>
      
      ${msg.reply ? `
        <div style="padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
          <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.reply)}</p>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = html;
}