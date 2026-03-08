// LowSkyAI 智能助手前端交互（支持流式调用、停止生成和Markdown渲染）
class LowSkyAIChat {
  constructor() {
    this.modal = null;
    this.messagesContainer = null;
    this.input = null;
    this.sendBtn = null;
    this.stopBtn = null;
    this.isOpen = false;
    this.messages = [];
    this.isGenerating = false;
    this.abortController = null;
    
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
    
    // 创建AI助手包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-assistant-wrapper';
    
    // 创建AI助手按钮
    const btn = document.createElement('button');
    btn.className = 'ai-assistant-btn';
    btn.innerHTML = '<img src="/static/images/AI-icon.png" alt="AI" style="width: 24px; height: 24px; margin-right: 8px;"><span>LowSkyAI</span>';
    btn.onclick = () => this.openChat();
    
    wrapper.appendChild(btn);
    navbar.appendChild(wrapper);
  }
  
  createChatModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-chat-modal';
    modal.innerHTML = `
      <div class="ai-chat-container">
        <div class="ai-chat-header">
          <h3><img src="/static/images/AI-icon.png" alt="AI" style="width: 24px; height: 24px; margin-right: 8px;"> LowSkyAI 智能助手</h3>
          <button class="ai-chat-close">&times;</button>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-welcome-message">
            <i class="fas fa-plane-departure"></i>
            <h4>欢迎使用 LowSkyAI</h4>
            <p>我是您的低空旅游智能助手，支持8K上下文对话和联网搜索<br>可以为您解答低空旅游相关问题、推荐目的地、解释政策法规等</p>
          </div>
        </div>
        <div class="ai-chat-input-area">
          <div class="ai-chat-input-wrapper">
            <textarea 
              class="ai-chat-input" 
              id="ai-chat-input" 
              placeholder="请输入您的问题..."
              rows="1"
            ></textarea>
            <button class="ai-chat-send" id="ai-chat-send">
              <i class="fas fa-paper-plane"></i>
              <span>发送</span>
            </button>
            <button class="ai-chat-stop" id="ai-chat-stop" style="display: none;">
              <i class="fas fa-stop"></i>
              <span>停止</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    this.modal = modal;
    this.messagesContainer = modal.querySelector('#ai-chat-messages');
    this.input = modal.querySelector('#ai-chat-input');
    this.sendBtn = modal.querySelector('#ai-chat-send');
    this.stopBtn = modal.querySelector('#ai-chat-stop');
  }
  
  bindEvents() {
    // 关闭按钮
    const closeBtn = this.modal.querySelector('.ai-chat-close');
    closeBtn.onclick = () => this.closeChat();
    
    // 点击背景关闭
    this.modal.onclick = (e) => {
      if (e.target === this.modal) {
        this.closeChat();
      }
    };
    
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
  }
  
  openChat() {
    this.modal.classList.add('show');
    this.isOpen = true;
    this.input.focus();
  }
  
  closeChat() {
    if (this.isGenerating) {
      this.stopGeneration();
    }
    this.modal.classList.remove('show');
    this.isOpen = false;
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
      
      // 读取流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      
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
                // 先过滤再添加到fullContent，避免闪现
                // 过滤所有工具调用标记（包括换行符）
                const filtered = data.content
                  .replace(/\[TOOL:[^\]]+\]/g, '')  // 移除工具标记
                  .replace(/^\s*$/gm, '')  // 移除空行
                  .trim();
                if (filtered.trim()) {  // 只添加非空内容
                  fullContent += filtered;
                  // 实时解析并显示Markdown
                  contentDiv.innerHTML = this.parseMarkdown(fullContent);
                  // 滚动到底部
                  this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                }
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
      
      // 如果没有内容，显示错误
      if (!fullContent) {
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
  
  
  filterToolCalls(text) {
    if (!text) return '';
    // Remove [TOOL:...] markers and clean up
    return text
      .replace(/\[TOOL:[^\]]+\]/g, '')  // 移除工具标记
      .replace(/^\s*[\r\n]+/gm, '')  // 移除空行
      .trim();
  }
  
  parseMarkdown(text) {
    if (!text) return '';
    
    // 转义HTML特殊字符
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 解析标题（### -> h3, ## -> h2, # -> h1）
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 解析粗体 **text** 或 __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // 解析斜体 *text* 或 _text_ (但不匹配列表标记)
    html = html.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
    
    // 解析代码块 ```code```
    html = html.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
    
    // 解析行内代码 `code`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // 解析链接 [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 解析无序列表 * item 或 - item
    const lines = html.split('\n');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^[\*\-] (.+)$/);
      
      if (listMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push('<li>' + listMatch[1] + '</li>');
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(line);
      }
    }
    
    if (inList) {
      result.push('</ul>');
    }
    
    html = result.join('\n');
    
    // 解析引用 > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 解析段落（非标签行）
    html = html.split('\n').map(line => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('</ul') || 
          line.startsWith('<li') || line.startsWith('<blockquote') || line.startsWith('<pre')) {
        return line;
      }
      return '<p>' + line + '</p>';
    }).join('\n');
    
    // 清理多余的空段落
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/\n+/g, '\n');
    
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
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
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
