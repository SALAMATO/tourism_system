// 工具函数模块

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

// HTML转义
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
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
      z-index: 9999;
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

// 初始化移动端汉堡菜单（所有页面通用）
document.addEventListener('DOMContentLoaded', function() {
  const navbarToggle = document.getElementById('navbar-toggle');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const navbar = document.querySelector('.navbar');
  
  if (navbarToggle && mobileMenuOverlay) {
    navbarToggle.addEventListener('click', function() {
      const isOpening = !mobileMenuOverlay.classList.contains('show');
      
      mobileMenuOverlay.classList.toggle('show');
      const icon = navbarToggle.querySelector('i');
      
      if (isOpening) {
        // 打开菜单
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
        
        // 如果在Hero区域，给导航栏添加menu-open类
        if (navbar && navbar.classList.contains('hero-active')) {
          navbar.classList.add('menu-open');
        }
      } else {
        // 关闭菜单
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        
        // 移除menu-open类
        if (navbar) {
          navbar.classList.remove('menu-open');
        }
      }
    });
    
    // 点击覆盖层关闭菜单
    mobileMenuOverlay.addEventListener('click', function(e) {
      if (e.target === mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('show');
        const icon = navbarToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        
        // 移除menu-open类
        if (navbar) {
          navbar.classList.remove('menu-open');
        }
      }
    });
    
    // 点击菜单项关闭菜单
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
      item.addEventListener('click', function() {
        mobileMenuOverlay.classList.remove('show');
        const icon = navbarToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        
        // 移除menu-open类
        if (navbar) {
          navbar.classList.remove('menu-open');
        }
      });
    });
  }
});
