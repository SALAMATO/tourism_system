// 互动交流平台逻辑

// 本地formatRichTextContent函数（避免依赖问题）
function formatRichTextContentLocal(content) {
  if (!content) return '暂无内容';
  
  console.log('[卡片评论] formatRichTextContent 输入:', content);
  
  // 如果内容已经是HTML格式（包含HTML标签），直接返回
  if (/<[^>]+>/.test(content)) {
    console.log('[卡片评论] 检测到HTML格式，直接返回');
    return content;
  }
  
  console.log('[卡片评论] 转换Markdown为HTML');
  
  // 否则，将Markdown格式转换为HTML
  let html = content;
  
  // 转换加粗 **文本** -> <strong>文本</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 转换段落（双换行符分隔）
  const paragraphs = html.split('\n\n');
  
  html = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    
    // 检查是否是标题（以<strong>开头和结尾）
    if (para.startsWith('<strong>') && para.endsWith('</strong>')) {
      const text = para.replace(/<\/?strong>/g, '');
      
      // 一级标题：一、二、三...
      if (/^[一二三四五六七八九十]+、/.test(text)) {
        return `<h2 style="font-size: 1.5em; font-weight: bold; margin: 1.5em 0 0.8em 0; color: #2c3e50;">${text}</h2>`;
      }
      // 二级标题：（一）（二）...
      else if (/^[（(][一二三四五六七八九十]+[）)]/.test(text)) {
        return `<h3 style="font-size: 1.3em; font-weight: bold; margin: 1.2em 0 0.6em 0; color: #34495e;">${text}</h3>`;
      }
      // 三级标题：1. 2. 3...
      else if (/^\d+[.、]/.test(text)) {
        return `<h4 style="font-size: 1.1em; font-weight: bold; margin: 1em 0 0.5em 0; color: #7f8c8d;">${text}</h4>`;
      }
      // 其他加粗文本
      else {
        return `<p style="margin: 0.8em 0; line-height: 1.8;"><strong style="color: #e74c3c; font-weight: bold;">${text}</strong></p>`;
      }
    }
    
    // 普通段落
    return `<p style="margin: 0.8em 0; line-height: 1.8;">${para}</p>`;
  }).join('');
  
  console.log('[卡片评论] formatRichTextContent 输出:', html);
  
  return html;
}

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
  
  // 初始化富文本编辑器
  setTimeout(() => {
    initCommunityEditors();
  }, 500);
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
  const content = document.getElementById('message-content').value.trim();
  
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
    
    // 清空CKEditor
    if (window.CKEditorHelper) {
      window.CKEditorHelper.clearContent('message-content');
    }
    
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
  const formattedContent = formatRichTextContent(msg.content);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = formattedContent;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  const needsExpand = textContent.length > 200;
  const shortContent = needsExpand ? formattedContent.substring(0, 400) + '...' : formattedContent;
  
  return `
    <div class="card message-card" style="margin-bottom: 20px;" data-message-id="${msg.id}" data-id="${msg.id}">
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
      
      <div class="message-content-box rich-text-content" style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <div class="message-content-text" style="line-height: 1.6; margin: 0;" data-full="${formattedContent}" data-short="${shortContent}">${linkify(needsExpand ? shortContent : formattedContent)}</div>${needsExpand ? `
          <button class="btn-expand" onclick="toggleContent(event, '${msg.id}')" style="margin-top: 8px; color: var(--primary-color); background: none; border: none; cursor: pointer; font-size: 14px;">
            <i class="fas fa-chevron-down"></i> 显示更多
          </button>
        ` : ''}
      </div>
      
      ${msg.reply ? `
        <div class="rich-text-content" style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-shield-alt"></i> 官方回复：</strong>
          <div style="margin: 8px 0 0 0; line-height: 1.6;">${formatRichTextContent(msg.reply)}</div>
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

    // 不重新加载整个列表，只更新当前留言卡片的点赞状态
    const messageCard = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageCard) {
      const likeBtn = messageCard.querySelector('.btn-like');
      const likeCount = messageCard.querySelector('.btn-like span');
      
      if (likeBtn && likeCount) {
        if (isLiked) {
          // 取消点赞
          likeBtn.classList.remove('liked');
          likeCount.textContent = parseInt(likeCount.textContent) - 1;
          // 更新onclick属性，将isLiked改为false
          likeBtn.setAttribute('onclick', `toggleLike('${messageId}', false)`);
        } else {
          // 点赞
          likeBtn.classList.add('liked');
          likeCount.textContent = parseInt(likeCount.textContent) + 1;
          // 更新onclick属性，将isLiked改为true
          likeBtn.setAttribute('onclick', `toggleLike('${messageId}', true)`);
        }
      }
    }
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
    
    // 构建留言信息HTML（参考管理后台样式）
    const infoHtml = `
      <div style="padding: 20px; background: var(--background-secondary); border-radius: 12px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">
            <i class="fas fa-user"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              ${escapeHtml(message.user_nickname || "匿名用户")}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
              <i class="fas fa-clock"></i> ${formatRelativeTime(new Date(message.created_at).getTime())}
              <span style="margin-left: 12px;"><i class="fas fa-tag"></i> ${escapeHtml(message.message_type || '留言')}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <span class="tag ${message.status === '已回复' ? 'success' : 'warning'}" style="font-size: 12px;">
              ${escapeHtml(message.status || '待回复')}
            </span>
          </div>
        </div>
        
        <div style="padding: 16px; background: var(--background); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <div style="font-weight: 500; margin-bottom: 8px; color: var(--text-secondary); font-size: 13px;">
            <i class="fas fa-comment-dots"></i> 留言内容
          </div>
          <div class="rich-text-content" style="line-height: 1.7; color: var(--text-primary); font-size: 14px;">
            ${formatRichTextContentLocal(message.content)}
          </div>
        </div>
        
        ${message.reply ? `
          <div style="margin-top: 12px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
            <div style="font-weight: 500; margin-bottom: 8px; color: var(--primary-color); font-size: 13px;">
              <i class="fas fa-reply"></i> 官方回复
            </div>
            <div class="rich-text-content" style="line-height: 1.7; color: var(--text-primary); font-size: 14px;">
              ${formatRichTextContentLocal(message.reply)}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 12px; display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
          <span><i class="fas fa-heart"></i> ${message.likes_count || 0} 点赞</span>
          <span><i class="fas fa-comment"></i> ${message.comments_count || 0} 评论</span>
        </div>
      </div>
    `;

    document.getElementById("comments-message-info").innerHTML = infoHtml;
    document.getElementById("comment-content").value = "";
    
    // 清空CKEditor
    if (window.CKEditorHelper) {
      window.CKEditorHelper.clearContent('comment-content');
    }
    
    commentsModal.open();
    
    // 初始化评论编辑器（延迟执行，确保弹窗已显示）
    setTimeout(() => {
      initCommentEditor();
    }, 300);

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
    
    // 清空输入框
    document.getElementById("comment-content").value = "";
    
    // 清空CKEditor
    if (window.CKEditorHelper) {
      window.CKEditorHelper.clearContent('comment-content');
    }

    await loadCommentsInModal(currentReplyMessageId);

    // 不重新加载整个列表，只更新当前留言卡片的评论数
    const messageCard = document.querySelector(`[data-message-id="${currentReplyMessageId}"]`);
    if (messageCard) {
      const commentsBtn = messageCard.querySelector('.btn-comments');
      if (commentsBtn) {
        // 更新评论数
        const match = commentsBtn.textContent.match(/\d+/);
        if (match) {
          const currentCount = parseInt(match[0]);
          commentsBtn.innerHTML = `<i class="fa-solid fa-comments"></i> 查看评论 (${currentCount + 1})`;
        }
      }
    }
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
      const html = `
        <div style="margin-top: 24px;">
          <h4 style="font-size: 16px; font-weight: 600; color: var(--primary-color); margin-bottom: 16px;">
            <i class="fas fa-comments"></i> 评论列表 (${comments.length})
          </h4>
          ${comments.map(comment => {
            const isOfficial = comment.user_is_staff;
            return `
              <div class="modal-comment-item" style="position: relative; padding: 16px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isOfficial ? 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))' : 'var(--background-tertiary)'}; display: flex; align-items: center; justify-content: center; color: ${isOfficial ? 'white' : 'var(--text-secondary)'}; font-size: 16px;">
                      <i class="fas fa-user${isOfficial ? '-tie' : '-circle'}"></i>
                    </div>
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 14px; font-weight: 500; color: var(--text-primary);">
                          ${escapeHtml(comment.user_nickname || "匿名用户")}
                        </span>
                        ${isOfficial ? '<span class="tag primary" style="font-size: 11px; padding: 2px 8px;">官方回复</span>' : ''}
                      </div>
                      <div style="font-size: 12px; color: var(--text-secondary);">
                        <i class="fas fa-clock"></i> ${formatRelativeTime(new Date(comment.created_at).getTime())}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="rich-text-content" style="margin-left: 48px; line-height: 1.6; font-size: 14px; color: var(--text-primary);">
                  ${formatRichTextContentLocal(comment.content)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <div style="padding: 60px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">💬</div>
          <div style="color: var(--text-secondary); font-size: 14px;">还没有评论，快来抢沙发吧</div>
        </div>
      `;
    }
  } catch (error) {
    console.error("加载评论失败:", error);
    container.innerHTML = `
      <div style="padding: 40px 0; text-align: center;">
        <div style="color: var(--danger-color); font-size: 14px;">
          <i class="fas fa-exclamation-circle"></i> 加载评论失败
        </div>
      </div>
    `;
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
                  <div class="rich-text-content" style="margin: 0; line-height: 1.6; font-size: 14px; color: var(--text-primary);">${formatRichTextContentLocal(comment.content)}</div>
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

// 初始化互动交流页面的富文本编辑器
async function initCommunityEditors() {
  try {
    // 等待CKEditorHelper加载
    if (typeof window.CKEditorHelper === 'undefined') {
      console.warn('CKEditorHelper未加载，等待...');
      setTimeout(initCommunityEditors, 500);
      return;
    }
    
    // 初始化留言内容编辑器
    const messageEditor = document.getElementById('message-content');
    if (messageEditor && !window.CKEditorHelper.editorInstances['message-content']) {
      await window.CKEditorHelper.initEditor('message-content', {
        placeholder: '分享你的想法...'
      });
      console.log('✅ 留言内容编辑器初始化成功');
    }
    
    // 注意：评论编辑器在弹窗中，需要在打开弹窗时初始化
    console.log('✅ 互动交流页面编辑器初始化完成');
  } catch (error) {
    console.error('❌ 初始化互动交流编辑器失败:', error);
  }
}

// 初始化评论编辑器（在打开评论弹窗时调用）
async function initCommentEditor() {
  try {
    if (typeof window.CKEditorHelper === 'undefined') {
      console.warn('CKEditorHelper未加载');
      return;
    }
    
    const commentEditor = document.getElementById('comment-content');
    if (commentEditor && !window.CKEditorHelper.editorInstances['comment-content']) {
      await window.CKEditorHelper.initEditor('comment-content', {
        placeholder: '写下你的评论...'
      });
      console.log('✅ 评论编辑器初始化成功');
    }
  } catch (error) {
    console.error('❌ 初始化评论编辑器失败:', error);
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


