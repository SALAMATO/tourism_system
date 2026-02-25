// 互动交流平台逻辑

let currentSort = 'latest'; // latest, hot, replied
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentReplyMessageId = null;

const postModal = new Modal('post-modal');
const commentsModal = new Modal('comments-modal');

document.addEventListener('DOMContentLoaded', () => {
  initPostButton();
  initSortTabs();
  initMessageForm();
  initInfiniteScroll();
  loadMessages();
});

// 初始化发帖按钮
function initPostButton() {
  const postBtn = document.getElementById('post-btn');
  postBtn.addEventListener('click', () => {
    if (!auth.requireAuth()) {
      return;
    }
    postModal.open();
  });
}

// 初始化排序选项卡
function initSortTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSort = tab.dataset.sort;
      currentPage = 1;
      hasMore = true;
      loadMessages(true);
    });
  });
}

// 初始化发帖表单
function initMessageForm() {
  const form = document.getElementById('message-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitMessage();
  });
}

// 初始化无限滚动
function initInfiniteScroll() {
  window.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // 距离底部200px时加载
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      currentPage++;
      loadMessages(false);
    }
  });
}

// 提交留言
async function submitMessage() {
  if (!auth.requireAuth()) {
    return;
  }

  const messageType = document.getElementById('message-type').value;
  const content = document.getElementById('content').value.trim();
  
  if (!content) {
    showNotification('请输入内容', 'error');
    return;
  }
  
  try {
    const data = {
      message_type: messageType,
      content: content,
      status: '待回复'
    };
    
    await api.createMessage(data);
    showNotification('发布成功', 'success');
    
    // 清空表单
    document.getElementById('message-form').reset();
    postModal.close();
    
    // 刷新列表
    currentPage = 1;
    hasMore = true;
    loadMessages(true);
  } catch (error) {
    console.error('发布失败:', error);
    showNotification('发布失败：' + error.message, 'error');
  }
}

// 加载留言列表
async function loadMessages(reset = false) {
  if (isLoading) return;
  isLoading = true;
  
  const container = document.getElementById('messages-container');
  const loadMoreEl = document.getElementById('load-more');
  
  try {
    if (reset) {
      container.innerHTML = '<div class="loading"><div class="spinner"></div><div>加载中...</div></div>';
      currentPage = 1;
    } else {
      loadMoreEl.style.display = 'block';
    }
    
    // 构建排序参数
    let sort = '-created_at'; // 默认最新
    if (currentSort === 'hot') {
      sort = '-likes_count';
    }
    
    const response = await api.getMessages({ 
      page: currentPage,
      limit: 10, 
      sort: sort 
    });
    
    if (response.data && response.data.length > 0) {
      // 过滤掉被屏蔽的留言
      let filteredData = response.data.filter(msg => !msg.is_hidden);
      
      // 如果是"已回复"筛选
      if (currentSort === 'replied') {
        filteredData = filteredData.filter(msg => msg.status === '已回复');
      }
      
      if (filteredData.length > 0) {
        if (reset) {
          // 清空容器后直接渲染，不显示加载中
          container.innerHTML = '';
          renderMessages(container, filteredData);
        } else {
          appendMessages(container, filteredData);
        }
        
        // 检查是否还有更多
        if (filteredData.length < 10) {
          hasMore = false;
        }
      } else {
        if (reset) {
          container.innerHTML = '<div class="loading"><div>暂无动态</div></div>';
        }
        hasMore = false;
      }
    } else {
      if (reset) {
        container.innerHTML = '<div class="loading"><div>暂无动态</div></div>';
      }
      hasMore = false;
    }
  } catch (error) {
    console.error('加载留言失败:', error);
    if (reset) {
      container.innerHTML = '<div class="loading"><div>加载失败，请刷新重试</div></div>';
    }
  } finally {
    isLoading = false;
    loadMoreEl.style.display = 'none';
  }
}

// 渲染留言列表
function renderMessages(container, messages) {
  container.innerHTML = messages.map(msg => createMessageCard(msg)).join('');
}

// 追加留言
function appendMessages(container, messages) {
  const html = messages.map(msg => createMessageCard(msg)).join('');
  container.insertAdjacentHTML('beforeend', html);
}

