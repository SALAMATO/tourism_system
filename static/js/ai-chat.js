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
    this.hasOpenedBefore = false; // 标记是否是页面刷新后第一次打开
    
    // 会话管理相关
    this.currentConversationId = null; // 当前会话ID
    this.conversations = []; // 会话列表
    this.currentConversationTitle = '新对话'; // 当前会话标题
    
    // 编辑名称相关
    this.editConversationId = null; // 当前正在编辑的会话ID
    
    // 检查是否是关闭浏览器后重新打开（使用sessionStorage）
    // sessionStorage在关闭标签页后会自动清除
    const hasVisitedBefore = sessionStorage.getItem('ai-chat-visited');
    if (!hasVisitedBefore) {
      // 首次访问（关闭浏览器后重新打开），清空当前会话ID
      console.log('🔄 检测到是新会话，将创建新对话');
      this.currentConversationId = null;
      // 设置标记，表示已经访问过
      sessionStorage.setItem('ai-chat-visited', 'true');
    } else {
      // F5刷新，保持当前会话ID不变（如果有的话）
      console.log('♻️ 检测到是页面刷新，保持当前会话');
    }
    
    // 拖拽相关
    this.isDragging = false;
    this.dragOffsetX = 0;  // 鼠标相对于容器左上角的X偏移
    this.dragOffsetY = 0;  // 鼠标相对于容器左上角的Y偏移
    
    // Windows 11风格的拖动检测
    this.dragStartX = 0;  // 鼠标按下时的X坐标
    this.dragStartY = 0;  // 鼠标按下时的Y坐标
    this.dragThresholdExceeded = false;  // 是否超过拖动阈值
    this.pendingMaximizeRestore = false;  // 是否等待从最大化状态恢复
    this.maximizeDragOffsetX = 0;  // 最大化状态下鼠标相对于窗口左上角的X偏移
    this.maximizeDragOffsetY = 0;  // 最大化状态下鼠标相对于窗口左上角的Y偏移
    this.maximizeHeaderOffsetX = 0;  // 最大化状态下鼠标相对于标题栏左上角的X偏移
    this.maximizeHeaderOffsetY = 0;  // 最大化状态下鼠标相对于标题栏左上角的Y偏移
    this.maximizeHeaderPercentX = 0;  // 最大化状态下鼠标在标题栏宽度中的百分比（0-1）
    this.maximizeHeaderPercentY = 0;  // 最大化状态下鼠标在标题栏高度中的百分比（0-1）
    
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
        <!-- 左侧会话列表 -->
        <div class="ai-chat-sidebar" id="ai-chat-sidebar">
          <div class="ai-sidebar-header">
            <h3>对话历史</h3>
            <div class="ai-sidebar-actions">
              <button class="ai-new-conversation-btn" id="ai-new-conversation-btn" title="新建对话">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                新对话
              </button>
            </div>
          </div>
          <div class="ai-conversation-list" id="ai-conversation-list">
            <!-- 会话列表将在这里动态生成 -->
          </div>
        </div>
        
        <!-- 右侧聊天主区域 -->
        <div class="ai-chat-main">
          <div class="ai-chat-header">
          <div class="ai-chat-header-left">
            <button class="ai-sidebar-toggle-btn" id="ai-sidebar-toggle-btn" title="收起侧边栏">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
            <h3><img src="/static/images/AI-icon-Black.png" alt="AI" style="width: 20px; height: 20px; margin-right: 8px;"> LowSkyAI 智能助手</h3>
          </div>
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
            <div class="ai-quick-queries">
              <div class="ai-quick-query-title">您可以问我：</div>
              <div class="ai-quick-query-list">
                <button class="ai-quick-query-item" data-question="查询旅游目的地">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  <span>查询旅游目的地</span>
                </button>
                <button class="ai-quick-query-item" data-question="查询政策法规">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>查询政策法规</span>
                </button>
                <button class="ai-quick-query-item" data-question="查询统计数据">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>查询统计数据</span>
                </button>
                <button class="ai-quick-query-item" data-question="查询安全预警">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>查询安全预警</span>
                </button>
                <button class="ai-quick-query-item" data-question="查询新闻资讯">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                    <path d="M18 14h-8"/>
                    <path d="M15 18h-5"/>
                    <path d="M20 6h-4"/>
                  </svg>
                  <span>查询新闻资讯</span>
                </button>
              </div>
            </div>
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
                     <div class="ai-tool-menu-item" data-mode="web_only">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                      </svg>
                      <div>
                        <div class="ai-tool-menu-title">联网搜索</div>
                        <div class="ai-tool-menu-desc">搜索互联网最新信息</div>
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
    this.sidebar = modal.querySelector('#ai-chat-sidebar');
    this.conversationList = modal.querySelector('#ai-conversation-list');
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
      
    // 新建对话按钮
    const newConversationBtn = this.modal.querySelector('#ai-new-conversation-btn');
    if (newConversationBtn) {
      newConversationBtn.onclick = () => this.createNewConversation();
    }
    
    // 侧边栏收起/展开按钮
    const sidebarToggleBtn = this.modal.querySelector('#ai-sidebar-toggle-btn');
    
    if (sidebarToggleBtn) {
      sidebarToggleBtn.onclick = () => this.toggleSidebar();
    }
      
    // 快速查询按钮
    this.messagesContainer.addEventListener('click', (e) => {
      const quickQueryBtn = e.target.closest('.ai-quick-query-item');
      if (quickQueryBtn) {
        const question = quickQueryBtn.dataset.question;
        if (question) {
          this.input.value = question;
          this.sendMessage();
        }
      }
    });
      
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
  
    // 工具模式按钮
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
      // 关闭会话下拉菜单
      if (!e.target.closest('.ai-conversation-actions')) {
        document.querySelectorAll('.dropdown-content').forEach(m => {
          m.classList.remove('show');
        });
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

      // Windows风格的HitTest区域：只排除右侧控制按钮区
      const headerRect = header.getBoundingClientRect();
      const clickX = e.clientX - headerRect.left;
      const RIGHT_SAFE_ZONE = 138; // 控制按钮区域

      // // 如果在右侧按钮区域，不启动拖拽
      // if (clickX > headerRect.width - RIGHT_SAFE_ZONE) {
      //   return;
      // }

      // 记录鼠标按下的位置
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragThresholdExceeded = false;
      
      // 关键：如果是最大化状态，记录鼠标在标题栏中的百分比位置
      if (this.isMaximized) {
        this.pendingMaximizeRestore = true;
        // 记录鼠标在标题栏宽度/高度中的百分比（0-1）
        this.maximizeHeaderPercentX = (e.clientX - headerRect.left) / headerRect.width;
        this.maximizeHeaderPercentY = (e.clientY - headerRect.top) / headerRect.height;
      } else {
        this.startDragging(e, container, header);
      }
    });
    
    // 鼠标移动事件 - 直接同步位置，不使用RAF以获得最佳响应
    document.addEventListener('mousemove', (e) => {
      // 如果正在等待检测拖动阈值（最大化状态）
      if (this.pendingMaximizeRestore && !this.dragThresholdExceeded) {
        const deltaX = Math.abs(e.clientX - this.dragStartX);
        const deltaY = Math.abs(e.clientY - this.dragStartY);
        
        // Windows 11风格：移动超过5像素才认为是拖动
        if (deltaX > 5 || deltaY > 5) {
          this.dragThresholdExceeded = true;
          
          // 获取当前容器的引用
          const currentContainer = this.modal.querySelector('.ai-chat-container');
          const currentHeader = this.modal.querySelector('.ai-chat-header');
          
          // 直接从最大化进入normal state并启动拖拽（不先restore）
          this.restoreFromMaximizeForDrag(e, currentContainer);
          this.startDraggingFromMaximize(e, currentContainer, currentHeader);
        }
        return;
      }
      
      if (!this.isDragging) return;
      
      // 直接计算新位置：鼠标位置 - 偏移量
      let newLeft = e.clientX - this.dragOffsetX;
      let newTop = e.clientY - this.dragOffsetY;
      
      // 边界检查
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 限制左边界
      if (newLeft < 0) newLeft = 0;
      // 限制右边界（至少保留100px在视野内）
      if (newLeft > viewportWidth - 100) newLeft = viewportWidth - 100;
      // 限制上边界
      if (newTop < 0) newTop = 0;
      // 限制下边界（至少保留100px在视野内）
      if (newTop > viewportHeight - 100) newTop = viewportHeight - 100;
      
      // 直接更新位置，不使用RAF，确保即时响应
      // Windows风格：只修改left/top，不触发reflow
      container.style.left = newLeft + 'px';
      container.style.top = newTop + 'px';
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
      // 清除待处理的最大化恢复标志
      this.pendingMaximizeRestore = false;
      this.dragThresholdExceeded = false;
      
      if (this.isDragging) {
        this.isDragging = false;
        header.style.cursor = 'default';
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
  
  // 开始拖拽的辅助方法
  startDragging(e, container, header) {
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
    
    // 添加拖拽类，禁用过渡动画（包括子元素）
    container.classList.add('dragging');
    
    header.style.cursor = 'grabbing';
    e.preventDefault();
  }
  
  // 从最大化状态启动拖拽（使用保存的偏移量）
  startDraggingFromMaximize(e, container, header) {
    this.isDragging = true;
    
    // 使用 restoreFromMaximizeForDrag 中计算好的偏移量
    // 确保窗口位置和拖拽偏移量一致
    this.dragOffsetX = this.adjustedDragOffsetX;
    this.dragOffsetY = this.adjustedDragOffsetY;
    
    // 添加拖拽类，禁用过渡动画
    container.classList.add('dragging');
    
    header.style.cursor = 'grabbing';
    e.preventDefault();
  }
  
  // 从最大化状态恢复并准备拖拽（特殊版本）
  restoreFromMaximizeForDrag(e, container) {
    const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
      
    // 标记为非最大化状态
    this.isMaximized = false;
      
    // 获取应该恢复的窗口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
      
    let targetWidth, targetHeight;
    if (this.savedWindowState && this.savedWindowState.width) {
      targetWidth = parseFloat(this.savedWindowState.width);
      targetHeight = parseFloat(this.savedWindowState.height);
    } else {
      targetWidth = Math.min(viewportWidth * 0.5, viewportWidth * 0.4);
      targetHeight = Math.min(viewportHeight * 0.8, 700);
    }
      
    // Windows 11风格：直接进入normal state，不先restore再拖拽
    // 关键：使用transform而不是修改layout属性
      
    // 1. 立即禁用所有过渡和动画
    container.style.transition = 'none';
    container.style.animation = 'none';
      
    // 2. 移除maximized类
    container.classList.remove('maximized');
    maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>',
      
    // 3. 设置窗口尺寸（这是唯一一次修改width/height）
    container.style.width = targetWidth + 'px';
    container.style.height = targetHeight + 'px';
    container.style.maxWidth = 'none';
    container.style.maxHeight = 'none';
      
    // 4. 计算窗口位置：让鼠标落在标题栏的安全区域内
    // Windows风格：使用最大化时的百分比位置映射到restore后的窗口
    const headerRect = this.modal.querySelector('.ai-chat-header').getBoundingClientRect();
      
    // Windows风格的HitTest区域：只排除右侧控制按钮区（138px）
    const RIGHT_SAFE_ZONE = 138; // 控制按钮区域
    
    // 基于鼠标在最大化标题栏中的相对位置计算offset
    let offsetX = targetWidth * this.maximizeHeaderPercentX;
    let offsetY = headerRect.height * this.maximizeHeaderPercentY;
    
    // Windows风格微调：轻微向中间吸附，避免贴边
    offsetX = offsetX * 0.92;
      
    // 自动避开右侧按钮区域（关键！确保鼠标不会落到按钮上）
    offsetX = Math.min(offsetX, targetWidth - RIGHT_SAFE_ZONE);
      
    // 计算窗口左上角位置
    let targetLeft = e.clientX - offsetX;
    let targetTop = e.clientY - offsetY;
      
    // 边界检查：确保窗口不会完全跑出屏幕
    const minVisibleWidth = targetWidth * 0.3;
    const minVisibleHeight = targetHeight * 0.3;
      
    if (targetLeft < -(targetWidth - minVisibleWidth)) {
      targetLeft = -(targetWidth - minVisibleWidth);
    }
    if (targetTop < 0) {
      targetTop = 0;
    }
    if (targetLeft > viewportWidth - minVisibleWidth) {
      targetLeft = viewportWidth - minVisibleWidth;
    }
    if (targetTop > viewportHeight - minVisibleHeight) {
      targetTop = viewportHeight - minVisibleHeight;
    }
      
    // 5. 设置窗口位置（使用left/top，但只在restore时设置一次）
    container.style.left = targetLeft + 'px';
    container.style.top = targetTop + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.transform = 'none';
      
    // 关键修复：强制浏览器重排后立即读取实际位置
    // 因为CSS样式可能导致实际渲染位置与设置值不同
    void container.offsetHeight; // 触发reflow
    const actualRect = container.getBoundingClientRect();
    
    // 重要：基于实际渲染位置计算拖拽offset（而非理论值）
    this.adjustedDragOffsetX = e.clientX - actualRect.left;
    this.adjustedDragOffsetY = e.clientY - actualRect.top;
      
    // 更新 savedWindowState 为当前位置
    this.savedWindowState = {
      left: targetLeft + 'px',
      top: targetTop + 'px',
      width: targetWidth + 'px',
      height: targetHeight + 'px'
    };
      
    // 注意：不要恢复transition，保持禁用状态直到拖拽结束
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
        
        // 获取当前的实际渲染尺寸（包括CSS限制后的尺寸）
        const rect = container.getBoundingClientRect();
        
        // 先设置当前的实际尺寸，避免清除max限制时跳变
        container.style.width = rect.width + 'px';
        container.style.height = rect.height + 'px';
        container.style.left = rect.left + 'px';
        container.style.top = rect.top + 'px';
        
        // 记录初始状态（使用设置后的值）
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
      
      // 显示快速查询选项
      const quickQueries = this.messagesContainer.querySelector('.ai-quick-queries');
      if (quickQueries) {
        quickQueries.style.display = 'block';
      }
    } else if (mode === 'web_only') {
      this.toolBtn.className = 'ai-tool-btn active mode-web';
      modeBar.style.display = 'flex';
      modeBar.className = 'ai-tool-mode-bar mode-web';
      modeBar.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>&nbsp; <strong>联网搜索</strong> &mdash; 搜索互联网最新信息';
      this.input.placeholder = '例如：2026年低空经济最新政策？最新行业动态？';
      
      // 隐藏快速查询选项
      const quickQueries = this.messagesContainer.querySelector('.ai-quick-queries');
      if (quickQueries) {
        quickQueries.style.display = 'none';
      }
    } else {
      this.toolBtn.className = 'ai-tool-btn';
      modeBar.style.display = 'none';
      this.input.placeholder = '有问题，尽管问，shift+enter换行';
      
      // 隐藏快速查询选项（默认模式不显示）
      const quickQueries = this.messagesContainer.querySelector('.ai-quick-queries');
      if (quickQueries) {
        quickQueries.style.display = 'none';
      }
    }
  }
  
  openChat() {
    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('请先登录后再使用AI助手功能');
      // 触发登录弹窗
      if (window.authModal) {
        window.authModal.open();
      } else {
        // 如果没有authModal，重定向到登录页面
        window.location.href = '/auth/';
      }
      return;
    }
    
    const container = this.modal.querySelector('.ai-chat-container');
      
    // 检查是否是页面加载后第一次打开
    const isFirstOpenAfterRefresh = !this.hasOpenedBefore;
      
    if (isFirstOpenAfterRefresh) {
      // 页面刷新后第一次打开，强制重置为正常状态
      this.isMaximized = false;
      container.classList.remove('maximized');
        
      // 重置最大化按钮图标
      const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
      maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>';
        
      // 标记已经打开过一次
      this.hasOpenedBefore = true;
        
      // 如果没有当前会话，等待用户发送第一条消息时再创建
      if (!this.currentConversationId) {
        console.log('🆕 首次打开，currentConversationId为null，等待用户发送消息');
      } else {
        console.log('🔄 恢复之前的会话ID:', this.currentConversationId);
      }
    } else {
      // 非首次打开，恢复上次最大化状态（仅桌面端）
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
      
    // 初始化快速查询选项的显示状态（只在 db_only 模式显示）
    const quickQueries = this.messagesContainer.querySelector('.ai-quick-queries');
    if (quickQueries) {
      quickQueries.style.display = this.toolMode === 'db_only' ? 'block' : 'none';
    }
      
    // 加载会话列表
    this.loadConversations();
    
    // 恢复侧边栏状态（仅桌面端）
    if (window.innerWidth > 768) {
      const savedCollapsed = localStorage.getItem('ai-sidebar-collapsed');
      const toggleBtn = this.modal.querySelector('#ai-sidebar-toggle-btn');
      
      if (savedCollapsed === 'true' && this.sidebar) {
        this.sidebar.classList.add('collapsed');
        // 更新按钮图标和提示
        if (toggleBtn) {
          toggleBtn.title = '打开侧边栏';
          toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          `;
        }
      } else {
        // 展开状态，更新按钮图标
        if (toggleBtn) {
          toggleBtn.title = '收起侧边栏';
          toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          `;
        }
      }
    }
      
    // 移动端使用淡入动画，桌面端使用缩放动画
    const isMobile = window.innerWidth <= 768;
      
    if (isMobile) {
      // 移动端：直接显示，使用CSS opacity过渡
      this.modal.classList.add('show');
    } else {
      // 桌面端：设置初始缩放状态（从当前位置缩小）
      container.style.transform = 'scale(0.95)';
        
      // 强制重绘后显示
      requestAnimationFrame(() => {
        this.modal.classList.add('show');
        // 延迟一帧后恢复正常大小，实现从当前位置展开的动画
        requestAnimationFrame(() => {
          container.style.transform = 'scale(1)';
        });
      });
    }
      
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
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // 移动端：直接隐藏modal，使用CSS opacity过渡
      this.modal.classList.remove('show');
      this.isOpen = false;
      
      // 等待动画完成后再清理状态（与CSS动画时间一致）
      setTimeout(() => {
        // 清除最小化和最大化状态
        container.classList.remove('minimized', 'maximized');
        
        // 重置最大化按钮图标
        const maximizeBtn = this.modal.querySelector('.ai-chat-maximize svg');
        maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>';
      }, 420); // 与--apple-med时间一致
    } else {
      // 桌面端：先缩小到当前位置
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
      this.isMaximized = false;
        
      // 获取当前最大化状态下的位置和尺寸（作为动画起点）
      const currentRect = container.getBoundingClientRect();
        
      // 先临时禁用transition，避免移除类时触发意外动画
      container.style.transition = 'none';
        
      // 先设置当前位置为起点（保持在全屏位置）
      container.style.left = currentRect.left + 'px';
      container.style.top = currentRect.top + 'px';
      container.style.width = currentRect.width + 'px';
      container.style.height = currentRect.height + 'px';
      container.style.maxWidth = 'none';
      container.style.maxHeight = 'none';
        
      // 移除maximized类（此时transition已禁用，不会跳变）
      container.classList.remove('maximized');
      maximizeBtn.innerHTML = '<rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>';
        
      // 计算目标位置
      let targetLeft, targetTop, targetWidth, targetHeight;
        
      // 如果保存了位置信息（非空字符串），则使用保存的位置
      if (this.savedWindowState && this.savedWindowState.left) {
        // 有保存的位置，直接使用
        targetLeft = this.savedWindowState.left;
        targetTop = this.savedWindowState.top;
        targetWidth = this.savedWindowState.width || '';
        targetHeight = this.savedWindowState.height || '';
      } else {
        // 没有保存的位置（首次打开或未拖拽过），计算居中位置
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
          
        // 如果有保存的尺寸，使用保存的尺寸；否则使用默认尺寸
        if (this.savedWindowState && this.savedWindowState.width) {
          targetWidth = this.savedWindowState.width;
          targetHeight = this.savedWindowState.height;
        } else {
          targetWidth = '';
          targetHeight = '';
        }
          
        // 计算居中位置（基于目标尺寸或默认尺寸）
        const finalWidth = targetWidth ? parseFloat(targetWidth) : Math.min(viewportWidth * 0.5, viewportWidth * 0.4);
        const finalHeight = targetHeight ? parseFloat(targetHeight) : Math.min(viewportHeight * 0.8, 700);
          
        targetLeft = (viewportWidth - finalWidth) / 2 + 'px';
        targetTop = (viewportHeight - finalHeight) / 2 + 'px';
      }
        
      // 立即设置目标位置（同步，不使用requestAnimationFrame）
      container.style.left = targetLeft;
      container.style.top = targetTop;
      if (targetWidth) container.style.width = targetWidth;
      if (targetHeight) container.style.height = targetHeight;
        
      // 恢复transition（用于后续的动画）
      container.style.transition = '';
    } else {
      // 最大化前保存当前状态
      const currentRect = container.getBoundingClientRect();
        
      // 保存当前的实际状态（使用实际渲染的尺寸，而不是inline style）
      this.savedWindowState = {
        left: container.style.left || '',
        top: container.style.top || '',
        width: container.style.width || (currentRect.width + 'px'),
        height: container.style.height || (currentRect.height + 'px')
      };
        
      // 临时禁用transition
      container.style.transition = 'none';
        
      // 确保当前位置被设置
      container.style.left = currentRect.left + 'px';
      container.style.top = currentRect.top + 'px';
      container.style.width = currentRect.width + 'px';
      container.style.height = currentRect.height + 'px';
        
      // 延迟一帧后最大化，触发动画
      requestAnimationFrame(() => {
        // 恢复transition
        container.style.transition = '';
          
        // 添加maximized类（CSS会处理所有位置和尺寸）
        container.classList.add('maximized');
        maximizeBtn.innerHTML = '<rect x="3" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>';
        this.isMaximized = true;
      });
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
    
    console.log('📤 sendMessage 被调用');
    console.log('📤 当前会话ID:', this.currentConversationId);
    console.log('📤 消息内容:', message.substring(0, 50));
    
    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('请先登录后再使用AI助手功能');
      // 触发登录弹窗
      if (window.authModal) {
        window.authModal.open();
      } else {
        // 如果没有authModal，重定向到登录页面
        window.location.href = '/auth/';
      }
      return;
    }
    
    // 如果没有当前会话，创建新会话
    if (!this.currentConversationId) {
      console.log('🆕 需要创建新会话');
      await this.createNewConversation(message);
      console.log('✅ createNewConversation 完成，当前会话ID:', this.currentConversationId);
    }
    
    // 保存用户消息到服务器（后台执行）
    this.saveUserMessage(message).catch(err => {
      console.error('保存用户消息失败:', err);
    });
    
    console.log('发送AI请求，会话ID:', this.currentConversationId);
    
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
      // 获取认证Token
      const token = localStorage.getItem('auth_token');
      console.log('🔑 AI聊天请求 - Token状态:', token ? '已获取' : '未找到');
      console.log('🔑 Token值:', token ? token.substring(0, 20) + '...' : 'N/A');
      
      // 使用流式API
      const response = await fetch('/api/ai/chat_stream/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Token ${token}` })  // 添加Token认证
        },
        body: JSON.stringify({
          message: message,
          tool_mode: this.toolMode,
          conversation_id: this.currentConversationId, // 传递会话ID
          context: {
            page: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        }),
        signal: this.abortController.signal
      });
      
      console.log('📤 请求Headers:', {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Token ***' : '未设置'
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
                  // 流式输出时使用简单的文本转换，避免不完整的Markdown导致占位符问题
                  contentDiv.innerHTML = this.parseMarkdownSimple(fullContent);
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
      
      // 最终渲染（确保所有内容都显示，使用完整的Markdown解析）
      if (fullContent) {
        contentDiv.innerHTML = this.parseMarkdown(fullContent);
        this.smoothScrollToBottom();
        
        // 调试：检查会话ID
        console.log('AI回复完成，当前会话ID:', this.currentConversationId);
        console.log('✅ AI回复已由后端自动保存到数据库');
        
        // 注意：不再需要前端保存，后端chat_stream已自动保存AI回复
        // await this.saveAssistantMessage(fullContent);  // 已移除，避免重复保存
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
  
  parseMarkdownSimple(text) {
    // 简化的Markdown解析，用于流式输出时避免占位符问题
    if (!text) return '';
    
    // 转义HTML特殊字符
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 处理换行
    html = html.replace(/\n/g, '<br>');
    
    // 处理粗体（简单版本）
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 处理链接
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return html;
  }
  
  parseMarkdown(text) {
    if (!text) return '';
    
    // 先保护HTML标签（如<a>标签），避免被转义
    const htmlTags = [];
    let protectedText = text.replace(/<[^>]+>/g, (match) => {
      // 使用不会与Markdown语法冲突的占位符格式
      const placeholder = `%%HTMLTAG${htmlTags.length}%%`;
      htmlTags.push(match);
      return placeholder;
    });
    
    // 转义HTML特殊字符
    let html = protectedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 保护代码块
    const codeBlocks = [];
    html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre><code>${code}</code></pre>`);
      console.log(`[Markdown] 保护代码块 ${codeBlocks.length - 1}:`, placeholder);
      return placeholder;
    });
    
    // 保护行内代码
    const inlineCodes = [];
    html = html.replace(/`(.+?)`/g, (match, code) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code>${code}</code>`);
      console.log(`[Markdown] 保护行内代码 ${inlineCodes.length - 1}:`, placeholder);
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
    
    // 先恢复HTML标签，再处理表格（避免占位符被表格解析破坏）
    if (htmlTags.length > 0) {
      console.log('恢复HTML标签:', htmlTags);
      console.log('恢复前的HTML片段:', html.substring(0, 500));
    }
    htmlTags.forEach((tag, i) => {
      const placeholder = `%%HTMLTAG${i}%%`;
      const beforeReplace = html;
      html = html.replace(placeholder, tag);
      if (html !== beforeReplace) {
        console.log(`已替换 ${placeholder} -> ${tag}`);
      } else {
        console.warn(`未找到 ${placeholder}`);
      }
    });
    console.log('恢复后的HTML片段:', html.substring(0, 500));
    
    // 处理Markdown表格（管道符分隔）
    html = this.parseMarkdownTables(html);
    
    // 表格解析后，再次尝试恢复可能遗漏的HTML标签占位符
    htmlTags.forEach((tag, i) => {
      html = html.replace(`%%HTMLTAG${i}%%`, tag);
    });
    
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
    
    // 恢复代码块和行内代码（必须在最后执行，确保占位符未被破坏）
    // 先恢复代码块
    codeBlocks.forEach((code, i) => {
      const placeholder = `__CODE_BLOCK_${i}__`;
      console.log(`[Markdown] 恢复代码块 ${i}:`, placeholder);
      // 使用全局替换，确保所有实例都被替换
      let replaced = false;
      while (html.includes(placeholder)) {
        html = html.replace(placeholder, code);
        replaced = true;
      }
      if (!replaced) {
        console.warn(`[Markdown] 未找到代码块占位符: ${placeholder}`);
        console.warn(`[Markdown] HTML内容片段:`, html.substring(0, 1000));
      }
    });
    
    // 再恢复行内代码
    inlineCodes.forEach((code, i) => {
      const placeholder = `__INLINE_CODE_${i}__`;
      console.log(`[Markdown] 恢复行内代码 ${i}:`, placeholder);
      // 使用全局替换，确保所有实例都被替换
      let replaced = false;
      while (html.includes(placeholder)) {
        html = html.replace(placeholder, code);
        replaced = true;
      }
      if (!replaced) {
        console.warn(`[Markdown] 未找到行内代码占位符: ${placeholder}`);
      }
    });
    
    return html;
  }
  
  parseMarkdownTables(html) {
    // 匹配Markdown表格格式：
    // | 标题1 | 标题2 | 标题3 |
    // | --- | --- | --- |
    // | 内容1 | 内容2 | 内容3 |
    
    const lines = html.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // 检查是否是表格行（以 | 开头和结尾，或包含 |）
      if (line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3) {
        // 找到表格开始，收集所有表格行
        const tableLines = [];
        let j = i;
        while (j < lines.length) {
          const currentLine = lines[j].trim();
          if (currentLine.startsWith('|') && currentLine.endsWith('|')) {
            tableLines.push(currentLine);
            j++;
          } else {
            break;
          }
        }
        
        // 解析表格
        if (tableLines.length >= 2) {
          result.push(this.buildTableFromLines(tableLines));
          i = j; // 跳过已处理的表格行
        } else {
          // 不是有效表格，作为普通文本处理
          result.push(line);
          i++;
        }
      } else {
        result.push(line);
        i++;
      }
    }
    
    return result.join('\n');
  }
  
  buildTableFromLines(tableLines) {
    // 第一行是表头，第二行是分隔符，之后是数据行
    const headers = this.parseTableRow(tableLines[0]);
    const rows = tableLines.slice(2).map(line => this.parseTableRow(line));
    
    let tableHtml = '<table class="ai-data-table">';
    
    // 表头
    tableHtml += '<thead><tr>';
    headers.forEach(header => {
      tableHtml += `<th>${header.trim()}</th>`;
    });
    tableHtml += '</tr></thead>';
    
    // 数据行
    if (rows.length > 0) {
      tableHtml += '<tbody>';
      rows.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
          tableHtml += `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody>';
    }
    
    tableHtml += '</table>';
    return tableHtml;
  }
  
  parseTableRow(row) {
    // 移除首尾的 | 并分割
    const cells = row.replace(/^\||\|$/g, '').split('|');
    return cells;
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
      // AI消息需要经过Markdown解析（包括表格）
      contentDiv.innerHTML = this.parseMarkdown(content);
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
  
  // ========== 会话管理方法 ==========
  
  /**
   * 创建新会话
   */
  async createNewConversation(firstMessage = null) {
    try {
      console.log('📝 createNewConversation 被调用');
      console.trace('调用堆栈:'); // 打印调用堆栈，看看是谁调用的
      console.log('📝 firstMessage:', firstMessage ? `有 (${firstMessage.substring(0, 30)})` : '无');
      
      // 如果有第一条消息，使用它作为标题
      const title = firstMessage ? (firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '')) : '新对话';
      console.log('📝 会话标题:', title);
      
      // 直接创建服务器端会话（不再使用临时ID）
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('⚠️ 未登录，无法创建会话');
        return null;
      }
      
      console.log('📤 正在创建会话:', title);
      console.log('📤 请求URL: /api/ai-conversations/');
      
      const response = await fetch('/api/ai-conversations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          title: title
        })
      });
      
      console.log('📥 响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 会话创建成功，ID:', data.id);
        
        // 添加到前端列表
        this.conversations.unshift(data);
        this.currentConversationId = data.id;
        this.currentConversationTitle = title;
        
        console.log('📝 已设置 currentConversationId:', this.currentConversationId);
        
        // 更新UI
        this.renderConversationList();
        
        // 如果是空对话，清空消息区域
        if (!firstMessage) {
          this.clearHistory();
        }
        
        console.log('📝 createNewConversation 即将返回');
        return data.id;
      } else {
        const errorText = await response.text();
        console.error('❌ 创建会话失败:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ 创建会话失败:', error);
      console.error('错误堆栈:', error.stack);
      return null;
    }
  }
  
  /**
   * 保存用户消息到服务器
   */
  async saveUserMessage(content) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !this.currentConversationId) return; // 未登录或没有会话ID不保存
      
      console.log('💾 正在保存用户消息...');
      
      const response = await fetch(`/api/ai-conversations/${this.currentConversationId}/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          role: 'user',
          content: content
        })
      });
      
      if (!response.ok) {
        console.error('❌ 保存用户消息失败:', response.status, await response.text());
      } else {
        console.log('✅ 用户消息保存成功');
      }
    } catch (error) {
      console.error('❌ 保存用户消息异常:', error);
    }
  }
  
  /**
   * 保存AI助手消息到服务器
   */
  async saveAssistantMessage(content) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !this.currentConversationId) return;
      
      const response = await fetch(`/api/ai-conversations/${this.currentConversationId}/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          role: 'assistant',
          content: content
        })
      });
      
      if (!response.ok) {
        console.error('保存AI消息失败:', response.status, await response.text());
      } else {
        console.log('✅ AI消息保存成功');
      }
    } catch (error) {
      console.error('保存AI消息异常:', error);
    }
  }
  
  /**
   * 切换侧边栏收起/展开状态
   */
  toggleSidebar() {
    if (!this.sidebar) return;
    
    const isCollapsed = this.sidebar.classList.contains('collapsed');
    const toggleBtn = this.modal.querySelector('#ai-sidebar-toggle-btn');
    
    if (isCollapsed) {
      // 展开侧边栏
      this.sidebar.classList.remove('collapsed');
      // 更新按钮图标和提示
      if (toggleBtn) {
        toggleBtn.title = '收起侧边栏';
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        `;
      }
      // 保存状态到localStorage
      localStorage.setItem('ai-sidebar-collapsed', 'false');
    } else {
      // 收起侧边栏
      this.sidebar.classList.add('collapsed');
      // 更新按钮图标和提示
      if (toggleBtn) {
        toggleBtn.title = '打开侧边栏';
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        `;
      }
      // 保存状态到localStorage
      localStorage.setItem('ai-sidebar-collapsed', 'true');
    }
  }
  
  /**
   * 加载会话列表
   */
  async loadConversations() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // 未登录用户不加载历史记录
        this.conversations = [];
        this.renderConversationList();
        return;
      }
      
      const response = await fetch('/api/ai-conversations/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.conversations = data.results || data;
        this.renderConversationList();
        
        // 如果有会话，默认选中第一个
        if (this.conversations.length > 0 && !this.currentConversationId) {
          await this.switchConversation(this.conversations[0].id);
        }
      } else {
        // 如果获取失败（可能是token过期），清空会话列表
        console.warn('加载会话列表失败，可能是token过期');
        this.conversations = [];
        this.renderConversationList();
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      this.conversations = [];
      this.renderConversationList();
    }
  }
  
  /**
   * 切换会话
   */
  async switchConversation(conversationId) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      // 更新当前会话ID
      this.currentConversationId = conversationId;
      
      // 获取会话标题
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (conversation) {
        this.currentConversationTitle = conversation.title;
      }
      
      // 更新UI高亮
      this.renderConversationList();
      
      // 加载消息历史
      await this.loadConversationMessages(conversationId);
    } catch (error) {
      console.error('切换会话失败:', error);
    }
  }
  
  /**
   * 加载会话消息
   */
  async loadConversationMessages(conversationId) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await fetch(`/api/ai-conversations/${conversationId}/messages/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        
        // 清空当前显示
        this.messagesContainer.innerHTML = '';
        this.messages = [];
        
        // 显示所有消息
        if (messages.results) {
          messages.results.forEach(msg => {
            const messageDiv = this.createMessageElement(msg.role, msg.content);
            this.messagesContainer.appendChild(messageDiv);
            this.messages.push({ role: msg.role, content: msg.content, timestamp: new Date(msg.created_at) });
          });
        } else if (Array.isArray(messages)) {
          messages.forEach(msg => {
            const messageDiv = this.createMessageElement(msg.role, msg.content);
            this.messagesContainer.appendChild(messageDiv);
            this.messages.push({ role: msg.role, content: msg.content, timestamp: new Date(msg.created_at) });
          });
        }
        
        // 滚动到底部
        if (this.messages.length > 0) {
          this.smoothScrollToBottom();
        }
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  }
  
  /**
   * 渲染会话列表
   */
  renderConversationList() {
    const listElement = this.conversationList;
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    if (this.conversations.length === 0) {
      listElement.innerHTML = '<div class="ai-empty-conversations">暂无对话历史</div>';
      return;
    }
    
    this.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'ai-conversation-item' + (conv.id === this.currentConversationId ? ' active' : '');
      item.dataset.id = conv.id;
      
      const time = conv.updated_at ? this.formatTime(conv.updated_at) : '';
      
      item.innerHTML = `
        <div class="ai-conversation-item-content" onclick="window.lowSkyAI.switchConversation('${conv.id}')">
          <div class="ai-conversation-title">${conv.title || '新对话'}</div>
          <div class="ai-conversation-time">${time}</div>
        </div>
        <div class="ai-conversation-actions">
          <div class="dropdown-menu">
            <button class="dropdown-toggle" onclick="event.stopPropagation(); window.lowSkyAI.toggleConversationDropdown('${conv.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            <div class="dropdown-content" id="conversation-menu-${conv.id}">
              <button class="dropdown-item" onclick="event.stopPropagation(); window.lowSkyAI.editConversationName('${conv.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                编辑名称
              </button>
              <button class="dropdown-item danger" onclick="event.stopPropagation(); window.lowSkyAI.deleteConversation('${conv.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                删除对话
              </button>
            </div>
          </div>
        </div>
      `;
      
      listElement.appendChild(item);
    });
  }
  
  /**
   * 格式化时间
   */
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
      
    // 小于1小时，显示“x分钟前”
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return minutes === 0 ? '刚刚' : `${minutes}分钟前`;
    }
      
    // 小于24小时，显示“x小时前”
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
      
    // 小于7天，显示“x天前”
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
      
    // 否则显示日期
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
    
  /**
   * 切换会话下拉菜单
   */
  toggleConversationDropdown(conversationId) {
    const menu = document.getElementById(`conversation-menu-${conversationId}`);
    if (!menu) return;
      
    // 关闭其他所有下拉菜单
    document.querySelectorAll('.dropdown-content').forEach(m => {
      if (m.id !== `conversation-menu-${conversationId}`) {
        m.classList.remove('show');
      }
    });
      
    // 切换当前菜单
    menu.classList.toggle('show');
  }
    
  /**
   * 编辑对话名称
   */
  editConversationName(conversationId) {
    // 关闭下拉菜单
    document.querySelectorAll('.dropdown-content').forEach(m => {
      m.classList.remove('show');
    });
    
    // 获取当前会话
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    // 创建编辑名称弹窗
    this.showEditNameModal(conversation);
  }
  
  /**
   * 显示编辑名称弹窗
   */
  showEditNameModal(conversation) {
    // 移除已有的弹窗
    this.removeEditNameModal();
    
    // 创建弹窗HTML
    const modalHTML = `
      <div class="ai-edit-name-overlay" id="ai-edit-name-overlay">
        <div class="ai-edit-name-modal">
          <div class="ai-edit-name-header">
            <h3>编辑对话名称</h3>
            <button class="ai-edit-name-close" onclick="window.lowSkyAI.removeEditNameModal()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="ai-edit-name-body">
            <textarea class="ai-edit-name-input" id="ai-edit-name-input" rows="3" placeholder="请输入对话名称">${conversation.title || '新对话'}</textarea>
            <div class="ai-edit-name-footer">
              <button class="ai-edit-name-cancel" onclick="window.lowSkyAI.removeEditNameModal()">取消</button>
              <button class="ai-edit-name-confirm" onclick="window.lowSkyAI.saveConversationName('${conversation.id}')">确认</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
    
    // 聚焦到输入框并选中所有文本
    setTimeout(() => {
      const input = document.getElementById('ai-edit-name-input');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
    
    // ESC键关闭弹窗
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        this.removeEditNameModal();
        document.removeEventListener('keydown', handleEscKey);
      }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // 点击遮罩层关闭
    const overlay = document.getElementById('ai-edit-name-overlay');
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          this.removeEditNameModal();
        }
      };
    }
  }
  
  /**
   * 移除编辑名称弹窗
   */
  removeEditNameModal() {
    const overlay = document.getElementById('ai-edit-name-overlay');
    if (overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  }
  
  /**
   * 保存对话名称
   */
  async saveConversationName(conversationId) {
    const input = document.getElementById('ai-edit-name-input');
    if (!input) return;
    
    const newTitle = input.value.trim();
    if (!newTitle) {
      showNotification('对话名称不能为空', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showNotification('请先登录', 'error');
        return;
      }
      
      const response = await fetch(`/api/ai-conversations/${conversationId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          title: newTitle
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 更新本地数据
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.title = data.title;
        }
        
        // 如果修改的是当前会话，更新标题
        if (this.currentConversationId === conversationId) {
          this.currentConversationTitle = data.title;
        }
        
        // 重新渲染列表
        this.renderConversationList();
        
        // 关闭弹窗
        this.removeEditNameModal();
        
        showNotification('名称修改成功', 'success');
      } else {
        const errorText = await response.text();
        console.error('修改名称失败:', response.status, errorText);
        showNotification('修改失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('修改名称异常:', error);
      showNotification('修改失败，请稍后重试', 'error');
    }
  }
  
  /**
   * 删除对话
   */
  async deleteConversation(conversationId) {
    // 关闭下拉菜单
    document.querySelectorAll('.dropdown-content').forEach(m => {
      m.classList.remove('show');
    });
    
    // 使用项目统一的确认对话框
    const confirmed = await showConfirm({
      title: '删除对话',
      message: '确定要删除这个对话吗？删除后将无法恢复。',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('请先登录');
        return;
      }
      
      const response = await fetch(`/api/ai-conversations/${conversationId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (response.ok) {
        // 从列表中移除
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        
        // 如果删除的是当前会话，清空聊天区域
        if (this.currentConversationId === conversationId) {
          this.currentConversationId = null;
          this.currentConversationTitle = '新对话';
          this.clearHistory();
        }
        
        // 重新渲染列表
        this.renderConversationList();
        
        // 显示成功提示
        showNotification('删除成功', 'success');
        console.log('✅ 对话删除成功');
      } else {
        const errorText = await response.text();
        console.error('❌ 删除对话失败:', response.status, errorText);
        showNotification('删除失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('❌ 删除对话异常:', error);
      showNotification('删除失败，请稍后重试', 'error');
    }
  }
    
  clearHistory() {
    this.messages = [];
    const quickQueriesDisplay = this.toolMode === 'db_only' ? 'block' : 'none';
    this.messagesContainer.innerHTML = `
      <div class="ai-welcome-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12h5l2-9 4 18 2-9h5"/>
        </svg>
        <h4>欢迎使用 LowSkyAI</h4>
        <p>我是您的低空旅游智能助手<br>可以为您解答低空旅游相关问题、推荐目的地、解释政策法规等</p>
        <div class="ai-quick-queries" style="display: ${quickQueriesDisplay};">
          <div class="ai-quick-query-title">您可以问我：</div>
          <div class="ai-quick-query-list">
            <button class="ai-quick-query-item" data-question="查询旅游目的地">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <span>查询旅游目的地</span>
            </button>
            <button class="ai-quick-query-item" data-question="查询政策法规">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>查询政策法规</span>
            </button>
            <button class="ai-quick-query-item" data-question="查询统计数据">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>查询统计数据</span>
            </button>
            <button class="ai-quick-query-item" data-question="查询安全预警">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>查询安全预警</span>
            </button>
            <button class="ai-quick-query-item" data-question="查询新闻资讯">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8"/>
                <path d="M15 18h-5"/>
                <path d="M20 6h-4"/>
              </svg>
              <span>查询新闻资讯</span>
            </button>
          </div>
        </div>
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

/**
 * 显示安全预警详情弹窗
 * @param {number} alertId - 安全预警ID
 */
async function showSafetyAlertDetail(alertId) {
  try {
    // 调用API获取安全预警详情
    const response = await fetch(`/api/safety-alerts/${alertId}/`);
    
    if (!response.ok) {
      throw new Error('获取安全预警详情失败');
    }
    
    const data = await response.json();
    
    // 创建弹窗内容
    const modalContent = `
      <div class="safety-alert-detail-modal">
        <div class="safety-alert-detail-header">
          <h3>${data.title}</h3>
          <button class="safety-alert-close" onclick="closeSafetyAlertModal()">&times;</button>
        </div>
        <div class="safety-alert-detail-body">
          <div class="safety-alert-info">
            <div class="info-row" style="display: flex; gap: 24px;">
              <div>
                <span class="info-label">风险等级：</span>
                <span class="risk-level risk-${data.risk_level === '高' ? 'high' : data.risk_level === '中' ? 'medium' : 'low'}">
                  ${data.risk_level}
                </span>
              </div>
              <div>
                <span class="info-label">状态：</span>
                <span class="status-${data.status === '已解决' ? 'resolved' : data.status === '处理中' ? 'processing' : 'pending'}">
                  ${data.status}
                </span>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">隐患类别：</span>
              <span>${data.category}</span>
            </div>
            <div class="info-row">
              <span class="info-label">创建时间：</span>
              <span>${formatDateTime(data.created_at) || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">更新时间：</span>
              <span>${formatDateTime(data.updated_at) || '-'}</span>
            </div>
          </div>
          
          ${data.description ? `
          <div class="detail-section">
            <h4>问题描述</h4>
            <p>${data.description}</p>
          </div>
          ` : ''}
          
          ${data.prevention ? `
          <div class="detail-section">
            <h4>预防措施</h4>
            <p>${data.prevention}</p>
          </div>
          ` : ''}
          
          ${data.emergency_plan ? `
          <div class="detail-section">
            <h4>应急预案</h4>
            <p>${data.emergency_plan}</p>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'safety-alert-overlay';
    overlay.id = 'safety-alert-overlay';
    overlay.innerHTML = modalContent;
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeSafetyAlertModal();
      }
    };
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
    
  } catch (error) {
    console.error('获取安全预警详情失败:', error);
    alert('获取安全预警详情失败，请稍后重试');
  }
}

/**
 * 关闭安全预警详情弹窗
 */
function closeSafetyAlertModal() {
  const overlay = document.getElementById('safety-alert-overlay');
  if (overlay) {
    overlay.remove();
    document.body.style.overflow = ''; // 恢复滚动
  }
}
