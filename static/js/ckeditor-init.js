/**
 * CKEditor 5 Classic版本集成脚本
 * 使用Classic版本可用的功能
 */

// CKEditor 5 许可证密钥（24小时评估密钥）
// 如需长期使用，请注册免费账户获取永久密钥：https://portal.ckeditor.com/checkout?plan=free
const LICENSE_KEY = 'GPL'; // 或 <YOUR_LICENSE_KEY>

// CKEditor 实例存储
const editorInstances = {};

// Classic版本的编辑器配置（只使用Classic版本支持的功能）
const classicEditorConfig = {
  licenseKey: LICENSE_KEY, // 添加许可证密钥
  toolbar: {
    items: [
      'heading',
      '|',
      'bold',
      'italic',
      '|',
      'fontSize',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'outdent',
      'indent',
      '|',
      'link',
      'blockQuote',
      '|',
      'undo',
      'redo'
    ],
    shouldNotGroupWhenFull: true
  },
  heading: {
    options: [
      { model: 'paragraph', title: '正文', class: 'ck-heading_paragraph' },
      { model: 'heading2', view: 'h2', title: '标题 1', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: '标题 2', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: '标题 3', class: 'ck-heading_heading4' }
    ]
  },
  fontSize: {
    options: [
      'tiny',
      'small',
      'default',
      'big',
      'huge'
    ]
  },
  language: 'zh-cn',
  placeholder: '请输入内容...'
};

// 初始化指定的编辑器
async function initEditor(elementId, config = classicEditorConfig) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`元素 ${elementId} 不存在`);
      return null;
    }

    // 如果已经初始化过，先销毁
    if (editorInstances[elementId]) {
      await editorInstances[elementId].destroy();
    }

    // 使用ClassicEditor
    const editor = await ClassicEditor.create(element, config);
    editorInstances[elementId] = editor;
    
    console.log(`编辑器 ${elementId} 初始化成功`);
    
    // 监听内容变化，同步到textarea
    editor.model.document.on('change:data', () => {
      element.value = editor.getData();
    });
    
    // 添加emoji按钮到工具栏旁边
    addEmojiButton(elementId, editor);
    
    return editor;
  } catch (error) {
    console.error(`初始化编辑器 ${elementId} 失败:`, error);
    return null;
  }
}

// 添加emoji选择器按钮
function addEmojiButton(elementId, editor) {
  try {
    const editorElement = editor.ui.view.element;
    const toolbar = editorElement.querySelector('.ck-toolbar');
    
    if (toolbar && !toolbar.querySelector('.emoji-picker-btn')) {
      const emojiBtn = document.createElement('button');
      emojiBtn.className = 'emoji-picker-btn';
      emojiBtn.innerHTML = '😀';
      emojiBtn.title = '插入Emoji';
      emojiBtn.style.cssText = `
        background: none;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 16px;
        margin-left: 8px;
      `;
      
      emojiBtn.onclick = (e) => {
        e.preventDefault();
        showEmojiPicker(elementId, emojiBtn);
      };
      
      toolbar.appendChild(emojiBtn);
    }
  } catch (error) {
    console.error('添加emoji按钮失败:', error);
  }
}

