// 工具函数模块

// 导航栏菜单配置（按照管理员后台管理顺序）
const NAV_MENU_ITEMS = [
  { name: '旅游目的地', url: '/destinations/', urlName: 'destinations' },
  { name: '新闻资讯', url: '/news/', urlName: 'news' },
  { name: '政策法规', url: '/policies/', urlName: 'policies' },
  { name: '安全预警', url: '/safety/', urlName: 'safety' },
  { name: '发展现状', url: '/statistics/', urlName: 'statistics' },
  { name: '互动交流', url: '/community/', urlName: 'community' }
];

// 初始化导航栏菜单（动态生成）
function initNavbarMenu() {
  const navbarMenu = document.querySelector('.navbar-menu');
  const footerLinks = document.querySelector('.footer-links');
  
  // 生成桌面端菜单HTML
  if (navbarMenu) {
    const desktopHtml = NAV_MENU_ITEMS.map(item => 
      `<li><a href="${item.url}">${item.name}</a></li>`
    ).join('');
    navbarMenu.innerHTML = desktopHtml;
  }
  
  // 注意：移动端菜单由 auth.js 的 updateMobileMenu() 统一管理，此处不再生成
  // 这样可以避免覆盖用户相关的菜单项（个人主页、退出登录等）
  
  // 生成底部链接HTML
  if (footerLinks) {
    const footerHtml = NAV_MENU_ITEMS.map(item => 
      `<a href="${item.url}">${item.name}</a>`
    ).join('');
    footerLinks.innerHTML = footerHtml;
  }
}

// 日期格式化
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日期时间格式化
function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 相对时间格式化
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatDate(timestamp);
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

// 显示通知消息
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type} show`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// 显示加载状态
function showLoading(container) {
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>加载中...</div>
    </div>
  `;
}

// 显示错误信息
function showError(container, message = '加载失败，请稍后重试') {
  container.innerHTML = `
    <div class="loading">
      <div style="color: var(--danger-color); font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <div>${message}</div>
    </div>
  `;
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 截取文本
function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function stripHtmlTags(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// HTML转义
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// 模态框控制
class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    this.closeBtn = this.modal?.querySelector('.modal-close');
    
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.close();
        }
      });
    }
  }

  open() {
    if (this.modal) {
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  setContent(content) {
    const modalBody = this.modal?.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = content;
    }
  }

  setTitle(title) {
    const modalTitle = this.modal?.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = title;
    }
  }
}