// 创建留言卡片
function createMessageCard(msg) {
  const user = auth.getUser();
  const isLiked = msg.user_liked;
  const isOwner = user && user.id === msg.user;
  
  // 处理内容显示（最多200字）
  const content = escapeHtml(msg.content);
  const needsExpand = content.length > 200;
  const shortContent = needsExpand ? content.substring(0, 200) + '...' : content;
  
  return `
    <div class="card message-card" style="margin-bottom: 20px;" data-id="${msg.id}">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 18px; margin-bottom: 8px;">
            <i class="fas fa-user-circle"></i> ${escapeHtml(msg.user_nickname || '匿名用户')}
          </h3>
          <div class="list-item-meta">
            <span><i class="fas fa-tag"></i> ${escapeHtml(msg.message_type)}</span>
            <span><i class="fas fa-clock"></i> ${formatRelativeTime(new Date(msg.created_at).getTime())}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
            ${escapeHtml(msg.status)}
          </span>
          ${isOwner ? `
            <div class="dropdown-menu">
              <button class="dropdown-toggle" onclick="toggleDropdown(event, '${msg.id}')">
                <i class="fas fa-ellipsis-h"></i>
              </button>
              <div class="dropdown-content" id="dropdown-${msg.id}">
                <button class="dropdown-item danger" onclick="deleteMessage('${msg.id}')">
                  <i class="fas fa-trash"></i> 删除
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="message-content-box" style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <p class="preserve-whitespace message-content-text" style="line-height: 1.6; margin: 0;" data-full="${content}" data-short="${shortContent}">${linkify(needsExpand ? shortContent : content)}</p>${needsExpand ? `
          <button class="btn-expand" onclick="toggleContent(event, '${msg.id}')" style="margin-top: 8px; color: var(--primary-color); background: none; border: none; cursor: pointer; font-size: 14px;">
            <i class="fas fa-chevron-down"></i> 显示更多
          </button>
        ` : ''}
      </div>
      
      ${msg.reply ? `
        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-shield-alt"></i> 官方回复：</strong>
          <p class="preserve-whitespace" style="margin: 8px 0 0 0; line-height: 1.6;">${escapeHtml(msg.reply)}</p>
        </div>
      ` : ''}
      
      <div class="actions-bar">
        <div style="display: flex; gap: 12px; align-items: center;"> 
          <button 
            onclick="openCommentsModal('${msg.id}')" 
            class="btn btn-reply"
            style="display: flex; align-items: center; gap: 6px;"> 
            <i class="fa-solid fa-reply"></i>
            回复
          </button> 
          
          <button 
            onclick="showComments('${msg.id}')" 
            class="btn btn-comments"> 
            <i class="fa-solid fa-comments"></i>
            查看评论 (${msg.comments_count || 0})
          </button> 
          
          <button 
            onclick="toggleLike('${msg.id}', ${isLiked})" 
            class="btn btn-like ${isLiked ? 'liked' : ''}" 
            style="display: flex; align-items: center; gap: 6px;"> 
            <i class="fas fa-heart"></i> 
            <span>${msg.likes_count || 0}</span> 
          </button> 
        </div> 
      </div>
      
      <div class="comments-section" id="comments-${msg.id}" style="display: none; margin-top: 16px;">
        <!-- 评论将动态加载 -->
      </div>
    </div>
  `;
}
// 链接高亮
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    '<a href="$1" target="_blank" class="linkified">$1</a>'
  );
}

// 切换点赞
async function toggleLike(messageId, isLiked) {
  if (!auth.requireAuth()) return;

  try {
    if (isLiked) {
      await api.unlikeMessage(messageId);
    } else {
      await api.likeMessage(messageId);
    }

    // 刷新点赞状态和列表
    currentPage = 1;
    hasMore = true;
    loadMessages(true);
  } catch (error) {
    console.error("点赞操作失败:", error);
    showNotification(error.message || "操作失败", "error");
  }
}

// 打开评论弹窗
async function openCommentsModal(messageId) {
  if (!auth.requireAuth()) return;

  try {
    currentReplyMessageId = messageId;
    const message = await api.getMessage(messageId);
    
    // 处理内容显示（最多200字）
    const content = message.content;
    const needsExpand = content.length > 200;
    const shortContent = needsExpand ? content.substring(0, 200) + '...' : content;

    document.getElementById("comments-message-info").innerHTML = `
      <div style="padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
            <i class="fas fa-user"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              ${escapeHtml(message.user_nickname || "匿名用户")}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
              ${formatRelativeTime(new Date(message.created_at).getTime())}
            </div>
          </div>
        </div>
        <p class="preserve-whitespace modal-content-text" style="line-height: 1.7; color: var(--text-primary); margin: 0; font-size: 15px;" data-full="${escapeHtml(content)}" data-short="${escapeHtml(shortContent)}">${escapeHtml(needsExpand ? shortContent : content)}</p>${needsExpand ? `
        <button class="btn-expand-modal" onclick="toggleModalContent()" style="margin-top: 12px; color: var(--primary-color); background: none; border: none; cursor: pointer; font-size: 14px; padding: 0; font-weight: 500;">
          <i class="fas fa-chevron-down"></i> 显示更多
        </button>
        ` : ''}
      </div>
    `;

    document.getElementById("comment-content").value = "";
    commentsModal.open();

    await loadCommentsInModal(messageId);
  } catch (error) {
    console.error("加载留言失败:", error);
    showNotification("加载失败", "error");
  }
}

// 提交评论
async function submitComment() {
  const content = document.getElementById("comment-content").value.trim();
  if (!content) {
    showNotification("请输入评论内容", "error");
    return;
  }

  try {
    await api.addComment(currentReplyMessageId, content);
    showNotification("评论成功", "success");
    document.getElementById("comment-content").value = "";

    await loadCommentsInModal(currentReplyMessageId);

    currentPage = 1;
    hasMore = true;
    loadMessages(true);
  } catch (error) {
    console.error("评论失败:", error);
    showNotification("评论失败：" + error.message, "error");
  }
}

// 在弹窗中加载评论
async function loadCommentsInModal(messageId) {
  try {
    const comments = await api.getMessageComments(messageId);
    const container = document.getElementById("comments-list-container");
    if (!container) return;

    if (comments.length > 0) {
      container.innerHTML = `
        <div style="margin-top: 24px;">
          <h4 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">
            全部评论 (${comments.length})
          </h4>
          ${comments
            .map((comment) => {
              const isOfficial = comment.user_is_staff;
              return `
                <div class="modal-comment-item" style="padding: 16px 0; border-bottom: 1px solid var(--border-color);">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isOfficial ? 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))' : 'var(--background-secondary)'}; display: flex; align-items: center; justify-content: center; color: ${isOfficial ? 'white' : 'var(--text-secondary)'}; font-size: 14px;">
                      <i class="fas fa-user"></i>
                    </div>
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 500; color: var(--text-primary);">${escapeHtml(comment.user_nickname || "匿名用户")}</span>
                        ${isOfficial ? '<span class="tag primary" style="font-size: 11px; padding: 2px 8px;">官方</span>' : ""}
                      </div>
                      <span style="color: var(--text-secondary); font-size: 12px;">
                        ${formatRelativeTime(new Date(comment.created_at).getTime())}
                      </span>
                    </div>
                  </div>
                  <p class="preserve-whitespace" style="margin: 0 0 0 44px; line-height: 1.6; font-size: 14px; color: var(--text-primary);">${escapeHtml(comment.content)}</p>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    } else {
      container.innerHTML =
        '<div style="padding: 60px 0; text-align: center;"><div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">💬</div><div style="color: var(--text-secondary); font-size: 14px;">还没有评论，快来抢沙发吧</div></div>';
    }
  } catch (error) {
    console.error("加载评论失败:", error);
  }
}

// 显示/隐藏卡片内评论区
async function showComments(messageId) {
  const container = document.getElementById(`comments-${messageId}`);
  if (!container) return;

  if (container.style.display === "block") {
    container.style.display = "none";
  } else {
    container.style.display = "block";
    await loadCommentsInline(messageId);
  }
}

// 在卡片内加载评论
async function loadCommentsInline(messageId) {
  try {
    const comments = await api.getMessageComments(messageId);
    const container = document.getElementById(`comments-${messageId}`);
    if (!container) return;

    if (comments.length > 0) {
      container.innerHTML = `
        <div class="inline-comments" style="padding: 16px; background: var(--background-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
          <h4 style="margin-bottom: 16px; font-size: 16px;">评论 (${comments.length})</h4>
          ${comments
            .map((comment) => {
              const isOfficial = comment.user_is_staff;
              return `
                <div class="comment-item-inline ${isOfficial ? "official" : ""}" style="margin-bottom: 12px; padding: 12px; background: var(--background); border-radius: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <i class="fas fa-user-circle" style="color: var(--text-secondary); font-size: 14px;"></i>
                    <span class="comment-author-name" style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(comment.user_nickname || "匿名用户")}</span>
                    ${isOfficial ? '<span class="tag primary" style="font-size: 11px;">官方回复</span>' : ""}
                    <span class="comment-time" style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">
                      ${formatRelativeTime(new Date(comment.created_at).getTime())}
                    </span>
                  </div>
                  <p class="preserve-whitespace" style="margin: 0; line-height: 1.6; font-size: 14px; color: var(--text-primary);">${escapeHtml(comment.content)}</p>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    } else {
      container.innerHTML =
        '<div class="no-comments" style="padding: 16px; text-align: center; color: var(--text-secondary);">暂无评论</div>';
    }
  } catch (error) {
    console.error("加载评论失败:", error);
  }
}

// 切换内容展开/收起
function toggleContent(event, messageId) {
  event.stopPropagation();
  const card = document.querySelector(`[data-id="${messageId}"]`);
  const contentEl = card.querySelector('.message-content-text');
  const btnEl = event.currentTarget;
  const fullContent = contentEl.dataset.full;
  const shortContent = contentEl.dataset.short;
  
  if (btnEl.classList.contains('expanded')) {
    contentEl.innerHTML = linkify(shortContent);
    btnEl.innerHTML = '<i class="fas fa-chevron-down"></i> 显示更多';
    btnEl.classList.remove('expanded');
  } else {
    contentEl.innerHTML = linkify(fullContent);
    btnEl.innerHTML = '<i class="fas fa-chevron-up"></i> 收起';
    btnEl.classList.add('expanded');
  }
}

// 切换下拉菜单
function toggleDropdown(event, messageId) {
  event.stopPropagation();
  const dropdown = document.getElementById(`dropdown-${messageId}`);
  
  // 关闭所有其他下拉菜单
  document.querySelectorAll('.dropdown-content').forEach(d => {
    if (d.id !== `dropdown-${messageId}`) {
      d.classList.remove('show');
    }
  });
  
  dropdown.classList.toggle('show');
}

// 删除留言
async function deleteMessage(messageId) {
  const confirmed = await showConfirm({
    title: '删除动态',
    message: '确定要删除这条动态吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) {
    return;
  }
  
  try {
    await api.deleteMessage(messageId);
    showNotification('删除成功', 'success');
    
    // 刷新列表
    currentPage = 1;
    hasMore = true;
    loadMessages(true);
  } catch (error) {
    console.error('删除失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 点击页面其他地方关闭下拉菜单
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-content').forEach(d => {
    d.classList.remove('show');
  });
});

// 切换弹窗内容展开/收起
function toggleModalContent() {
  const contentEl = document.querySelector('.modal-content-text');
  const btnEl = document.querySelector('.btn-expand-modal');
  const fullContent = contentEl.dataset.full;
  const shortContent = contentEl.dataset.short;
  
  if (btnEl.classList.contains('expanded')) {
    contentEl.textContent = shortContent;
    btnEl.innerHTML = '<i class="fas fa-chevron-down"></i> 显示更多';
    btnEl.classList.remove('expanded');
  } else {
    contentEl.textContent = fullContent;
    btnEl.innerHTML = '<i class="fas fa-chevron-up"></i> 收起';
    btnEl.classList.add('expanded');
  }
}


