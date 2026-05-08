// LowSkyAI 智能助手前端交互（优化流式显示效果）
class LowSkyAIChat {
  constructor() {
    this.modal = null;
    this.messagesContainer = null;
    this.input = null;
    this.sendBtn = null;
    this.stopBtn = null;
    this.toolBtn = null;
    this.toolMenu = null;
    this.isOpen = false;
    this.messages = [];
    this.isGenerating = false;
    this.abortController = null;
    this.toolMode = 'auto'; // 'auto' | 'db_only' | 'web_only'
    this.isMaximized = false; // 记住最大化状态
    
    // 拖拽相关
    this.isDragging = false;
    this.dragOffsetX = 0;  // 鼠标相对于容器左上角的X偏移
    this.dragOffsetY = 0;  // 鼠标相对于容器左上角的Y偏移
    
    // 窗口大小调整相关
    this.isResizing = false;
    this.resizeDirection = ''; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeStartLeft = 0;
    this.resizeStartTop = 0;
    
    this.init();
  }
  
  init() {
    // 创建AI助手按钮
    this.createAIButton();
    
    // 创建对话框
    this.createChatModal();
    
    // 绑定事件
    this.bindEvents();
  }
  
  createAIButton() {
    const navbar = document.querySelector('.navbar-container');
    if (!navbar) return;
    
    // 创建AI助手包装器（桌面端）
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-assistant-wrapper';
    
    // 创建AI助手按钮（桌面端 - 带文字）
    const btn = document.createElement('button');
    btn.className = 'ai-assistant-btn';
    btn.innerHTML = `
      <img src="/static/images/AI-icon.png" alt="AI" class="ai-icon-light" style="width: 24px; height: 24px; margin-right: 8px;">
      <img src="/static/images/AI-icon-Black.png" alt="AI" class="ai-icon-dark" style="width: 24px; height: 24px; margin-right: 8px;">
      <span>LowSkyAI</span>
    `;
    btn.onclick = () => this.openChat();
    
    wrapper.appendChild(btn);
    navbar.appendChild(wrapper);
    
    // 创建移动端AI图标按钮（只显示图标）
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'mobile-ai-btn';
    mobileBtn.innerHTML = `
      <img src="/static/images/AI-icon.png" alt="AI" class="ai-icon-light">
      <img src="/static/images/AI-icon-Black.png" alt="AI" class="ai-icon-dark">
    `;
    mobileBtn.onclick = () => this.openChat();
    
    navbar.appendChild(mobileBtn);
  }
  
  createChatModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-chat-modal';
    modal.innerHTML = `
      <div class="ai-chat-container">
        <div class="ai-chat-header">
          <h3><img src="/static/images/AI-icon.png" alt="AI" style="width: 24px; height: 24px; margin-right: 8px;"> LowSkyAI 智能助手</h3>
          <div class="ai-chat-controls">
            <button class="ai-chat-minimize" title="最小化">
              <svg width="10" height="1" viewBox="0 0 10 1">
                <rect width="10" height="1" fill="currentColor"/>
              </svg>
            </button>
            <button class="ai-chat-maximize" title="最大化">
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
              </svg>
            </button>
            <button class="ai-chat-close" title="关闭">
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1"/>
                <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-welcome-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12h5l2-9 4 18 2-9h5"/>
            </svg>
            <h4>欢迎使用 LowSkyAI</h4>
            <p>我是您的低空旅游智能助手<br>可以为您解答低空旅游相关问题、推荐目的地、解释政策法规等</p>
          </div>
        </div>
        <div class="ai-chat-input-area">
          <div class="ai-tool-mode-bar" id="ai-tool-mode-bar" style="display:none;"></div>
          <div class="ai-chat-input-wrapper">
            <div class="ai-chat-input-container">
              <textarea 
                class="ai-chat-input" 
                id="ai-chat-input" 
                placeholder="有问题，尽管问，shift+enter换行"
                rows="1"
              ></textarea>
              <div class="ai-chat-input-actions">
                <div class="ai-tool-menu-wrap">
                  <button class="ai-tool-btn" id="ai-tool-btn" title="选择工具模式">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  </button>
                  <div class="ai-tool-menu" id="ai-tool-menu">
                    <div class="ai-tool-menu-item active" data-mode="auto">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      </svg>
                      <div>
                        <div class="ai-tool-menu-title">默认模式</div>
                        <div class="ai-tool-menu-desc">解答低空旅游相关信息</div>
                      </div>
                    </div>
                    <div class="ai-tool-menu-item" data-mode="db_only">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      </svg>
                      <div>
                        <div class="ai-tool-menu-title">数据库查询</div>
                        <div class="ai-tool-menu-desc">查询系统数据库信息</div>
                      </div>
                    </div>
                  </div>
                </div>
                <button class="ai-chat-send" id="ai-chat-send">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m5 12 7-7 7 7"/>
                    <path d="M12 19V5"/>
                  </svg>
                </button>
                <button class="ai-chat-stop" id="ai-chat-stop" style="display: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- 窗口大小调整手柄 -->
        <div class="resize-handle resize-nw" data-direction="nw"></div>
        <div class="resize-handle resize-ne" data-direction="ne"></div>
        <div class="resize-handle resize-sw" data-direction="sw"></div>
        <div class="resize-handle resize-se" data-direction="se"></div>
        <div class="resize-handle resize-n" data-direction="n"></div>
        <div class="resize-handle resize-s" data-direction="s"></div>
        <div class="resize-handle resize-e" data-direction="e"></div>
        <div class="resize-handle resize-w" data-direction="w"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    this.modal = modal;
    this.messagesContainer = modal.querySelector('#ai-chat-messages');
    this.input = modal.querySelector('#ai-chat-input');
    this.sendBtn = modal.querySelector('#ai-chat-send');
    this.stopBtn = modal.querySelector('#ai-chat-stop');
    this.toolBtn = modal.querySelector('#ai-tool-btn');
    this.toolMenu = modal.querySelector('#ai-tool-menu');
  }
  
  bindEvents() {
    // 关闭按钮
    const closeBtn = this.modal.querySelector('.ai-chat-close');
    closeBtn.onclick = () => this.closeChat();
    
    // 最小化按钮 - 直接关闭对话框
    const minimizeBtn = this.modal.querySelector('.ai-chat-minimize');
    minimizeBtn.onclick = () => this.closeChat();
    
    // 最大化/还原按钮
    const maximizeBtn = this.modal.querySelector('.ai-chat-maximize');
    maximizeBtn.onclick = () => this.toggleMaximize();
    
    // 发送按钮
    this.sendBtn.onclick = () => this.sendMessage();
    
    // 停止按钮
    this.stopBtn.onclick = () => this.stopGeneration();
    
    // 输入框回车发送
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // 自动调整输入框高度
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = this.input.scrollHeight + 'px';
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        if (this.isGenerating) {
          this.stopGeneration();
        } else {
          this.closeChat();
        }
      }
    });

    // 工具模式按鈕
    this.toolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toolMenu.classList.toggle('show');
    });
    this.toolMenu.querySelectorAll('.ai-tool-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        this.setToolMode(item.dataset.mode);
        this.toolMenu.classList.remove('show');
      });
    });
    document.addEventListener('click', (e) => {
      if (!this.toolBtn.contains(e.target) && !this.toolMenu.contains(e.target)) {
        this.toolMenu.classList.remove('show');
      }
    });
    
    // 绑定拖拽功能
    this.bindDragEvents();
  }

  bindDragEvents() {
    const header = this.modal.querySelector('.ai-chat-header');
    const container = this.modal.querySelector('.ai-chat-container');
    
    // 双击标题栏最大化/还原
    header.addEventListener('dblclick', (e) => {
      // 如果点击的是按钮，不触发双击
      if (e.target.closest('.ai-chat-controls')) {
        return;
      }
      this.toggleMaximize();
    });
    
    // 鼠标按下事件
    header.addEventListener('mousedown', (e) => {
      // 如果点击的是按钮，不启动拖拽
      if (e.target.closest('.ai-chat-controls')) {
        return;
      }
      
      // 最大化状态下不允许拖拽
      if (this.isMaximized) {
        return;
      }
      
      this.isDragging = true;
      
      // 记录鼠标相对于容器左上角的偏移
      const rect = container.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      
      // 设置初始位置（从居中转换为绝对定位）
      container.style.left = rect.left + 'px';
      container.style.top = rect.top + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      container.style.transform = 'none';
      
      // 添加拖拽类，禁用过渡动画
      container.classList.add('dragging');
      
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    // 鼠标移动事件 - 直接同步位置，不使用RAF以获得最佳响应
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      // 直接计算新位置：鼠标位置 - 偏移量
      let newLeft = e.clientX - this.dragOffsetX;
      let newTop = e.clientY - this.dragOffsetY;
      
      // 边界检查
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // 限制左边界
      if (newLeft < 0) newLeft = 0;
      // 限制右边界（至少保留100px在视野内）
      if (newLeft > viewportWidth - 100) newLeft = viewportWidth - 100;
      // 限制上边界
      if (newTop < 0) newTop = 0;
      // 限制下边界（至少保留100px在视野内）
      if (newTop > viewportHeight - 100) newTop = viewportHeight - 100;
      
      // 直接更新位置，不使用RAF，确保即时响应
      container.style.left = newLeft + 'px';
      container.style.top = newTop + 'px';
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        header.style.cursor = 'move';
        // 移除拖拽类，恢复过渡动画
        container.classList.remove('dragging');
      }
      
      if (this.isResizing) {
        this.isResizing = false;
        container.classList.remove('resizing');
      }
    });
    
    // 绑定窗口大小调整功能
    this.bindResizeEvents();
  }
  
  bindResizeEvents() {
    const container = this.modal.querySelector('.ai-chat-container');
    const handles = container.querySelectorAll('.resize-handle');
    
    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        // 最大化状态下不允许调整大小
        if (this.isMaximized) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizeDirection = handle.dataset.direction;
        
        // 记录初始状态
        const rect = container.getBoundingClientRect();
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartWidth = rect.width;
        this.resizeStartHeight = rect.height;
        this.resizeStartLeft = rect.left;
        this.resizeStartTop = rect.top;
        
        // 清除CSS限制，允许自由调整大小
        container.style.maxWidth = 'none';
        container.style.maxHeight = 'none';
        
        container.classList.add('resizing');
      });
    });
    
    // 鼠标移动事件 - 调整窗口大小
    document.addEventListener('mousemove', (e) => {
      if (!this.isResizing) return;
      
      const deltaX = e.clientX - this.resizeStartX;
      const deltaY = e.clientY - this.resizeStartY;
      
      let newWidth = this.resizeStartWidth;
      let newHeight = this.resizeStartHeight;
      let newLeft = this.resizeStartLeft;
      let newTop = this.resizeStartTop;
      
      const minWidth = 400;  // 最小宽度
      const minHeight = 300; // 最小高度
      const maxWidth = window.innerWidth;
      const maxHeight = window.innerHeight;
      
      // 根据拖拽方向计算新尺寸和位置
      if (this.resizeDirection.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, this.resizeStartWidth + deltaX));
      }
      if (this.resizeDirection.includes('w')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, this.resizeStartWidth - deltaX));
        newLeft = this.resizeStartLeft + (this.resizeStartWidth - newWidth);
      }
      if (this.resizeDirection.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, this.resizeStartHeight + deltaY));
      }
      if (this.resizeDirection.includes('n')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, this.resizeStartHeight - deltaY));
        newTop = this.resizeStartTop + (this.resizeStartHeight - newHeight);
      }
      
      // 应用新尺寸和位置
      container.style.width = newWidth + 'px';
      container.style.height = newHeight + 'px';
      container.style.left = newLeft + 'px';
      container.style.top = newTop + 'px';
      container.style.maxWidth = 'none'; // 移除max-width限制
      container.style.maxHeight = 'none'; // 移除max-height限制
    });
  }
  
  setToolMode(mode) {
    this.toolMode = mode;
    const modeBar = this.modal.querySelector('#ai-tool-mode-bar');
    this.toolMenu.querySelectorAll('.ai-tool-menu-item').forEach(item => {
      item.classList.toggle('active', item.dataset.mode === mode);
    });
    if (mode === 'db_only') {
      this.toolBtn.className = 'ai-tool-btn active mode-db';
      modeBar.style.display = 'flex';
      modeBar.className = 'ai-tool-mode-bar mode-db';
      modeBar.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>&nbsp; <strong>数据库查询</strong> &mdash; 查询低空旅游信息管理系统数据，可询问旅游目的地、政策法规、统计数据、安全预警、新闻资讯等信息';
      this.input.placeholder = '例如：最近有哪些安全隐患？各地区游客数量排名？评分最高的目的地？';
    } else if (mode === 'web_only') {
      this.toolBtn.className = 'ai-tool-btn active mode-web';
      modeBar.style.display = 'flex';
      modeBar.className = 'ai-tool-mode-bar mode-web';
      modeBar.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>&nbsp; <strong>联网搜索</strong> &mdash; 搜索互联网最新信息';
      this.input.placeholder = '例如：2026年低空经济最新政策？最新行业动态？';
    } else {
      this.toolBtn.className = 'ai-tool-btn';
      modeBar.style.display = 'none';
      this.input.placeholder = '有问题，尽管问，shift+enter换行';
    }
  }
  
  openChat() {
    const container = this.modal.querySelector('.ai-chat-container');
    
    // 恢复上次最大化状态（仅桌面端）
    if (window.innerWidth > 768) {
      const savedMaximized = localStorage.getItem('ai-chat-maximized');
      if (savedMaximized === 'true') {
        this.isMaximized = true;
        const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
        container.classList.add('maximized');
        maximizeBtn.innerHTML = '<rect x="3" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>';
      } else {
        this.isMaximized = false;
      }
    }
    
    // 如果不是最大化状态，保持上次的位置和尺寸
    if (!this.isMaximized) {
      // 如果已经有位置信息，保持不变；否则使用默认居中
      if (!container.style.left || !container.style.top) {
        container.style.left = '';
        container.style.top = '';
        container.style.right = '';
        container.style.bottom = '';
      }
      // 恢复默认尺寸
      if (!container.style.width) {
        container.style.width = '';
      }
      if (!container.style.height) {
        container.style.height = '';
      }
    }
    
    // 设置初始缩放状态（从当前位置缩小）
    container.style.transform = 'scale(0.95)';
    
    // 强制重绘后显示
    requestAnimationFrame(() => {
      this.modal.classList.add('show');
      // 延迟一帧后恢复正常大小，实现从当前位置展开的动画
      requestAnimationFrame(() => {
        container.style.transform = 'scale(1)';
      });
    });
    
    this.isOpen = true;
    this.input.focus();
  }
  
  closeChat() {
    if (this.isGenerating) {
      this.stopGeneration();
    }
    
    // 保存当前最大化状态（仅桌面端）
    if (window.innerWidth > 768) {
      const container = this.modal.querySelector('.ai-chat-container');
      this.isMaximized = container.classList.contains('maximized');
      localStorage.setItem('ai-chat-maximized', this.isMaximized.toString());
    }
    
    const container = this.modal.querySelector('.ai-chat-container');
    
    // 先缩小到当前位置
    container.style.transform = 'scale(0.95)';
    
    // 延迟后隐藏modal
    setTimeout(() => {
      this.modal.classList.remove('show');
      this.isOpen = false;
      
      // 等待动画完成后再清理状态（350ms与CSS动画时间一致）
      setTimeout(() => {
        // 清除最小化和最大化状态
        container.classList.remove('minimized', 'maximized');
        
        // 重置最大化按钮图标
        const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
        maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>';
        
        // 清除transform
        container.style.transform = '';
      }, 350);
    }, 50);
  }
  
  minimizeChat() {
    // 此方法已不再使用，最小化现在直接关闭对话框
    this.closeChat();
  }
  
  toggleMaximize() {
    const container = this.modal.querySelector('.ai-chat-container');
    const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
    
    if (container.classList.contains('maximized')) {
      // 还原 - 层叠方框
      container.classList.remove('maximized');
      maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>';
      this.isMaximized = false;
      
      // 还原时恢复之前的位置和尺寸
      if (this.savedWindowState) {
        container.style.left = this.savedWindowState.left;
        container.style.top = this.savedWindowState.top;
        container.style.width = this.savedWindowState.width;
        container.style.height = this.savedWindowState.height;
        container.style.maxWidth = '';
        container.style.maxHeight = '';
      } else {
        // 如果没有保存的状态，重置为默认
        container.style.left = '';
        container.style.top = '';
        container.style.right = '';
        container.style.bottom = '';
        container.style.width = '';
        container.style.height = '';
        container.style.maxWidth = '';
        container.style.maxHeight = '';
      }
    } else {
      // 最大化前保存当前状态
      this.savedWindowState = {
        left: container.style.left,
        top: container.style.top,
        width: container.style.width,
        height: container.style.height
      };
      
      // 最大化 - 单个方框
      container.classList.add('maximized');
      maximizeBtn.innerHTML = '<rect x="3" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>';
      this.isMaximized = true;
      
      // 最大化时清除拖拽定位
      container.style.left = '';
      container.style.top = '';
      container.style.right = '';
      container.style.bottom = '';
      container.style.width = '';
      container.style.height = '';
    }
  }
  
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isGenerating = false;
    this.updateButtonState(false);
  }
  
  updateButtonState(generating) {
    if (generating) {
      this.sendBtn.style.display = 'none';
      this.stopBtn.style.display = 'flex';
      this.input.disabled = true;
    } else {
      this.sendBtn.style.display = 'flex';
      this.stopBtn.style.display = 'none';
      this.input.disabled = false;
      this.input.focus();
    }
  }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isGenerating) return;
    
    // 清空输入框
    this.input.value = '';
    this.input.style.height = 'auto';
    
    // 移除欢迎消息
    const welcomeMsg = this.messagesContainer.querySelector('.ai-welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }
    
    // 添加用户消息
    this.addMessage('user', message);
    
    // 创建AI消息容器
    const aiMessageDiv = this.createMessageElement('assistant', '');
    this.messagesContainer.appendChild(aiMessageDiv);
    const contentDiv = aiMessageDiv.querySelector('.ai-message-content');
    
    // 显示思考中动画
    contentDiv.innerHTML = `
      <div class="ai-thinking">
        <span>思考中</span>
        <div class="ai-thinking-dot"></div>
        <div class="ai-thinking-dot"></div>
        <div class="ai-thinking-dot"></div>
      </div>
    `;
    
    // 设置生成状态
    this.isGenerating = true;
    this.updateButtonState(true);
    
    // 创建AbortController用于取消请求
    this.abortController = new AbortController();
    
    try {
      // 使用流式API
      const response = await fetch('/api/ai/chat_stream/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          tool_mode: this.toolMode,
          context: {
            page: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        }),
        signal: this.abortController.signal
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      // 清除思考中提示
      contentDiv.innerHTML = '';
      
      // 读取流式响应 - 优化流式显示效果
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let lastRenderTime = 0;
      const renderInterval = 30; // 每30ms最多渲染一次，获得流畅效果
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                contentDiv.innerHTML = this.parseMarkdown('抱歉，我遇到了一些问题：' + data.error);
                break;
              }
              
              if (data.done) {
                break;
              }
              
              if (data.content) {
                // 累加内容
                fullContent += data.content;
                
                // 节流渲染：避免过于频繁的DOM操作，提升流畅度
                const now = Date.now();
                if (now - lastRenderTime > renderInterval) {
                  contentDiv.innerHTML = this.parseMarkdown(fullContent);
                  this.smoothScrollToBottom();
                  lastRenderTime = now;
                }
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
      
      // 最终渲染（确保所有内容都显示）
      if (fullContent) {
        contentDiv.innerHTML = this.parseMarkdown(fullContent);
        this.smoothScrollToBottom();
      } else {
        contentDiv.innerHTML = this.parseMarkdown('抱歉，AI没有返回任何内容。');
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        const currentContent = contentDiv.textContent || '';
        contentDiv.innerHTML = this.parseMarkdown(currentContent + '\n\n*[已停止生成]*');
      } else {
        console.error('AI请求失败:', error);
        contentDiv.innerHTML = this.parseMarkdown('抱歉，网络连接出现问题，请稍后再试。');
      }
    } finally {
      // 恢复状态
      this.isGenerating = false;
      this.updateButtonState(false);
      this.abortController = null;
    }
  }
  
  smoothScrollToBottom() {
    // 平滑滚动到底部
    this.messagesContainer.scrollTo({
      top: this.messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  parseMarkdown(text) {
    if (!text) return '';
    
    // 转义HTML特殊字符
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 保护代码块
    const codeBlocks = [];
    html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre><code>${code}</code></pre>`);
      return placeholder;
    });
    
    // 保护行内代码
    const inlineCodes = [];
    html = html.replace(/`(.+?)`/g, (match, code) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code>${code}</code>`);
      return placeholder;
    });
    
    // 处理标题
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    
    // 处理列表
    html = html.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // 包裹连续的<li>为<ul>
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
      return '<ul>' + match + '</ul>';
    });
    
    // 处理粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // 处理链接
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 处理引用
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 处理分隔线
    html = html.replace(/^[-*_]{3,}$/gm, '<hr>');
    
    // 处理换行
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/^(.+)$/gm, (match) => {
      // 如果不是HTML标签，包裹为段落
      if (!match.match(/^<[^>]+>/) && match.trim()) {
        return '<p>' + match + '</p>';
      }
      return match;
    });
    
    // 清理多余的<p>标签
    html = html.replace(/<p>(<h[1-4]>.*?<\/h[1-4]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>.*?<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>.*?<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>.*?<\/pre>)<\/p>/g, '$1');
    
    // 恢复代码块
    codeBlocks.forEach((code, i) => {
      html = html.replace(`__CODE_BLOCK_${i}__`, code);
    });
    
    // 恢复行内代码
    inlineCodes.forEach((code, i) => {
      html = html.replace(`__INLINE_CODE_${i}__`, code);
    });
    
    return html;
  }
  
  createMessageElement(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<img src="/static/images/AI-icon.png" alt="AI" style="width: 20px; height: 20px;">';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    
    if (role === 'user') {
      contentDiv.textContent = content;
    } else {
      contentDiv.innerHTML = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    return messageDiv;
  }
  
  addMessage(role, content) {
    const messageDiv = this.createMessageElement(role, content);
    this.messagesContainer.appendChild(messageDiv);
    
    // 滚动到底部
    this.smoothScrollToBottom();
    
    // 保存到历史
    this.messages.push({ role, content, timestamp: new Date() });
  }
  
  clearHistory() {
    this.messages = [];
    this.messagesContainer.innerHTML = `
      <div class="ai-welcome-message">
        <i class="fas fa-plane-departure"></i>
        <h4>欢迎使用 LowSkyAI</h4>
        <p>我是您的低空旅游智能助手<br>可以为您解答低空旅游相关问题、推荐目的地、解释政策法规等</p>
      </div>
    `;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.lowSkyAI = new LowSkyAIChat();
});

// 页面加载时自动清空历史
window.addEventListener('DOMContentLoaded', () => {
  if (window.aiChat) {
    window.aiChat.clearHistory();
  }
});