// 分页器
class Pagination {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.currentPage = options.currentPage || 1;
    this.totalPages = options.totalPages || 1;
    this.onPageChange = options.onPageChange || (() => {});
  }

  render() {
    if (!this.container || this.totalPages <= 1) {
      if (this.container) this.container.innerHTML = '';
      return;
    }

    let html = '<div class="pagination">';
    
    // 上一页
    if (this.currentPage > 1) {
      html += `<button class="pagination-btn" data-page="${this.currentPage - 1}">上一页</button>`;
    }

    // 页码
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      html += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === this.currentPage ? 'active' : '';
      html += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
      html += `<button class="pagination-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
    }

    // 下一页
    if (this.currentPage < this.totalPages) {
      html += `<button class="pagination-btn" data-page="${this.currentPage + 1}">下一页</button>`;
    }

    html += '</div>';
    this.container.innerHTML = html;

    // 绑定事件
    this.container.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page !== this.currentPage) {
          this.currentPage = page;
          this.onPageChange(page);
          this.render();
        }
      });
    });
  }

  update(currentPage, totalPages) {
    this.currentPage = currentPage;
    this.totalPages = totalPages;
    this.render();
  }
}

// 添加分页样式
const paginationStyles = `
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: var(--background);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.pagination-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination-ellipsis {
  padding: 8px;
  color: var(--text-secondary);
}
`;

// 注入分页样式
if (!document.getElementById('pagination-styles')) {
  const style = document.createElement('style');
  style.id = 'pagination-styles';
  style.textContent = paginationStyles;
  document.head.appendChild(style);
}

// 搜索防抖
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 获取URL参数
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 设置URL参数
function setUrlParameter(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// 移除URL参数
function removeUrlParameter(name) {
  const url = new URL(window.location);
  url.searchParams.delete(name);
  window.history.pushState({}, '', url);
}

// 平滑滚动到顶部
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// 自定义确认对话框
function showConfirm(options = {}) {
  return new Promise((resolve) => {
    const {
      title = '确认操作',
      message = '确定要执行此操作吗？',
      confirmText = '确定',
      cancelText = '取消',
      type = 'warning' // warning, danger, info
    } = options;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'custom-confirm-dialog';
    dialog.style.cssText = `
      background: var(--background);
      border-radius: 18px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    // 图标颜色
    let iconColor = 'var(--warning-color)';
    let iconClass = 'fa-exclamation-triangle';
    if (type === 'danger') {
      iconColor = 'var(--danger-color)';
      iconClass = 'fa-exclamation-circle';
    } else if (type === 'info') {
      iconColor = 'var(--primary-color)';
      iconClass = 'fa-info-circle';
    }

    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <i class="fas ${iconClass}" style="font-size: 48px; color: ${iconColor};"></i>
      </div>
      <h3 style="font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 12px; color: var(--text-primary);">
        ${escapeHtml(title)}
      </h3>
      <p style="font-size: 15px; color: var(--text-secondary); text-align: center; line-height: 1.6; margin-bottom: 28px;">
        ${escapeHtml(message)}
      </p>
      <div style="display: flex; gap: 12px;">
        <button class="custom-confirm-cancel" style="
          flex: 1;
          padding: 12px 24px;
          border-radius: 980px;
          font-size: 15px;
          font-weight: 500;
          border: 1px solid var(--border-color);
          background: var(--background);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        ">${escapeHtml(cancelText)}</button>
        <button class="custom-confirm-ok" style="
          flex: 1;
          padding: 12px 24px;
          border-radius: 980px;
          font-size: 15px;
          font-weight: 500;
          border: none;
          background: ${type === 'danger' ? 'var(--danger-color)' : 'var(--primary-color)'};
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        ">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 添加动画样式
    if (!document.getElementById('custom-confirm-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-confirm-styles';
      style.textContent = `
        .custom-confirm-cancel:hover {
          background: var(--background-secondary) !important;
        }
        .custom-confirm-ok:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `;
      document.head.appendChild(style);
    }

    // 触发动画
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      dialog.style.transform = 'translateY(0)';
      dialog.style.opacity = '1';
    });

    // 绑定事件
    const cancelBtn = dialog.querySelector('.custom-confirm-cancel');
    const okBtn = dialog.querySelector('.custom-confirm-ok');

    const close = (result) => {
      // 添加关闭动画
      overlay.style.opacity = '0';
      dialog.style.transform = 'translateY(20px)';
      dialog.style.opacity = '0';
      
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(result);
      }, 200);
    };

    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