// 显示emoji选择器
function showEmojiPicker(elementId, button) {
  // 移除已存在的选择器
  const existingPicker = document.querySelector('.emoji-picker-popup');
  if (existingPicker) {
    existingPicker.remove();
    return;
  }
  
  const picker = document.createElement('div');
  picker.className = 'emoji-picker-popup';
  picker.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 320px;
    max-height: 240px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  `;
  
  // 添加emoji
  commonEmojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = '#f0f0f0';
    btn.onmouseout = () => btn.style.background = 'none';
    btn.onclick = () => {
      insertEmoji(elementId, emoji);
      picker.remove();
    };
    picker.appendChild(btn);
  });
  
  // 定位
  const rect = button.getBoundingClientRect();
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.bottom + 5) + 'px';
  
  document.body.appendChild(picker);
  
  // 调整位置，防止超出视口
  setTimeout(() => {
    const pickerRect = picker.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 如果超出右边界，向左调整
    if (pickerRect.right > viewportWidth) {
      picker.style.left = (viewportWidth - pickerRect.width - 10) + 'px';
    }
    
    // 如果超出底部，向上显示
    if (pickerRect.bottom > viewportHeight) {
      picker.style.top = (rect.top - pickerRect.height - 5) + 'px';
    }
  }, 0);
  
  // 点击外部关闭
  setTimeout(() => {
    document.addEventListener('click', function closePickerOnClickOutside(e) {
      if (!picker.contains(e.target) && e.target !== button) {
        picker.remove();
        document.removeEventListener('click', closePickerOnClickOutside);
      }
    });
  }, 100);
}

// 插入emoji
function insertEmoji(elementId, emoji) {
  try {
    const editor = editorInstances[elementId];
    if (editor) {
      editor.model.change(writer => {
        const insertPosition = editor.model.document.selection.getFirstPosition();
        writer.insertText(emoji, insertPosition);
      });
      editor.editing.view.focus();
    }
  } catch (error) {
    console.error('插入emoji失败:', error);
  }
}

// 常用emoji列表
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
  '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌',
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌',
  '💪', '🙏', '✍️', '💼', '📝', '📊', '📈', '📉',
  '⭐', '🌟', '✨', '💫', '🔥', '💯', '✅', '❌',
  '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍'
];

// 初始化所有CKEditor
async function initAllEditors() {
  try {
    // 等待ClassicEditor加载
    if (typeof ClassicEditor === 'undefined') {
      console.warn('ClassicEditor未加载，等待...');
      setTimeout(initAllEditors, 500);
      return;
    }
    
    // 管理后台的编辑器（仅初始化admin.html中实际存在的编辑器）
    await initEditor('news-content');
    await initEditor('policy-content');
    await initEditor('safety-description');
    await initEditor('safety-prevention');
    await initEditor('safety-plan');
    await initEditor('reply-content');
    
    // 注意：以下编辑器在admin.html中不存在，已禁用
    // await initEditor('message-content');  // 仅在community.html中使用
    // await initEditor('comment-content');  // 仅在community.html中使用
    
    console.log('所有编辑器初始化完成');
  } catch (error) {
    console.error('初始化编辑器失败:', error);
  }
}

// 设置编辑器内容
function setEditorContent(elementId, content) {
  try {
    const editor = editorInstances[elementId];
    if (editor) {
      // 如果内容已经是HTML格式，直接设置
      if (/<[^>]+>/.test(content)) {
        editor.setData(content);
      } else {
        // 否则，将Markdown格式转换为HTML
        const htmlContent = convertMarkdownToHTML(content);
        editor.setData(htmlContent);
      }
      console.log(`设置编辑器 ${elementId} 内容成功`);
    } else {
      console.warn(`编辑器 ${elementId} 未初始化`);
    }
  } catch (error) {
    console.error('设置编辑器内容失败:', error);
  }
}

// 获取编辑器内容
function getEditorContent(elementId) {
  try {
    const editor = editorInstances[elementId];
    if (editor) {
      return editor.getData();
    }
    return '';
  } catch (error) {
    console.error('获取编辑器内容失败:', error);
    return '';
  }
}

// 清空编辑器内容
function clearEditorContent(elementId) {
  try {
    const editor = editorInstances[elementId];
    if (editor) {
      editor.setData('');
      console.log(`清空编辑器 ${elementId} 内容`);
    }
  } catch (error) {
    console.error('清空编辑器内容失败:', error);
  }
}

// 销毁编辑器
async function destroyEditor(elementId) {
  try {
    const editor = editorInstances[elementId];
    if (editor) {
      await editor.destroy();
      delete editorInstances[elementId];
      console.log(`编辑器 ${elementId} 已销毁`);
    }
  } catch (error) {
    console.error('销毁编辑器失败:', error);
  }
}

// 将Markdown格式转换为HTML
function convertMarkdownToHTML(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 转换加粗 **文本** -> <strong>文本</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 转换段落（双换行符）
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (!para) return '';
    
    // 检查是否是标题（以**开头和结尾）
    if (para.startsWith('<strong>') && para.endsWith('</strong>')) {
      const text = para.replace(/<\/?strong>/g, '');
      
      // 一级标题：一、二、三...
      if (/^[一二三四五六七八九十]+、/.test(text)) {
        return `<h2>${text}</h2>`;
      }
      // 二级标题：（一）（二）...
      else if (/^[（(][一二三四五六七八九十]+[）)]/.test(text)) {
        return `<h3>${text}</h3>`;
      }
      // 三级标题：1. 2. 3...
      else if (/^\d+[.、]/.test(text)) {
        return `<h4>${text}</h4>`;
      }
      // 其他加粗文本
      else {
        return `<p><strong>${text}</strong></p>`;
      }
    }
    
    // 普通段落
    return `<p>${para}</p>`;
  }).join('');
  
  return html;
}

// 页面加载完成后初始化 - ❌ 已禁用，统一使用 ckeditor-super-init.js
// document.addEventListener('DOMContentLoaded', function() {
//   // 延迟初始化，确保DOM和ClassicEditor都加载完成
//   setTimeout(() => {
//     initAllEditors();
//   }, 1000);
// });

// 导出函数供其他脚本使用
window.CKEditorHelper = {
  initEditor: initEditor,
  setContent: setEditorContent,
  getContent: getEditorContent,
  clearContent: clearEditorContent,
  destroyEditor: destroyEditor,
  convertMarkdownToHTML: convertMarkdownToHTML,
  insertEmoji: insertEmoji,
  commonEmojis: commonEmojis,
  editorInstances: editorInstances
};