// 初始化移动端汉堡菜单（Apple风格）
document.addEventListener('DOMContentLoaded', function() {
  // 初始化导航栏菜单
  initNavbarMenu();
  
  const navbarToggle = document.getElementById('navbar-toggle');
  let mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const navbar = document.querySelector('.navbar');
  const aiAssistantWrapper = document.querySelector('.ai-assistant-wrapper');
  const mobileAiBtn = document.querySelector('.mobile-ai-btn');
  
  // 如果关闭按钮不存在，创建它
  if (!mobileMenuToggle && mobileMenuOverlay) {
    console.log('创建移动端关闭按钮');
    mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'navbar-toggle mobile-menu-toggle';
    mobileMenuToggle.id = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    // 插入到 mobile-menu-overlay 的最前面
    mobileMenuOverlay.insertBefore(mobileMenuToggle, mobileMenuOverlay.firstChild);
  }
  
  console.log('汉堡菜单初始化:', { 
    navbarToggle, 
    mobileMenuToggle,
    mobileMenuOverlay, 
    mobileAiBtn 
  });
  
  if (navbarToggle && mobileMenuOverlay) {
    let isOpen = false;
    
    function openMenu() {
      console.log('打开菜单');
      isOpen = true;
      
      // 同步两个汉堡按钮的状态
      navbarToggle.classList.add('active');
      if (mobileMenuToggle) mobileMenuToggle.classList.add('active');
      mobileMenuOverlay.classList.add('show');
      
      // 隐藏桌面端AI按钮
      if (aiAssistantWrapper) {
        aiAssistantWrapper.style.display = 'none';
      }
      
      // 隐藏移动端AI图标按钮
      if (mobileAiBtn) {
        mobileAiBtn.classList.add('menu-hidden');
      }
      
      // 如果在Hero区域，给导航栏添加menu-open类
      if (navbar && navbar.classList.contains('hero-active')) {
        navbar.classList.add('menu-open');
      }
      
      // 锁滚动（Apple标准）
      document.body.style.overflow = 'hidden';
      
      // 添加键盘事件监听
      document.addEventListener('keydown', handleEscKey);
    }
    
    function closeMenu() {
      console.log('关闭菜单');
      isOpen = false;
      
      // 同步两个汉堡按钮的状态
      navbarToggle.classList.remove('active');
      if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
      mobileMenuOverlay.classList.remove('show');
      
      // 显示桌面端AI按钮
      if (aiAssistantWrapper) {
        aiAssistantWrapper.style.display = 'flex';
      }
      
      // 显示移动端AI图标按钮（移除隐藏类）
      if (mobileAiBtn) {
        mobileAiBtn.classList.remove('menu-hidden');
      }
      
      // 移除menu-open类
      if (navbar) {
        navbar.classList.remove('menu-open');
      }
      
      // 恢复滚动
      document.body.style.overflow = '';
      
      // 移除键盘事件监听
      document.removeEventListener('keydown', handleEscKey);
    }
    
    function handleEscKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeMenu();
      }
    }
    
    // 点击导航栏汉堡按钮打开菜单
    navbarToggle.addEventListener('click', function(e) {
      console.log('汉堡按钮被点击', { isOpen, active: navbarToggle.classList.contains('active') });
      e.preventDefault();
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });
    
    // 点击菜单覆盖层的事件处理
    mobileMenuOverlay.addEventListener('click', function(e) {
      // 点击菜单内的关闭按钮（mobile-menu-toggle）
      if (e.target.closest('.mobile-menu-toggle') && mobileMenuOverlay.classList.contains('show')) {
        console.log('点击了关闭按钮');
        closeMenu();
        return;
      }
      // 点击菜单项
      if (e.target.closest('.mobile-menu-item')) {
        console.log('点击了菜单项');
        setTimeout(() => {
          closeMenu();
        }, 150);
        return;
      }
      // 点击背景
      if (e.target === mobileMenuOverlay) {
        console.log('点击了背景');
        closeMenu();
      }
    });
  } else {
    console.error('汉堡菜单元素未找到:', { navbarToggle, mobileMenuOverlay });
  }
});

// 富文本内容格式化函数
function formatRichTextContent(content) {
  if (!content) return '暂无内容';
  
  console.log('formatRichTextContent 输入:', content);
  
  // 如果内容已经是HTML格式（包含HTML标签），直接返回
  if (/<[^>]+>/.test(content)) {
    console.log('检测到HTML格式，直接返回');
    return content;
  }
  
  console.log('转换Markdown为HTML');
  
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
  
  console.log('formatRichTextContent 输出:', html);
  
  return html;
}

// 富文本预览格式化函数（用于列表摘要）
function formatRichTextPreview(content, maxLength = 200) {
  if (!content) return '暂无内容';
  
  // 先转换为富文本HTML
  const html = formatRichTextContent(content);
  
  // 创建临时元素提取纯文本
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  // 截取指定长度
  if (text.length > maxLength) {
    return escapeHtml(text.substring(0, maxLength)) + '...';
  }
  
  return escapeHtml(text);
}
