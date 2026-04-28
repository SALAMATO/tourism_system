//管理后台逻辑
let currentReplyMessageId = null;
const replyModal = new Modal('reply-modal');

let currentPolicyEditingId = null;
let currentNewsEditingId = null;
let currentNewsEditingData = null;
let currentSafetyEditingId = null;
let currentSafetyEditingData = null;
let currentStatisticEditingId = null;
let currentDestinationEditingId = null;
let currentDestinationEditingData = null;

// ✨ 缓存管理常量
const CACHE_PREFIX = 'admin_cache_';
const CACHE_TIMESTAMP_KEY = 'admin_cache_timestamp';
const FORCE_REFRESH_FLAG = 'force_refresh';

document.addEventListener('DOMContentLoaded', async () => {
  // ✨ 检测是否为强制刷新（Ctrl+F5）
  const isForceRefresh = checkForceRefresh();
  
  if (isForceRefresh) {
    console.log('检测到强制刷新，清除所有缓存');
    clearAllCache();
  }
  
  // 管理后台权限校验：必须登录且为管理员
  try {
    // 未登录则跳转到统一登录页
    if (!auth.isAuthenticated()) {
      showNotification('请先登录管理员账号', 'error');
      setTimeout(() => {
        window.location.href = '/auth/?redirect=' + encodeURIComponent('/admin-page/');
      }, 1500);
      return;
    }

    // 优先使用本地缓存的用户信息
    let user = auth.getUser();
    if (!user) {
      user = await auth.getCurrentUser();
    }

    // 非管理员无权访问
    if (!user || !user.is_staff) {
      showNotification('您无权访问管理后台', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return;
    }

    // 通过校验后再初始化后台功能
    initForms();
    initDeleteButtons();
    initEditorToggleButtons(); // 初始化编辑器懒加载按钮
    initAutoSave(); // ✨ 初始化自动保存
    
    // ✨ 在初始化完成后才恢复缓存（避免阻塞）
    if (!isForceRefresh) {
      console.log('普通刷新，尝试恢复缓存数据');
      // 延迟执行，确保所有事件监听器已绑定
      setTimeout(() => {
        restoreCache();
      }, 100);
    }
    
    // 不再自动初始化编辑器，采用懒加载模式
    console.log('管理后台初始化完成，编辑器采用懒加载模式');
  } catch (error) {
    console.error('管理后台权限校验失败:', error);
    showNotification('访问管理后台失败，请重新登录', 'error');
    setTimeout(() => {
      window.location.href = '/auth/?redirect=' + encodeURIComponent('/admin-page/');
    }, 1500);
  }
});

// 初始化超级编辑器（懒加载版本 - 不再自动初始化）
async function initSuperEditors() {
  console.log('超级编辑器采用懒加载模式，点击“编辑文本”按钮时才会初始化');
  // 不再自动初始化任何编辑器，等待用户点击按钮
}

// 懒加载初始化指定的编辑器
async function lazyInitEditor(elementId, placeholder = '请输入内容...') {
  try {
    // 检查是否已经初始化过
    if (window.CKEditorSuperHelper && 
        window.CKEditorSuperHelper.editorInstances[elementId] &&
        !window.CKEditorSuperHelper.editorInstances[elementId]._destroyed) {
      console.log(`编辑器 ${elementId} 已存在，无需重复初始化`);
      return window.CKEditorSuperHelper.editorInstances[elementId];
    }
    
    // 等待CKEditorSuperHelper加载
    if (typeof window.CKEditorSuperHelper === 'undefined') {
      console.warn('CKEditorSuperHelper未加载，等待...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return await lazyInitEditor(elementId, placeholder);
    }
    
    console.log(`正在初始化编辑器: ${elementId}`);
    const editor = await window.CKEditorSuperHelper.initEditor(elementId, {
      placeholder: placeholder
    });
    
    // 隐藏对应的按钮
    const btn = document.querySelector(`.editor-toggle-btn[data-editor-id="${elementId}"]`);
    if (btn) {
      btn.style.display = 'none';
    }
    
    console.log(`编辑器 ${elementId} 初始化成功`);
    return editor;
  } catch (error) {
    console.error(`初始化编辑器 ${elementId} 失败:`, error);
    return null;
  }
}

function showModule(moduleName) {
  // 隐藏所有模块
  document.querySelectorAll('.admin-module').forEach(module => {
    module.style.display = 'none';
  });
  
  // 显示选中的模块
  const targetModule = document.getElementById(`${moduleName}-module`);
  if (targetModule) {
    targetModule.style.display = 'block';
    scrollToTop();

    // 根据模块加载对应的数据列表
    if (moduleName === 'policy') {
      loadPoliciesForAdmin();
    } else if (moduleName === 'news') {
      loadNewsForAdmin();
    } else if (moduleName === 'safety') {
      loadSafetyAlertsForAdmin();
    } else if (moduleName === 'statistics') {
      loadStatisticsForAdmin();
    } else if (moduleName === 'destination') {
      loadDestinationsForAdmin();
    } else if (moduleName === 'message') {
      loadMessagesForAdmin();
    } else if (moduleName === 'user') {
      loadUsersForAdmin();
    }
  }
}

function initForms() {
  // 政策法规表单
  document.getElementById('policy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitPolicy();
  });
  
  // 智能原文识别按钮
  document.getElementById('fetch-policy-btn').addEventListener('click', async () => {
    await fetchPolicyFromUrl();
  });
  
  // 新闻资讯表单
  document.getElementById('news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitNews();
  });
  
  // 智能新闻识别按钮
  document.getElementById('fetch-news-btn').addEventListener('click', async () => {
    await fetchNewsFromUrl();
  });
  
  // 安全隐患表单
  document.getElementById('safety-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitSafety();
  });
  
  // 统计数据表单
  document.getElementById('statistics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitStatistics();
  });

  const destinationForm = document.getElementById('destination-form');
  if (destinationForm) {
    destinationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitDestination();
    });
  }

  const destinationCoverInput = document.getElementById('destination-cover-image');
  if (destinationCoverInput) {
    destinationCoverInput.addEventListener('change', previewDestinationCover);
  }

  // 为4张展示图片添加change事件监听器
  [1, 2, 3, 4].forEach(index => {
    const galleryInput = document.getElementById(`destination-gallery-image-${index}`);
    if (galleryInput) {
      galleryInput.addEventListener('change', () => previewDestinationGalleryImage(index));
    }
  });
}

// 使用事件委托：在 document 上监听点击，避免按钮在隐藏模块内时绑定失效
function initDeleteButtons() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#policy-delete-btn, #news-delete-btn, #safety-delete-btn, #statistics-delete-btn, #destination-delete-btn, #reply-delete-btn, #clear-cache-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.id === 'policy-delete-btn') deleteCurrentPolicy();
    else if (btn.id === 'news-delete-btn') deleteCurrentNews();
    else if (btn.id === 'safety-delete-btn') deleteCurrentSafetyAlert();
    else if (btn.id === 'statistics-delete-btn') deleteCurrentStatistic();
    else if (btn.id === 'destination-delete-btn') deleteCurrentDestination();
    else if (btn.id === 'reply-delete-btn') deleteCurrentReply();
    else if (btn.id === 'clear-cache-btn') forceClearCacheAndReload();
  });
}

// 初始化编辑器懒加载按钮
function initEditorToggleButtons() {
  // 定义每个编辑器的placeholder配置
  const editorConfigs = {
    'policy-content': '请输入政策法规内容...',
    'news-content': '请输入新闻资讯内容...',
    'destination-description': '请输入旅游目的地的详细介绍...',
    'destination-features': '请输入旅游目的地特色亮点，可使用富文本排版...',
    'safety-description': '请输入安全隐患的详细描述...',
    'safety-prevention': '请输入预防措施...',
    'safety-plan': '请输入应急预案...',
    'reply-content': '请输入回复内容...'
  };
  
  // 使用事件委托监听所有编辑按钮的点击
  document.addEventListener('click', async function(e) {
    const btn = e.target.closest('.editor-toggle-btn');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const editorId = btn.getAttribute('data-editor-id');
    if (!editorId) return;
    
    console.log(`用户点击了编辑器按钮: ${editorId}`);
    
    // 显示加载状态
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
    btn.disabled = true;
    
    try {
      // 懒加载初始化编辑器
      await lazyInitEditor(editorId, editorConfigs[editorId] || '请输入内容...');
      
      // 如果textarea中有内容，自动填充到编辑器
      const textarea = document.getElementById(editorId);
      if (textarea && textarea.value) {
        window.CKEditorSuperHelper.setContent(editorId, textarea.value);
      }
    } catch (error) {
      console.error('初始化编辑器失败:', error);
      showNotification('编辑器初始化失败，请刷新页面重试', 'error');
      // 恢复按钮状态
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

// 提交政策法规
async function submitPolicy() {
  try {
    const tags = document.getElementById('policy-tags').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    // 获取日期并转换为 ISO 8601 格式
    const dateValue = document.getElementById('policy-date').value;
    if (!dateValue) {
      showNotification('请选择发布日期', 'error');
      return;
    }
    
    // 转换为 ISO 8601 格式: YYYY-MM-DDTHH:mm:ss
    const publishDate = new Date(dateValue).toISOString();
    
    const data = {
      title: document.getElementById('policy-title').value,
      level: document.getElementById('policy-level').value,
      category: document.getElementById('policy-category').value,
      department: document.getElementById('policy-department').value,
      publish_date: publishDate,
      content: (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['policy-content']) ? window.CKEditorSuperHelper.getContent('policy-content') : document.getElementById('policy-content').value,
      file_url: document.getElementById('policy-url').value || '',
      tags: tags
    };
    
    console.log('提交政策数据:', data);
    if (currentPolicyEditingId) {
      await api.updatePolicy(currentPolicyEditingId, data);
      showNotification('政策法规修改成功', 'success');
    } else {
      await api.createPolicy(data);
      showNotification('政策法规添加成功', 'success');
    }
    resetPolicyFormState();
    clearFormCache('policy'); // ✨ 清除缓存
    // 重新加载列表
    loadPoliciesForAdmin();
  } catch (error) {
    console.error('添加政策失败:', error);
    showNotification('添加失败：' + error.message, 'error');
  }
}

function resetPolicyFormState() {
  const form = document.getElementById('policy-form');
  if (form) form.reset();
  currentPolicyEditingId = null;
  const titleEl = document.querySelector('#policy-module .card-title');
  if (titleEl) titleEl.textContent = '添加政策法规';
  const submitBtn = document.querySelector('#policy-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '提交';
  const deleteBtn = document.getElementById('policy-delete-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';
}

async function editPolicy(id) {
  try {
    const policy = await api.getPolicy(id);
    currentPolicyEditingId = id;

    document.getElementById('policy-title').value = policy.title || '';
    document.getElementById('policy-level').value = policy.level || '';
    document.getElementById('policy-category').value = policy.category || '';
    document.getElementById('policy-department').value = policy.department || '';
    // 将时间转为 yyyy-MM-dd 形式填到 date 输入框
    document.getElementById('policy-date').value = formatDate(policy.publish_date);
    
    // 设置内容到textarea（如果编辑器未初始化）
    document.getElementById('policy-content').value = policy.content || '';
    
    document.getElementById('policy-url').value = policy.file_url || '';
    document.getElementById('policy-tags').value = (policy.tags || []).join(',');

    const titleEl = document.querySelector('#policy-module .card-title');
    if (titleEl) titleEl.textContent = '编辑政策法规';
    const submitBtn = document.querySelector('#policy-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('policy-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // 滚动到政策法规管理区域
    document.getElementById('policy-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // ✨ 缓存所有表单数据（F5刷新后自动恢复）
    saveToCache('policy-title', policy.title || '');
    saveToCache('policy-level', policy.level || '');
    saveToCache('policy-category', policy.category || '');
    saveToCache('policy-department', policy.department || '');
    saveToCache('policy-date', formatDate(policy.publish_date));
    saveToCache('policy-content', policy.content || '');
    saveToCache('policy-url', policy.file_url || '');
    saveToCache('policy-tags', (policy.tags || []).join(','));
    console.log('✨ 已缓存政策编辑数据');
    
    // 自动初始化富文本编辑器
    setTimeout(async () => {
      try {
        if (!window.CKEditorSuperHelper || 
            !window.CKEditorSuperHelper.editorInstances['policy-content'] ||
            window.CKEditorSuperHelper.editorInstances['policy-content']._destroyed) {
          console.log('正在自动初始化政策编辑器...');
          await lazyInitEditor('policy-content', '请输入政策法规内容...');
          
          // 填充内容
          if (policy.content) {
            window.CKEditorSuperHelper.setContent('policy-content', policy.content);
          }
        } else {
          // 编辑器已存在，直接设置内容
          window.CKEditorSuperHelper.setContent('policy-content', policy.content || '');
        }
      } catch (error) {
        console.error('自动初始化政策编辑器失败:', error);
      }
    }, 300);
  } catch (error) {
    console.error('加载政策详情用于编辑失败:', error);
    showNotification('加载政策详情失败', 'error');
  }
}

async function deleteCurrentPolicy() {
  if (!currentPolicyEditingId) {
    showNotification('请先选择要编辑的政策', 'error');
    return;
  }
  
  const confirmed = await showConfirm({
    title: '删除政策',
    message: '确定要删除当前这条政策吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deletePolicy(currentPolicyEditingId);
    showNotification('删除成功', 'success');
    resetPolicyFormState();
    clearFormCache('policy'); // ✨ 清除缓存
    loadPoliciesForAdmin();
  } catch (error) {
    console.error('删除当前政策失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 提交新闻资讯
async function submitNews() {
  try {
    const tags = document.getElementById('news-tags').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    // 获取发布日期
    const dateValue = document.getElementById('news-date').value;
    const publishDate = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();
    
    const data = {
      title: document.getElementById('news-title').value,
      category: document.getElementById('news-category').value,
      author: document.getElementById('news-author').value,
      cover_image: document.getElementById('news-cover').value || '',
      content: (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['news-content']) ? window.CKEditorSuperHelper.getContent('news-content') : document.getElementById('news-content').value,
      tags: tags,
      publish_date: publishDate,
    };
    
    console.log('提交新闻数据:', data);
    if (currentNewsEditingId) {
      // 保留原有的发布日期和浏览次数
      if (currentNewsEditingData) {
        data.publish_date = currentNewsEditingData.publish_date;
        data.views = currentNewsEditingData.views;
      }
      await api.updateNews(currentNewsEditingId, data);
      showNotification('新闻修改成功', 'success');
    } else {
      await api.createNews(data);
      showNotification('新闻发布成功', 'success');
    }
    resetNewsFormState();
    clearFormCache('news'); // ✨ 清除缓存
    loadNewsForAdmin();
  } catch (error) {
    console.error('发布新闻失败:', error);
    showNotification('发布失败：' + error.message, 'error');
  }
}

function resetNewsFormState() {
  const form = document.getElementById('news-form');
  if (form) form.reset();
  currentNewsEditingId = null;
  currentNewsEditingData = null;
  const titleEl = document.querySelector('#news-module .card-title');
  if (titleEl) titleEl.textContent = '发布新闻';
  const submitBtn = document.querySelector('#news-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '发布';
   const deleteBtn = document.getElementById('news-delete-btn');
   if (deleteBtn) deleteBtn.style.display = 'none';
}

async function editNews(id) {
  try {
    const news = await api.getNewsItem(id);
    currentNewsEditingId = id;
    currentNewsEditingData = news;

    document.getElementById('news-title').value = news.title || '';
    document.getElementById('news-category').value = news.category || '';
    document.getElementById('news-author').value = news.author || '';
    document.getElementById('news-cover').value = news.cover_image || '';
    
    // 设置内容到textarea（如果编辑器未初始化）
    document.getElementById('news-content').value = news.content || '';
    
    document.getElementById('news-tags').value = (news.tags || []).join(',');

    const titleEl = document.querySelector('#news-module .card-title');
    if (titleEl) titleEl.textContent = '编辑新闻';
    const submitBtn = document.querySelector('#news-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('news-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // 滚动到新闻资讯管理区域
    document.getElementById('news-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // ✨ 缓存所有表单数据（F5刷新后自动恢复）
    saveToCache('news-title', news.title || '');
    saveToCache('news-category', news.category || '');
    saveToCache('news-author', news.author || '');
    saveToCache('news-cover', news.cover_image || '');
    saveToCache('news-content', news.content || '');
    saveToCache('news-tags', (news.tags || []).join(','));
    console.log('✨ 已缓存新闻编辑数据');
    
    // 自动初始化富文本编辑器
    setTimeout(async () => {
      try {
        if (!window.CKEditorSuperHelper || 
            !window.CKEditorSuperHelper.editorInstances['news-content'] ||
            window.CKEditorSuperHelper.editorInstances['news-content']._destroyed) {
          console.log('正在自动初始化新闻编辑器...');
          await lazyInitEditor('news-content', '请输入新闻资讯内容...');
          
          // 填充内容
          if (news.content) {
            window.CKEditorSuperHelper.setContent('news-content', news.content);
          }
        } else {
          // 编辑器已存在，直接设置内容
          window.CKEditorSuperHelper.setContent('news-content', news.content || '');
        }
      } catch (error) {
        console.error('自动初始化新闻编辑器失败:', error);
      }
    }, 300);
  } catch (error) {
    console.error('加载新闻详情用于编辑失败:', error);
    showNotification('加载新闻详情失败', 'error');
  }
}

async function deleteCurrentNews() {
  if (!currentNewsEditingId) {
    showNotification('请先选择要编辑的新闻', 'error');
    return;
  }
  
  const confirmed = await showConfirm({
    title: '删除新闻',
    message: '确定要删除当前这条新闻吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteNews(currentNewsEditingId);
    showNotification('删除成功', 'success');
    resetNewsFormState();
    clearFormCache('news'); // ✨ 清除缓存
    loadNewsForAdmin();
  } catch (error) {
    console.error('删除当前新闻失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 提交安全隐患
async function submitSafety() {
  try {
    // 使用当前时间作为报告日期
    const reportDate = new Date().toISOString();
    
    const data = {
      title: document.getElementById('safety-title').value,
      risk_level: document.getElementById('safety-risk').value,
      category: document.getElementById('safety-category').value,
      description: document.getElementById('safety-description').value,
      prevention: document.getElementById('safety-prevention').value,
      emergency_plan: document.getElementById('safety-plan').value,
      status: document.getElementById('safety-status').value,
      report_date: reportDate
    };
    
    console.log('提交安全隐患数据:', data);
    if (currentSafetyEditingId) {
      // 保留原有报告时间
      if (currentSafetyEditingData) {
        data.report_date = currentSafetyEditingData.report_date;
      }
      await api.updateSafetyAlert(currentSafetyEditingId, data);
      showNotification('安全隐患修改成功', 'success');
    } else {
      await api.createSafetyAlert(data);
      showNotification('安全隐患添加成功', 'success');
    }
    resetSafetyFormState();
    clearFormCache('safety'); // ✨ 清除缓存
    loadSafetyAlertsForAdmin();
  } catch (error) {
    console.error('添加安全隐患失败:', error);
    showNotification('添加失败：' + error.message, 'error');
  }
}

function resetSafetyFormState() {
  const form = document.getElementById('safety-form');
  if (form) form.reset();
  currentSafetyEditingId = null;
  currentSafetyEditingData = null;
  const titleEl = document.querySelector('#safety-module .card-title');
  if (titleEl) titleEl.textContent = '添加安全隐患';
  const submitBtn = document.querySelector('#safety-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '提交';
  const deleteBtn = document.getElementById('safety-delete-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';
}

async function editSafetyAlert(id) {
  try {
    const alert = await api.getSafetyAlert(id);
    currentSafetyEditingId = id;
    currentSafetyEditingData = alert;

    document.getElementById('safety-title').value = alert.title || '';
    document.getElementById('safety-risk').value = alert.risk_level || '中';
    document.getElementById('safety-category').value = alert.category || '';
    
    // 设置内容到textarea（如果编辑器未初始化）
    document.getElementById('safety-description').value = alert.description || '';
    document.getElementById('safety-prevention').value = alert.prevention || '';
    document.getElementById('safety-plan').value = alert.emergency_plan || '';
    
    document.getElementById('safety-status').value = alert.status || '待处理';

    const titleEl = document.querySelector('#safety-module .card-title');
    if (titleEl) titleEl.textContent = '编辑安全隐患';
    const submitBtn = document.querySelector('#safety-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('safety-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // 滚动到安全隐患管理区域
    document.getElementById('safety-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // ✨ 缓存所有表单数据（F5刷新后自动恢复）
    saveToCache('safety-title', alert.title || '');
    saveToCache('safety-risk', alert.risk_level || '中');
    saveToCache('safety-category', alert.category || '');
    saveToCache('safety-description', alert.description || '');
    saveToCache('safety-prevention', alert.prevention || '');
    saveToCache('safety-plan', alert.emergency_plan || '');
    saveToCache('safety-status', alert.status || '待处理');
    console.log('✨ 已缓存安全隐患编辑数据');
    
    // 自动初始化富文本编辑器（三个字段）
    setTimeout(async () => {
      try {
        const editors = [
          { id: 'safety-description', placeholder: '请输入安全隐患的详细描述...', content: alert.description },
          { id: 'safety-prevention', placeholder: '请输入预防措施...', content: alert.prevention },
          { id: 'safety-plan', placeholder: '请输入应急预案...', content: alert.emergency_plan }
        ];
        
        for (const editor of editors) {
          if (!window.CKEditorSuperHelper || 
              !window.CKEditorSuperHelper.editorInstances[editor.id] ||
              window.CKEditorSuperHelper.editorInstances[editor.id]._destroyed) {
            console.log(`正在自动初始化安全隐患编辑器: ${editor.id}`);
            await lazyInitEditor(editor.id, editor.placeholder);
            
            // 填充内容
            if (editor.content) {
              window.CKEditorSuperHelper.setContent(editor.id, editor.content);
            }
          } else {
            // 编辑器已存在，直接设置内容
            window.CKEditorSuperHelper.setContent(editor.id, editor.content || '');
          }
        }
      } catch (error) {
        console.error('自动初始化安全隐患编辑器失败:', error);
      }
    }, 300);
  } catch (error) {
    console.error('加载安全隐患详情用于编辑失败:', error);
    showNotification('加载安全隐患详情失败', 'error');
  }
}

async function deleteCurrentSafetyAlert() {
  if (!currentSafetyEditingId) {
    showNotification('请先选择要编辑的安全隐患', 'error');
    return;
  }
  
  const confirmed = await showConfirm({
    title: '删除安全隐患',
    message: '确定要删除当前这条安全隐患记录吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteSafetyAlert(currentSafetyEditingId);
    showNotification('删除成功', 'success');
    resetSafetyFormState();
    clearFormCache('safety'); // ✨ 清除缓存
    loadSafetyAlertsForAdmin();
  } catch (error) {
    console.error('删除当前安全隐患失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 提交统计数据
async function submitStatistics() {
  try {
    const data = {
      region: document.getElementById('stat-region').value,
      year: parseInt(document.getElementById('stat-year').value),
      tourist_count: parseFloat(document.getElementById('stat-tourists').value),
      revenue: parseFloat(document.getElementById('stat-revenue').value),
      flight_count: parseInt(document.getElementById('stat-flights').value),
      aircraft_count: parseInt(document.getElementById('stat-aircraft').value),
      growth_rate: parseFloat(document.getElementById('stat-growth').value)
    };
    
    console.log('提交统计数据:', data);
    if (currentStatisticEditingId) {
      await api.updateStatistic(currentStatisticEditingId, data);
      showNotification('统计数据修改成功', 'success');
    } else {
      await api.createStatistic(data);
      showNotification('统计数据添加成功', 'success');
    }
    resetStatisticFormState();
    clearFormCache('stat'); // ✨ 清除缓存
    loadStatisticsForAdmin();
  } catch (error) {
    console.error('添加统计数据失败:', error);
    showNotification('添加失败：' + error.message, 'error');
  }
}

function resetStatisticFormState() {
  const form = document.getElementById('statistics-form');
  if (form) form.reset();
  currentStatisticEditingId = null;
  const titleEl = document.querySelector('#statistics-module .card-title');
  if (titleEl) titleEl.textContent = '添加统计数据';
  const submitBtn = document.querySelector('#statistics-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '提交';
  const deleteBtn = document.getElementById('statistics-delete-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';
}

async function editStatistic(id) {
  try {
    const stat = await api.getStatistic(id);
    currentStatisticEditingId = id;

    document.getElementById('stat-region').value = stat.region || '';
    document.getElementById('stat-year').value = stat.year || '';
    document.getElementById('stat-tourists').value = stat.tourist_count || '';
    document.getElementById('stat-revenue').value = stat.revenue || '';
    document.getElementById('stat-flights').value = stat.flight_count || '';
    document.getElementById('stat-aircraft').value = stat.aircraft_count || '';
    document.getElementById('stat-growth').value = stat.growth_rate || '';

    const titleEl = document.querySelector('#statistics-module .card-title');
    if (titleEl) titleEl.textContent = '编辑统计数据';
    const submitBtn = document.querySelector('#statistics-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('statistics-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // 滚动到统计数据管理区域
    document.getElementById('statistics-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // ✨ 缓存所有表单数据（F5刷新后自动恢复）
    saveToCache('stat-region', stat.region || '');
    saveToCache('stat-year', stat.year || '');
    saveToCache('stat-tourists', stat.tourist_count || '');
    saveToCache('stat-revenue', stat.revenue || '');
    saveToCache('stat-flights', stat.flight_count || '');
    saveToCache('stat-aircraft', stat.aircraft_count || '');
    saveToCache('stat-growth', stat.growth_rate || '');
    console.log('✨ 已缓存统计数据编辑数据');
  } catch (error) {
    console.error('加载统计数据详情用于编辑失败:', error);
    showNotification('加载统计数据详情失败', 'error');
  }
}

async function deleteCurrentStatistic() {
  if (!currentStatisticEditingId) {
    showNotification('请先选择要编辑的统计记录', 'error');
    return;
  }
  
  const confirmed = await showConfirm({
    title: '删除统计记录',
    message: '确定要删除当前这条统计记录吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteStatistic(currentStatisticEditingId);
    showNotification('删除成功', 'success');
    resetStatisticFormState();
    clearFormCache('stat'); // ✨ 清除缓存
    loadStatisticsForAdmin();
  } catch (error) {
    console.error('删除当前统计记录失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// ===== 政策法规列表 & 删除 =====

async function loadPoliciesForAdmin() {
  const container = document.getElementById('policy-list-container');
  if (!container) return;

  try {
    showLoading(container);
    const response = await api.getPolicies({ limit: 50, sort: '-created_at' });
    if (response.data && response.data.length > 0) {
      renderPoliciesForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无政策数据</div></div>';
    }
  } catch (error) {
    console.error('加载政策列表失败:', error);
    showError(container);
  }
}

function renderPoliciesForAdmin(container, policies) {
  const html = policies.map(policy => `
    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-weight: 500;">${escapeHtml(policy.title)}</div>
        <div class="list-item-meta">
          <span><i class="fas fa-building"></i> ${escapeHtml(policy.department || '未知部门')}</span>
          <span><i class="fas fa-layer-group"></i> ${escapeHtml(policy.level || '未分类')}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(policy.publish_date)}</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="editPolicy('${policy.id}')">
          <i class="fas fa-edit"></i> 修改
        </button>
        <button class="btn btn-secondary" onclick="deletePolicy('${policy.id}')">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function deletePolicy(id) {
  const confirmed = await showConfirm({
    title: '删除政策',
    message: '确定要删除该政策吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deletePolicy(id);
    showNotification('删除成功', 'success');
    loadPoliciesForAdmin();
  } catch (error) {
    console.error('删除政策失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// ===== 新闻资讯列表 & 删除 =====

async function loadNewsForAdmin() {
  const container = document.getElementById('news-list-container');
  if (!container) return;

  try {
    showLoading(container);
    const response = await api.getNews({ limit: 50, sort: '-created_at' });
    if (response.data && response.data.length > 0) {
      renderNewsForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无新闻</div></div>';
    }
  } catch (error) {
    console.error('加载新闻列表失败:', error);
    showError(container);
  }
}

function renderNewsForAdmin(container, newsItems) {
  const html = newsItems.map(item => `
    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-weight: 500;">${escapeHtml(item.title)}</div>
        <div class="list-item-meta">
          <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
          <span><i class="fas fa-user"></i> ${escapeHtml(item.author || '未知')}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(item.publish_date)}</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="editNews('${item.id}')">
          <i class="fas fa-edit"></i> 修改
        </button>
        <button class="btn btn-secondary" onclick="deleteNews('${item.id}')">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function deleteNews(id) {
  const confirmed = await showConfirm({
    title: '删除新闻',
    message: '确定要删除该新闻吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteNews(id);
    showNotification('删除成功', 'success');
    loadNewsForAdmin();
  } catch (error) {
    console.error('删除新闻失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// ===== 安全隐患列表 & 删除 =====

async function loadSafetyAlertsForAdmin() {
  const container = document.getElementById('safety-list-container');
  if (!container) return;

  try {
    showLoading(container);
    const response = await api.getSafetyAlerts({ limit: 50, sort: '-created_at' });
    if (response.data && response.data.length > 0) {
      renderSafetyAlertsForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无安全隐患</div></div>';
    }
  } catch (error) {
    console.error('加载安全隐患列表失败:', error);
    showError(container);
  }
}

function renderSafetyAlertsForAdmin(container, alerts) {
  const html = alerts.map(alert => `
    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-weight: 500;">${escapeHtml(alert.title)}</div>
        <div class="list-item-meta">
          <span><i class="fas fa-layer-group"></i> ${escapeHtml(alert.category || '未分类')}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(alert.report_date)}</span>
          <span><i class="fas fa-info-circle"></i> ${escapeHtml(alert.status || '待处理')}</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="editSafetyAlert('${alert.id}')">
          <i class="fas fa-edit"></i> 修改
        </button>
        <button class="btn btn-secondary" onclick="deleteSafetyAlert('${alert.id}')">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function deleteSafetyAlert(id) {
  const confirmed = await showConfirm({
    title: '删除安全隐患',
    message: '确定要删除该安全隐患记录吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteSafetyAlert(id);
    showNotification('删除成功', 'success');
    loadSafetyAlertsForAdmin();
  } catch (error) {
    console.error('删除安全隐患失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// ===== 统计数据列表 & 删除 =====

async function loadStatisticsForAdmin() {
  const container = document.getElementById('statistics-list-container');
  if (!container) return;

  try {
    showLoading(container);
    const response = await api.getStatistics({ limit: 50, sort: '-year' });
    if (response.data && response.data.length > 0) {
      renderStatisticsForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无统计数据</div></div>';
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    showError(container);
  }
}

function renderStatisticsForAdmin(container, stats) {
  const html = stats.map(stat => `
    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-weight: 500;">
          ${escapeHtml(stat.region)} - ${stat.year}
        </div>
        <div class="list-item-meta">
          <span><i class="fas fa-users"></i> 游客 ${stat.tourist_count} 万人次</span>
          <span><i class="fas fa-yen-sign"></i> 营收 ${stat.revenue} 万元</span>
          <span><i class="fas fa-percentage"></i> 增长率 ${stat.growth_rate}%</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="editStatistic('${stat.id}')">
          <i class="fas fa-edit"></i> 修改
        </button>
        <button class="btn btn-secondary" onclick="deleteStatistic('${stat.id}')">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function deleteStatistic(id) {
  const confirmed = await showConfirm({
    title: '删除统计记录',
    message: '确定要删除该统计记录吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteStatistic(id);
    showNotification('删除成功', 'success');
    loadStatisticsForAdmin();
  } catch (error) {
    console.error('删除统计记录失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

function buildDestinationFormData() {
  const formData = new FormData();
  const coverInput = document.getElementById('destination-cover-image');
  const coverFile = coverInput.files && coverInput.files[0];
  const galleryInputs = [1, 2, 3, 4].map(index => document.getElementById(`destination-gallery-image-${index}`));

  formData.append('name', document.getElementById('destination-name').value.trim());
  formData.append('city', document.getElementById('destination-city').value.trim());
  formData.append('location', document.getElementById('destination-location').value.trim());
  formData.append('country', document.getElementById('destination-country').value.trim() || '中国');
  formData.append('state', document.getElementById('destination-state').value.trim());
  formData.append('category', document.getElementById('destination-category').value.trim());
  formData.append('price_range', document.getElementById('destination-price-range').value.trim());
  formData.append('duration', document.getElementById('destination-duration').value.trim());
  formData.append('best_season', document.getElementById('destination-best-season').value.trim());
  formData.append('rating', document.getElementById('destination-rating').value || '4.9');
  // recommendation_type现在是多选，从checkbox获取
  const checkedTypes = Array.from(document.querySelectorAll('input[name="recommendation_type"]:checked')).map(cb => cb.value);
  // 确保始终包含default
  if (!checkedTypes.includes('default')) {
    checkedTypes.push('default');
  }
  formData.append('recommendation_type', JSON.stringify(checkedTypes));
  formData.append('sort_order', document.getElementById('destination-sort-order').value || '0');
  formData.append('is_featured', document.getElementById('destination-is-featured').value);
  formData.append('is_hot', document.getElementById('destination-is-hot').value);
  formData.append(
    'description',
    (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['destination-description'])
      ? window.CKEditorSuperHelper.getContent('destination-description')
      : document.getElementById('destination-description').value.trim()
  );
  formData.append(
    'features_display',
    (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['destination-features'])
      ? window.CKEditorSuperHelper.getContent('destination-features')
      : document.getElementById('destination-features').value.trim()
  );
  formData.append('views', String(currentDestinationEditingData?.views || 0));

  if (coverFile) {
    formData.append('cover_image', coverFile);
  }

  galleryInputs.forEach((input, index) => {
    const file = input?.files && input.files[0];
    if (file) {
      formData.append(`gallery_image_${index + 1}`, file);
    }
  });

  return formData;
}

function previewDestinationCover() {
  const input = document.getElementById('destination-cover-image');
  const uploadBox = document.getElementById('destination-cover-upload-box');
  const preview = document.getElementById('destination-cover-preview');
  const previewImage = document.getElementById('destination-cover-preview-img');
  const fileNameEl = document.getElementById('destination-cover-file-name');
  const file = input.files && input.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    previewImage.src = event.target.result;
    if (fileNameEl) {
      fileNameEl.textContent = file.name;
    }
    // 隐藏上传框，显示预览
    if (uploadBox) uploadBox.style.display = 'none';
    if (preview) preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// 修改封面图片
function editDestinationCover() {
  const input = document.getElementById('destination-cover-image');
  if (input) {
    input.click();
  }
}

// 删除封面图片
function removeDestinationCover() {
  const input = document.getElementById('destination-cover-image');
  const uploadBox = document.getElementById('destination-cover-upload-box');
  const preview = document.getElementById('destination-cover-preview');
  const previewImage = document.getElementById('destination-cover-preview-img');
  const fileNameEl = document.getElementById('destination-cover-file-name');
  
  if (input) {
    input.value = '';
  }
  if (previewImage) {
    previewImage.src = '';
  }
  if (fileNameEl) {
    fileNameEl.textContent = '';
  }
  // 显示上传框，隐藏预览
  if (uploadBox) uploadBox.style.display = 'block';
  if (preview) preview.style.display = 'none';
}

// 预览展示图片
function previewDestinationGalleryImage(index) {
  const input = document.getElementById(`destination-gallery-image-${index}`);
  const uploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
  const preview = document.getElementById(`destination-gallery-preview-${index}`);
  const previewImage = document.getElementById(`destination-gallery-preview-img-${index}`);
  const fileNameEl = document.getElementById(`destination-gallery-file-name-${index}`);
  const file = input.files && input.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    previewImage.src = event.target.result;
    if (fileNameEl) {
      fileNameEl.textContent = file.name;
    }
    // 隐藏上传框，显示预览
    if (uploadBox) uploadBox.style.display = 'none';
    if (preview) preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// 修改展示图片
function editDestinationGalleryImage(index) {
  const input = document.getElementById(`destination-gallery-image-${index}`);
  if (input) {
    input.click();
  }
}

// 删除展示图片
function removeDestinationGalleryImage(index) {
  const input = document.getElementById(`destination-gallery-image-${index}`);
  const uploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
  const preview = document.getElementById(`destination-gallery-preview-${index}`);
  const previewImage = document.getElementById(`destination-gallery-preview-img-${index}`);
  const fileNameEl = document.getElementById(`destination-gallery-file-name-${index}`);
  
  if (input) {
    input.value = '';
  }
  if (previewImage) {
    previewImage.src = '';
  }
  if (fileNameEl) {
    fileNameEl.textContent = '';
  }
  // 显示上传框，隐藏预览
  if (uploadBox) uploadBox.style.display = 'block';
  if (preview) preview.style.display = 'none';
}

async function submitDestination() {
  try {
    const data = buildDestinationFormData();

    if (currentDestinationEditingId) {
      await api.updateDestination(currentDestinationEditingId, data);
      showNotification('旅游目的地修改成功', 'success');
    } else {
      await api.createDestination(data);
      showNotification('旅游目的地添加成功', 'success');
    }

    resetDestinationFormState();
    clearFormCache('destination'); // ✨ 清除缓存
    loadDestinationsForAdmin();
  } catch (error) {
    console.error('提交旅游目的地失败:', error);
    showNotification('提交失败：' + error.message, 'error');
  }
}

function resetDestinationFormState() {
  const form = document.getElementById('destination-form');
  if (form) form.reset();
  // 重置推荐类型复选框 - 默认推荐始终选中但隐藏
  document.querySelectorAll('input[name="recommendation_type"]').forEach(cb => {
    cb.checked = cb.value === 'default'; // 默认只选中default
  });
  // 确保默认推荐的checkbox状态正确（虽然它被隐藏）
  const defaultCheckbox = document.querySelector('input[name="recommendation_type"][value="default"]');
  if (defaultCheckbox) {
    defaultCheckbox.checked = true;
  }
  currentDestinationEditingId = null;
  currentDestinationEditingData = null;
  const titleEl = document.querySelector('#destination-module .card-title');
  if (titleEl) titleEl.textContent = '新增旅游目的地';
  const submitBtn = document.querySelector('#destination-form button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '提交';
  const deleteBtn = document.getElementById('destination-delete-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';
  const preview = document.getElementById('destination-cover-preview');
  const previewImage = document.getElementById('destination-cover-preview-img');
  const fileNameEl = document.getElementById('destination-cover-file-name');
  const uploadBox = document.getElementById('destination-cover-upload-box');
  if (preview) preview.style.display = 'none';
  if (previewImage) previewImage.src = '';
  if (fileNameEl) fileNameEl.textContent = '';
  if (uploadBox) uploadBox.style.display = 'block';

  [1, 2, 3, 4].forEach(index => {
    const galleryPreview = document.getElementById(`destination-gallery-preview-${index}`);
    const galleryImage = document.getElementById(`destination-gallery-preview-img-${index}`);
    const galleryFileName = document.getElementById(`destination-gallery-file-name-${index}`);
    const galleryUploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
    if (galleryPreview) galleryPreview.style.display = 'none';
    if (galleryImage) galleryImage.src = '';
    if (galleryFileName) galleryFileName.textContent = '';
    if (galleryUploadBox) galleryUploadBox.style.display = 'block';
  });

  // 优化：使用批量设置内容清空编辑器
  if (window.CKEditorSuperHelper && window.CKEditorSuperHelper.batchSetContent) {
    window.CKEditorSuperHelper.batchSetContent({
      'destination-description': '',
      'destination-features': ''
    });
  }
}

async function editDestination(id) {
  try {
    const destination = await api.getDestination(id);
    currentDestinationEditingId = id;
    currentDestinationEditingData = destination;

    document.getElementById('destination-name').value = destination.name || '';
    document.getElementById('destination-city').value = destination.city || '';
    document.getElementById('destination-location').value = destination.location || '';
    document.getElementById('destination-country').value = destination.country || '中国';
    document.getElementById('destination-state').value = destination.state || '';
    document.getElementById('destination-category').value = destination.category || '';
    document.getElementById('destination-price-range').value = destination.price_range || '';
    document.getElementById('destination-duration').value = destination.duration || '';
    document.getElementById('destination-best-season').value = destination.best_season || '';
    document.getElementById('destination-rating').value = destination.rating || 4.9;
    // 处理多选推荐类型 - 确保default始终被选中
    const recTypes = Array.isArray(destination.recommendation_type) ? destination.recommendation_type : [destination.recommendation_type];
    document.querySelectorAll('input[name="recommendation_type"]').forEach(cb => {
      cb.checked = recTypes.includes(cb.value);
    });
    // 确保默认推荐始终选中（即使数据中没有）
    const defaultCheckbox = document.querySelector('input[name="recommendation_type"][value="default"]');
    if (defaultCheckbox && !defaultCheckbox.checked) {
      defaultCheckbox.checked = true;
    }
    document.getElementById('destination-sort-order').value = destination.sort_order || 0;
    document.getElementById('destination-is-featured').value = String(Boolean(destination.is_featured));
    document.getElementById('destination-is-hot').value = String(Boolean(destination.is_hot));
    
    // 设置内容到textarea（如果编辑器未初始化）
    document.getElementById('destination-description').value = destination.description || '';
    document.getElementById('destination-features').value = destination.features_display || (destination.features || []).join('\n');

    const preview = document.getElementById('destination-cover-preview');
    const previewImage = document.getElementById('destination-cover-preview-img');
    const fileNameEl = document.getElementById('destination-cover-file-name');
    const uploadBox = document.getElementById('destination-cover-upload-box');
    const coverUrl = destination.cover_image_url || destination.cover_image || '';
    previewImage.src = coverUrl;
    if (fileNameEl && coverUrl) {
      // 从 URL 中提取文件名
      const fileName = coverUrl.split('/').pop();
      fileNameEl.textContent = fileName || '已上传图片';
    }
    // 如果有图片，隐藏上传框，显示预览；否则显示上传框
    if (coverUrl) {
      if (uploadBox) uploadBox.style.display = 'none';
      if (preview) preview.style.display = 'block';
    } else {
      if (uploadBox) uploadBox.style.display = 'block';
      if (preview) preview.style.display = 'none';
    }

    [1, 2, 3, 4].forEach(index => {
      const galleryPreview = document.getElementById(`destination-gallery-preview-${index}`);
      const galleryImage = document.getElementById(`destination-gallery-preview-img-${index}`);
      const galleryFileName = document.getElementById(`destination-gallery-file-name-${index}`);
      const galleryUploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
      const imageUrl = destination[`gallery_image_${index}_url`] || destination[`gallery_image_${index}`] || '';
      if (galleryImage) galleryImage.src = imageUrl;
      if (galleryFileName && imageUrl) {
        // 从 URL 中提取文件名
        const fileName = imageUrl.split('/').pop();
        galleryFileName.textContent = fileName || '已上传图片';
      }
      // 如果有图片，隐藏上传框，显示预览；否则显示上传框
      if (imageUrl) {
        if (galleryUploadBox) galleryUploadBox.style.display = 'none';
        if (galleryPreview) galleryPreview.style.display = 'block';
      } else {
        if (galleryUploadBox) galleryUploadBox.style.display = 'block';
        if (galleryPreview) galleryPreview.style.display = 'none';
      }
    });

    const titleEl = document.querySelector('#destination-module .card-title');
    if (titleEl) titleEl.textContent = '编辑旅游目的地';
    const submitBtn = document.querySelector('#destination-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('destination-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    document.getElementById('destination-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // ✨ 缓存所有表单数据（F5刷新后自动恢复）
    saveToCache('destination-name', destination.name || '');
    saveToCache('destination-city', destination.city || '');
    saveToCache('destination-location', destination.location || '');
    saveToCache('destination-country', destination.country || '中国');
    saveToCache('destination-state', destination.state || '');
    saveToCache('destination-category', destination.category || '');
    saveToCache('destination-price-range', destination.price_range || '');
    saveToCache('destination-duration', destination.duration || '');
    saveToCache('destination-best-season', destination.best_season || '');
    saveToCache('destination-rating', destination.rating || 4.9);
    saveToCache('destination-sort-order', destination.sort_order || 0);
    saveToCache('destination-is-featured', String(Boolean(destination.is_featured)));
    saveToCache('destination-is-hot', String(Boolean(destination.is_hot)));
    saveToCache('destination-description', destination.description || '');
    saveToCache('destination-features', destination.features_display || (destination.features || []).join('\n'));
    
    // 缓存推荐类型（使用之前已定义的 recTypes）
    saveToCache('recommendation_types', recTypes);
    
    // ✨ 缓存图片状态（只标记有图片，不缓存Base64 URL）
    if (coverUrl) {
      saveToCache('destination-cover-has-image', true);
      const fileName = coverUrl.split('/').pop();
      saveToCache('destination-cover-file-name', fileName || '已上传图片');
    }
    
    [1, 2, 3, 4].forEach(index => {
      const imageUrl = destination[`gallery_image_${index}_url`] || destination[`gallery_image_${index}`] || '';
      if (imageUrl) {
        saveToCache(`destination-gallery-image-${index}-has-image`, true);
        const fileName = imageUrl.split('/').pop();
        saveToCache(`destination-gallery-image-${index}-name`, fileName || '已上传图片');
      }
    });
    
    console.log('✨ 已缓存旅游目的地编辑数据（图片仅保存标记，不保存Base64）');
    
    // 自动初始化富文本编辑器（两个字段）
    setTimeout(async () => {
      try {
        const editors = [
          { id: 'destination-description', placeholder: '请输入旅游目的地的详细介绍...', content: destination.description },
          { id: 'destination-features', placeholder: '请输入旅游目的地特色亮点，可使用富文本排版...', content: destination.features_display || '' }
        ];
        
        for (const editor of editors) {
          if (!window.CKEditorSuperHelper || 
              !window.CKEditorSuperHelper.editorInstances[editor.id] ||
              window.CKEditorSuperHelper.editorInstances[editor.id]._destroyed) {
            console.log(`正在自动初始化目的地编辑器: ${editor.id}`);
            await lazyInitEditor(editor.id, editor.placeholder);
            
            // 填充内容
            if (editor.content) {
              window.CKEditorSuperHelper.setContent(editor.id, editor.content);
            }
          } else {
            // 编辑器已存在，直接设置内容
            window.CKEditorSuperHelper.setContent(editor.id, editor.content || '');
          }
        }
      } catch (error) {
        console.error('自动初始化目的地编辑器失败:', error);
      }
    }, 300);
  } catch (error) {
    console.error('加载目的地详情失败:', error);
    showNotification('加载目的地详情失败', 'error');
  }
}

async function deleteCurrentDestination() {
  if (!currentDestinationEditingId) {
    showNotification('请先选择要编辑的目的地', 'error');
    return;
  }

  const confirmed = await showConfirm({
    title: '删除旅游目的地',
    message: '确定要删除当前这条旅游目的地吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteDestination(currentDestinationEditingId);
    showNotification('删除成功', 'success');
    resetDestinationFormState();
    clearFormCache('destination'); // ✨ 清除缓存
    loadDestinationsForAdmin();
  } catch (error) {
    console.error('删除当前目的地失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

async function loadDestinationsForAdmin() {
  const container = document.getElementById('destination-list-container');
  if (!container) return;

  try {
    showLoading(container);
    const response = await api.getDestinations({ limit: 100, sort: 'sort_order' });
    if (response.data && response.data.length > 0) {
      renderDestinationsForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无旅游目的地</div></div>';
    }
  } catch (error) {
    console.error('加载旅游目的地失败:', error);
    showError(container);
  }
}

function formatRecommendationTypes(types) {
  if (!types) return '未设置';
  const typeArray = Array.isArray(types) ? types : [types];
  const typeMap = {
    'default': '默认推荐',
    'nearby': 'IP周边',
    'managed': '管理员精选',
    'selected': '出行推荐'
  };
  return typeArray.map(t => typeMap[t] || t).join(', ');
}

function renderDestinationsForAdmin(container, destinations) {
  const html = destinations.map(item => `
    <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
      <div style="display:flex; gap:16px; align-items:center; flex:1;">
        <img src="${escapeHtml(item.cover_image_url || item.cover_image || '')}" alt="${escapeHtml(item.name)}" style="width:96px; height:72px; object-fit:cover; border-radius:12px; border:1px solid var(--border-color);">
        <div style="flex:1;">
          <div style="font-weight:500;">${escapeHtml(item.name)}</div>
          <div class="list-item-meta">
            <span><i class="fas fa-location-dot"></i> ${escapeHtml(item.city)} · ${escapeHtml(item.location || '')}</span>
            <span><i class="fas fa-globe"></i> ${item.is_domestic ? '国内' : '国际'}</span>
            <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
            <span><i class="fas fa-star"></i> ${item.rating || 0}</span>
            <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
            <span><i class="fas fa-layer-group"></i> ${formatRecommendationTypes(item.recommendation_type)}</span>
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="editDestination('${item.id}')">
          <i class="fas fa-edit"></i> 修改
        </button>
        <button class="btn btn-secondary" onclick="deleteDestination('${item.id}')">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function deleteDestination(id) {
  const confirmed = await showConfirm({
    title: '删除旅游目的地',
    message: '确定要删除该旅游目的地吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    await api.deleteDestination(id);
    showNotification('删除成功', 'success');
    loadDestinationsForAdmin();
  } catch (error) {
    console.error('删除旅游目的地失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 加载留言列表（管理员视图）
async function loadMessagesForAdmin() {
  const container = document.getElementById('messages-admin-container');
  
  try {
    showLoading(container);
    const response = await api.getMessages({ limit: 100, sort: '-created_at' });
    
    if (response.data && response.data.length > 0) {
      renderMessagesForAdmin(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无留言</div></div>';
    }
  } catch (error) {
    console.error('加载留言失败:', error);
    showError(container);
  }
}

// 渲染留言管理列表（管理员视图）
function renderMessagesForAdmin(container, messages) {
  const html = messages.map(msg => `
    <div class="card" data-message-id="${msg.id}" style="margin-bottom: 20px; ${msg.is_hidden ? 'opacity: 0.6; border: 2px solid #ff4444;' : ''}">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 20px; margin-bottom: 8px;">
            <i class="fas fa-user-circle"></i> ${escapeHtml(msg.user_nickname || '匿名用户')}
            ${msg.user ? `<span style="font-size: 14px; color: var(--text-secondary); font-weight: normal;"> (ID: ${msg.user})</span>` : ''}
          </h3>
          <div class="list-item-meta">
            <span><i class="fas fa-tag"></i> ${escapeHtml(msg.message_type)}</span>
            <span><i class="fas fa-clock"></i> ${formatDateTime(msg.created_at)}</span>
            <span><i class="fas fa-heart"></i> ${msg.likes_count || 0} 点赞</span>
            <span><i class="fas fa-comment"></i> ${msg.comments_count || 0} 评论</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
            ${escapeHtml(msg.status)}
          </span>
          ${msg.is_hidden ? '<span class="tag danger">已屏蔽</span>' : ''}
        </div>
      </div>
      
      <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
          <strong>发表者信息：</strong>
          <div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">
            <div><i class="fas fa-user"></i>  账号：${escapeHtml(msg.user_username || '未知')}</div>
            <div style="margin-top: 4px;"><i class="fas fa-envelope"></i> 邮箱：${escapeHtml(msg.user_email || '未填写')}</div>
            <div style="margin-top: 4px;"><i class="fas fa-phone"></i> 电话：${escapeHtml(msg.user_phone || '未填写')}</div>
          </div>
        </div>
        <strong>留言内容：</strong>
        <div class="rich-text-content" style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.content)}</div>
      </div>
      
      ${msg.reply ? `
        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
          <div class="rich-text-content" style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.reply)}</div>
        </div>
      ` : ''}
      
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <button 
            onclick="openReplyModal('${msg.id}')"
            class="btn btn-reply ${msg.reply ? 'reply-active' : ''}">
            <i class="fa-solid fa-reply"></i>
            ${msg.reply ? '修改回复' : '回复'}
          </button>
        
          <button 
            onclick="viewMessageComments('${msg.id}')"
            class="btn btn-comments">
            <i class="fa-solid fa-comments"></i>
            查看评论 (${msg.comments_count || 0})
            
          <button 
          onclick="toggleMessageHidden('${msg.id}', ${!!msg.is_hidden})"
          class="btn btn-visibility ${msg.is_hidden ? 'hidden-active' : ''}">
          <i class="fa-solid fa-${msg.is_hidden ? 'eye' : 'eye-slash'}"></i> 
          ${msg.is_hidden ? '取消屏蔽' : '屏蔽'}
        
        
        </button>
        <div class="dropdown-menu">
          <button class="dropdown-toggle" onclick="toggleAdminDropdown('admin-msg-menu-${msg.id}')">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="dropdown-content" id="admin-msg-menu-${msg.id}">
            ${msg.reply ? `
              <button class="dropdown-item danger" onclick="deleteMessageReply('${msg.id}')">
                <i class="fas fa-eraser"></i> 删除回复
              </button>
              <div class="dropdown-divider"></div>
            ` : ''}
            ${msg.comments_count > 0 ? `
              <button class="dropdown-item danger" onclick="clearAllComments('${msg.id}')">
                <i class="fas fa-broom"></i> 清空所有评论
              </button>
              <div class="dropdown-divider"></div>
            ` : ''}
            <button class="dropdown-item danger" onclick="deleteMessage('${msg.id}')">
              <i class="fas fa-trash"></i> 删除留言
            </button>
          </div>
        </div>
      </div>
      
      <div id="admin-comments-${msg.id}" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <!-- 评论将动态加载 -->
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// 打开回复/修改回复模态框
async function openReplyModal(messageId) {
  try {
    const message = await api.getMessage(messageId);
    currentReplyMessageId = messageId;
    
    const infoHtml = `
      <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <p><strong>昵称：</strong> ${escapeHtml(message.user_nickname || '匿名用户')}</p>
        <p style="margin-top: 8px;"><strong>用户ID：</strong> ${message.user || '未知'}</p>
        <p style="margin-top: 8px;"><strong>登录账号：</strong> ${escapeHtml(message.user_username || '未知')}</p>
        <p style="margin-top: 8px;"><strong>邮箱：</strong> ${escapeHtml(message.user_email || '未填写')}</p>
        <p style="margin-top: 8px;"><strong>电话：</strong> ${escapeHtml(message.user_phone || '未填写')}</p>
        <p style="margin-top: 8px;"><strong>类型：</strong> ${escapeHtml(message.message_type)}</p>
        <div style="margin-top: 8px;"><strong>内容：</strong></div>
        <div class="rich-text-content" style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 4px;">${formatRichTextContent(message.content)}</div>
      </div>
    `;
    
    document.getElementById('reply-message-info').innerHTML = infoHtml;
    
    // 设置回复内容（支持CKEditor）
    const replyContent = message.reply || '';
    if (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['reply-content']) {
      // 如果CKEditor已初始化，使用CKEditor API
      window.CKEditorSuperHelper.setContent('reply-content', replyContent);
    } else {
      // 否则直接设置textarea的值
      document.getElementById('reply-content').value = replyContent;
    }
    
    // 根据是否已有回复，更新模态框标题和提交按钮文字
    const isEditing = !!message.reply;
    const modalTitle = document.querySelector('#reply-modal .modal-title');
    if (modalTitle) modalTitle.textContent = isEditing ? '修改回复' : '回复留言';
    const submitBtn = document.getElementById('reply-submit-btn');
    if (submitBtn) submitBtn.textContent = isEditing ? '保存修改' : '提交回复';
    
    // 打开模态框
    replyModal.open();
    
    // 自动初始化回复内容的富文本编辑器（延迟执行，确保模态框已显示）
    setTimeout(async () => {
      try {
        // 检查编辑器是否已经初始化
        if (!window.CKEditorSuperHelper || 
            !window.CKEditorSuperHelper.editorInstances['reply-content'] ||
            window.CKEditorSuperHelper.editorInstances['reply-content']._destroyed) {
          console.log('正在自动初始化回复编辑器...');
          await lazyInitEditor('reply-content', '请输入回复内容...');
          
          // 如果textarea中有内容，自动填充到编辑器
          if (replyContent) {
            window.CKEditorSuperHelper.setContent('reply-content', replyContent);
          }
        }
      } catch (error) {
        console.error('自动初始化回复编辑器失败:', error);
      }
    }, 300);
  } catch (error) {
    console.error('加载留言详情失败:', error);
    showNotification('加载失败', 'error');
  }
}

// 提交回复 / 保存修改
async function submitReply() {
  // 获取回复内容（支持CKEditor）
  let replyContent;
  if (window.CKEditorSuperHelper && window.CKEditorSuperHelper.editorInstances['reply-content']) {
    // 如果CKEditor已初始化，使用CKEditor API
    replyContent = window.CKEditorSuperHelper.getContent('reply-content').trim();
  } else {
    // 否则直接获取textarea的值
    replyContent = document.getElementById('reply-content').value.trim();
  }
  
  if (!replyContent) {
    showNotification('请输入回复内容', 'error');
    return;
  }
  
  try {
    await api.replyMessage(currentReplyMessageId, replyContent);
    showNotification('保存成功', 'success');
    replyModal.close();
    
    // 不重新加载整个列表，只刷新当前留言的状态
    // 这样页面会保持在原来的位置
    const messageCard = document.querySelector(`[data-message-id="${currentReplyMessageId}"]`);
    if (messageCard) {
      // 更新留言卡片的状态和回复内容
      const message = await api.getMessage(currentReplyMessageId);
      const statusTag = messageCard.querySelector('.tag');
      if (statusTag) {
        statusTag.className = 'tag success';
        statusTag.textContent = '已回复';
      }
      
      // 更新回复按钮文字
      const replyBtn = messageCard.querySelector('[onclick*="openReplyModal"]');
      if (replyBtn) {
        replyBtn.innerHTML = '<i class="fa-solid fa-edit"></i> 修改回复';
      }
    }
  } catch (error) {
    console.error('回复/修改失败:', error);
    showNotification('保存失败，请稍后重试', 'error');
  }
}

// 删除留言
async function deleteMessage(id) {
  const confirmed = await showConfirm({
    title: '删除留言',
    message: '确定要删除该留言吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteMessage(id);
    showNotification('删除成功', 'success');
    loadMessagesForAdmin();
  } catch (error) {
    console.error('删除留言失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 切换留言屏蔽状态
async function toggleMessageHidden(messageId, isHidden) {
  const action = isHidden ? '取消屏蔽' : '屏蔽';
  
  const confirmed = await showConfirm({
    title: `${action}留言`,
    message: isHidden 
      ? '确定要取消屏蔽该留言吗？取消后该留言将在前台显示。'
      : '确定要屏蔽该留言吗？屏蔽后该留言将不会在前台显示。',
    confirmText: action,
    cancelText: '取消',
    type: isHidden ? 'info' : 'warning'
  });
  
  if (!confirmed) return;
  
  try {
    await api.updateMessage(messageId, { is_hidden: !isHidden });
    showNotification(`${action}成功`, 'success');
    loadMessagesForAdmin();
  } catch (error) {
    console.error(`${action}留言失败:`, error);
    showNotification(`${action}失败：` + error.message, 'error');
  }
}

// 在回复模态框中直接删除当前留言
async function deleteCurrentReply() {
  if (!currentReplyMessageId) {
    showNotification('请先选择要回复的留言', 'error');
    return;
  }
  
  const confirmed = await showConfirm({
    title: '删除留言',
    message: '确定要删除这条留言吗？删除后将无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteMessage(currentReplyMessageId);
    showNotification('删除成功', 'success');
    replyModal.close();
    loadMessagesForAdmin();
  } catch (error) {
    console.error('删除当前留言失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 查看留言的评论（管理员）
async function viewMessageComments(messageId) {
  const container = document.getElementById(`admin-comments-${messageId}`);
  if (!container) return;
  
  if (container.style.display === 'none') {
    container.style.display = 'block';
    await loadAdminMessageComments(messageId);
  } else {
    container.style.display = 'none';
  }
}

// 加载留言评论（管理员视图）
async function loadAdminMessageComments(messageId) {
  const container = document.getElementById(`admin-comments-${messageId}`);
  if (!container) return;
  
  try {
    const comments = await api.getMessageComments(messageId);
    
    if (comments && comments.length > 0) {
      const html = `
        <h4 style="margin-bottom: 12px; font-size: 16px; color: var(--primary-color);">
          <i class="fas fa-comments"></i> 评论列表 (${comments.length})
        </h4>
        ${comments.map(comment => `
          <div class="comment-item" style="position: relative; padding: 16px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 12px;">
            <div class="comment-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div class="comment-author" style="font-weight: 500; font-size: 14px;">
                  <i class="fas fa-user-circle"></i> ${escapeHtml(comment.user_nickname || '匿名用户')}
                  ${comment.user_is_staff ? '<span class="tag primary" style="margin-left: 8px; font-size: 12px;">官方回复</span>' : ''}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                  <i class="fas fa-id-badge"></i> 用户ID: ${comment.user || '未知'}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="comment-time" style="font-size: 12px; color: var(--text-secondary);">
                  ${formatDateTime(comment.created_at)}
                </div>
                <div class="dropdown-menu">
                  <button class="dropdown-toggle" onclick="toggleAdminDropdown('admin-comment-menu-${comment.id}')" style="padding: 4px 8px; font-size: 14px;">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <div class="dropdown-content" id="admin-comment-menu-${comment.id}">
                    <button class="dropdown-item danger" onclick="deleteAdminComment('${comment.id}', '${messageId}')">
                      <i class="fas fa-trash"></i> 删除评论
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="comment-content rich-text-content" style="font-size: 14px; line-height: 1.6; padding: 8px 0;">
              ${formatRichTextContent(comment.content)}
            </div>
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

// 删除评论（管理员）
async function deleteAdminComment(commentId, messageId) {
  const confirmed = await showConfirm({
    title: '删除评论',
    message: '确定要删除这条评论吗？删除后无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.deleteComment(commentId);
    showNotification('评论删除成功', 'success');
    await loadAdminMessageComments(messageId);
    await loadMessagesForAdmin(); // 刷新留言列表以更新评论数
  } catch (error) {
    console.error('删除评论失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 删除留言的回复
async function deleteMessageReply(messageId) {
  const confirmed = await showConfirm({
    title: '删除回复',
    message: '确定要删除这条留言的官方回复吗？',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    await api.updateMessage(messageId, { reply: '', status: '待回复' });
    showNotification('回复删除成功', 'success');
    await loadMessagesForAdmin();
  } catch (error) {
    console.error('删除回复失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 清空所有评论
async function clearAllComments(messageId) {
  const confirmed = await showConfirm({
    title: '清空所有评论',
    message: '确定要清空这条留言的所有评论吗？此操作无法恢复！',
    confirmText: '清空',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (!confirmed) return;
  
  try {
    const comments = await api.getMessageComments(messageId);
    
    if (!comments || comments.length === 0) {
      showNotification('该留言没有评论', 'warning');
      return;
    }
    
    // 逐个删除评论
    for (const comment of comments) {
      await api.deleteComment(comment.id);
    }
    
    showNotification(`成功清空 ${comments.length} 条评论`, 'success');
    await loadAdminMessageComments(messageId);
    await loadMessagesForAdmin();
  } catch (error) {
    console.error('清空评论失败:', error);
    showNotification('清空失败：' + error.message, 'error');
  }
}

// 切换管理员下拉菜单
function toggleAdminDropdown(menuId) {
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

// ===== 用户管理 =====

// 用户管理状态
let currentUserPage = 1;
let currentUserSearch = '';
let currentUserRoleFilter = 'all'; // all, admin, normal
const userManageModal = new Modal('user-manage-modal');
let currentManagingUserId = null;

async function loadUsersForAdmin() {
  const container = document.getElementById('users-admin-container');
  if (!container) return;

  try {
    showLoading(container);
    
    // 构建查询参数
    const params = {
      page: currentUserPage,
      limit: 20,
      sort: '-date_joined'
    };
    
    if (currentUserSearch) {
      params.search = currentUserSearch;
    }
    
    const response = await api.getUsers(params);
    
    if (response.data && response.data.length > 0) {
      // 根据角色筛选
      let filteredUsers = response.data;
      if (currentUserRoleFilter === 'admin') {
        filteredUsers = response.data.filter(u => u.is_staff);
      } else if (currentUserRoleFilter === 'normal') {
        filteredUsers = response.data.filter(u => !u.is_staff);
      }
      
      renderUsersForAdmin(container, filteredUsers, response.total);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无用户</div></div>';
    }
  } catch (error) {
    console.error('加载用户列表失败:', error);
    showError(container);
  }
}

function renderUsersForAdmin(container, users, total) {
  const searchHtml = `
    <div style="margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
      <input type="text" id="user-search-input" class="form-input" placeholder="搜索用户名或邮箱..." 
             value="${escapeHtml(currentUserSearch)}" style="flex: 1; min-width: 200px;">
      <select id="user-role-filter" class="form-select" style="width: 150px;">
        <option value="all" ${currentUserRoleFilter === 'all' ? 'selected' : ''}>全部用户</option>
        <option value="admin" ${currentUserRoleFilter === 'admin' ? 'selected' : ''}>管理员</option>
        <option value="normal" ${currentUserRoleFilter === 'normal' ? 'selected' : ''}>普通用户</option>
      </select>
      <button onclick="searchUsers()" class="btn btn-primary">
        <i class="fas fa-search"></i> 搜索
      </button>
      <button onclick="resetUserSearch()" class="btn btn-secondary">
        <i class="fas fa-redo"></i> 重置
      </button>
    </div>
  `;
  
  const usersHtml = users.map(user => {
    const statusBadge = user.is_active === false 
      ? '<span class="tag danger" style="margin-left: 8px;">已冻结</span>' 
      : '<span class="tag success" style="margin-left: 8px;">正常</span>';
    const roleBadge = user.is_staff 
      ? '<span class="tag primary" style="margin-left: 8px;">管理员</span>' 
      : '<span class="tag" style="margin-left: 8px;">普通用户</span>';
    
    return `
      <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
        <div style="flex: 1;">
          <div style="font-weight: 500;">
            ${escapeHtml(user.username)} ${roleBadge} ${statusBadge}
          </div>
          <div class="list-item-meta">
            <span><i class="fas fa-envelope"></i> ${escapeHtml(user.email || '未填写')}</span>
            <span><i class="fas fa-phone"></i> ${escapeHtml(user.phone || '未填写')}</span>
            <span><i class="fas fa-clock"></i> 注册于 ${formatDateTime(user.date_joined)}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" onclick="openUserManageModal('${user.id}')">
            <i class="fas fa-cog"></i> 管理
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // 分页控件
  const totalPages = Math.ceil(total / 20);
  const paginationHtml = totalPages > 1 ? `
    <div style="margin-top: 20px; display: flex; justify-content: center; gap: 8px; align-items: center;">
      <button onclick="changeUserPage(${currentUserPage - 1})" class="btn btn-secondary" 
              ${currentUserPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> 上一页
      </button>
      <span>第 ${currentUserPage} / ${totalPages} 页</span>
      <button onclick="changeUserPage(${currentUserPage + 1})" class="btn btn-secondary"
              ${currentUserPage === totalPages ? 'disabled' : ''}>
        下一页 <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  ` : '';
  
  container.innerHTML = searchHtml + usersHtml + paginationHtml;
}

function searchUsers() {
  const searchInput = document.getElementById('user-search-input');
  const roleFilter = document.getElementById('user-role-filter');
  currentUserSearch = searchInput ? searchInput.value.trim() : '';
  currentUserRoleFilter = roleFilter ? roleFilter.value : 'all';
  currentUserPage = 1;
  loadUsersForAdmin();
}

function resetUserSearch() {
  currentUserSearch = '';
  currentUserRoleFilter = 'all';
  currentUserPage = 1;
  loadUsersForAdmin();
}

function changeUserPage(page) {
  if (page < 1) return;
  currentUserPage = page;
  loadUsersForAdmin();
}

// 打开用户管理模态框
async function openUserManageModal(userId) {
  try {
    const user = await api.getUser(userId);
    currentManagingUserId = userId;
    
    const currentUser = auth.getUser();
    const isSelf = currentUser && String(currentUser.id) === String(userId);
    
    const userInfoHtml = `
      <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 20px;">
        <p><strong>用户名：</strong> ${escapeHtml(user.username)}</p>
        <p style="margin-top: 8px;"><strong>邮箱：</strong> ${escapeHtml(user.email || '未填写')}</p>
        <p style="margin-top: 8px;"><strong>手机：</strong> ${escapeHtml(user.phone || '未填写')}</p>
        <p style="margin-top: 8px;"><strong>注册时间：</strong> ${formatDateTime(user.date_joined)}</p>
        <p style="margin-top: 8px;"><strong>角色：</strong> ${user.is_staff ? '管理员' : '普通用户'}</p>
        <p style="margin-top: 8px;"><strong>状态：</strong> ${user.is_active === false ? '已冻结' : '正常'}</p>
      </div>
      
      <div class="form-group">
        <label class="form-label">账号状态</label>
        <div style="display: flex; gap: 12px;">
          <button onclick="toggleUserStatus('${userId}', ${user.is_active !== false})" 
                  class="btn ${user.is_active === false ? 'btn-success' : 'btn-warning'}"
                  ${isSelf ? 'disabled title="不能冻结自己的账号"' : ''}>
            <i class="fas fa-${user.is_active === false ? 'unlock' : 'lock'}"></i> 
            ${user.is_active === false ? '解除冻结' : '冻结账号'}
          </button>
        </div>
        <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
          冻结后用户无法发表留言和评论
        </small>
      </div>
      
      <div class="form-group">
        <label class="form-label">角色权限</label>
        <div style="display: flex; gap: 12px;">
          <button onclick="toggleUserAdmin('${userId}', ${user.is_staff})" 
                  class="btn btn-secondary"
                  ${isSelf ? 'disabled title="不能修改自己的权限"' : ''}>
            <i class="fas fa-user-shield"></i> 
            ${user.is_staff ? '取消管理员' : '设为管理员'}
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">密码管理</label>
        <div style="display: flex; gap: 12px; align-items: center;">
          <input type="text" id="reset-password-input" class="form-input" 
                 placeholder="输入新密码（留空则重置为123456）" style="flex: 1;">
          <button onclick="resetUserPasswordAction('${userId}')" class="btn btn-primary">
            <i class="fas fa-key"></i> 重置密码
          </button>
        </div>
        <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
          用于帮助忘记密码的用户重置密码
        </small>
      </div>
    `;
    
    document.getElementById('user-manage-info').innerHTML = userInfoHtml;
    userManageModal.open();
  } catch (error) {
    console.error('加载用户详情失败:', error);
    showNotification('加载用户详情失败', 'error');
  }
}

// 切换用户状态（冻结/解冻）
async function toggleUserStatus(userId, isActive) {
  const action = isActive ? '冻结' : '解除冻结';
  
  const confirmed = await showConfirm({
    title: `${action}用户`,
    message: isActive 
      ? '确定要冻结该用户吗？冻结后用户无法发表留言和评论。'
      : '确定要解除冻结该用户吗？解除后用户可以正常使用系统。',
    confirmText: action,
    cancelText: '取消',
    type: isActive ? 'warning' : 'info'
  });
  
  if (!confirmed) return;
  
  try {
    await api.updateUser(userId, { is_active: !isActive });
    showNotification(`${action}成功`, 'success');
    userManageModal.close();
    loadUsersForAdmin();
  } catch (error) {
    console.error(`${action}用户失败:`, error);
    showNotification(`${action}失败：` + error.message, 'error');
  }
}

// 切换管理员权限
async function toggleUserAdmin(userId, isStaff) {
  const action = isStaff ? '取消管理员权限' : '设为管理员';
  
  const confirmed = await showConfirm({
    title: action,
    message: isStaff
      ? '确定要取消该用户的管理员权限吗？取消后用户将无法访问管理后台。'
      : '确定要将该用户设为管理员吗？设置后用户将可以访问管理后台。',
    confirmText: '确定',
    cancelText: '取消',
    type: 'warning'
  });
  
  if (!confirmed) return;
  
  try {
    await api.updateUser(userId, { is_staff: !isStaff });
    showNotification('用户权限已更新', 'success');
    userManageModal.close();
    loadUsersForAdmin();
  } catch (error) {
    console.error('更新用户权限失败:', error);
    showNotification('更新用户权限失败：' + error.message, 'error');
  }
}

// 重置用户密码
async function resetUserPasswordAction(userId) {
  const passwordInput = document.getElementById('reset-password-input');
  const newPassword = passwordInput ? passwordInput.value.trim() : '';
  const finalPassword = newPassword || '123456';
  
  const confirmed = await showConfirm({
    title: '重置密码',
    message: `确定要将该用户密码重置为：${finalPassword} 吗？`,
    confirmText: '重置',
    cancelText: '取消',
    type: 'warning'
  });
  
  if (!confirmed) return;
  
  try {
    await api.resetUserPassword(userId, finalPassword);
    showNotification('密码重置成功', 'success');
    if (passwordInput) passwordInput.value = '';
  } catch (error) {
    console.error('重置密码失败:', error);
    showNotification('重置密码失败：' + error.message, 'error');
  }
}
// 智能原文识别
async function fetchPolicyFromUrl() {
  const urlInput = document.getElementById('policy-url-input');
  const statusDiv = document.getElementById('fetch-policy-status');
  const fetchBtn = document.getElementById('fetch-policy-btn');
  
  const url = urlInput.value.trim();
  if (!url) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入政策URL</span>';
    return;
  }
  
  try {
    // 显示加载状态
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
    statusDiv.innerHTML = '<span style="color: var(--primary-color);">正在识别原文，请稍候...</span>';
    
    // 调用API
    const data = await api.fetchPolicyFromUrl(url);
    
    // 填充表单
    if (data.title) document.getElementById('policy-title').value = data.title;
    if (data.department) document.getElementById('policy-department').value = data.department;
    if (data.publish_date) document.getElementById('policy-date').value = data.publish_date;
    if (data.content) {
      // 使用CKEditor设置内容
      if (window.CKEditorSuperHelper) {
        setTimeout(() => {
          window.CKEditorSuperHelper.setContent('policy-content', data.content);
        }, 100);
      } else {
        document.getElementById('policy-content').value = data.content;
      }
    }
    
    statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充表单</span>';
    showNotification('原文识别成功', 'success');
    
  } catch (error) {
    console.error('识别失败:', error);
    statusDiv.innerHTML = `<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> 识别失败：${error.message}</span>`;
    showNotification('识别失败：' + error.message, 'error');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别原文';
  }
}

// 智能新闻识别
async function fetchNewsFromUrl() {
  const urlInput = document.getElementById('news-url-input');
  const statusDiv = document.getElementById('fetch-news-status');
  const fetchBtn = document.getElementById('fetch-news-btn');
  
  const url = urlInput.value.trim();
  if (!url) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入新闻URL</span>';
    return;
  }
  
  try {
    // 显示加载状态
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
    statusDiv.innerHTML = '<span style="color: var(--primary-color);">正在识别新闻，请稍候...</span>';
    
    // 调用API
    const data = await api.fetchNewsFromUrl(url);
    
    // 填充表单
    if (data.title) document.getElementById('news-title').value = data.title;
    if (data.author) document.getElementById('news-author').value = data.author;
    if (data.content) {
      // 使用CKEditor设置内容
      if (window.CKEditorSuperHelper) {
        setTimeout(() => {
          window.CKEditorSuperHelper.setContent('news-content', data.content);
        }, 100);
      } else {
        document.getElementById('news-content').value = data.content;
      }
    }
    
    statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充表单</span>';
    showNotification('新闻识别成功', 'success');
    
  } catch (error) {
    console.error('识别失败:', error);
    statusDiv.innerHTML = `<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> 识别失败：${error.message}</span>`;
    showNotification('识别失败：' + error.message, 'error');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别新闻';
  }
}

// 初始化基础编辑器（安全隐患和留言回复）
async function initBasicEditors() {
  try {
    // 等待CKEditorHelper加载
    if (typeof window.CKEditorSuperHelper === 'undefined') {
      console.warn('CKEditorHelper未加载，等待...');
      setTimeout(initBasicEditors, 500);
      return;
    }
    
    // 初始化安全隐患和留言回复的基础编辑器
    await window.CKEditorSuperHelper.initEditor('safety-description', { placeholder: '请输入安全隐患描述...' });
    await window.CKEditorSuperHelper.initEditor('safety-prevention', { placeholder: '请输入预防措施...' });
    await window.CKEditorSuperHelper.initEditor('safety-plan', { placeholder: '请输入应急预案...' });
    await window.CKEditorSuperHelper.initEditor('reply-content', { placeholder: '请输入回复内容...' });
    
    console.log('基础编辑器初始化完成');
  } catch (error) {
    console.error('初始化基础编辑器失败:', error);
  }
}












// ===== AI 智能摘要 =====

// 存储最近一次 AI 摘要结果
let lastPolicyAiResult = null;
let lastNewsAiResult = null;

// ===== 整理原文功能 =====
async function formatContent(type) {
  const isPolicy = type === 'policy';
  const apiUrl = isPolicy
    ? 'http://127.0.0.1:8000/api/policies/format_content/'
    : 'http://127.0.0.1:8000/api/news/format_content/';
  
  const rawContent = window.CKEditorSuperHelper
    ? window.CKEditorSuperHelper.getContent(isPolicy ? 'policy-content' : 'news-content')
    : document.getElementById(isPolicy ? 'policy-content' : 'news-content').value;
  
  const plainContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (!plainContent || plainContent.length < 50) {
    showNotification('请先填写内容再整理原文', 'error');
    return;
  }
  
  const btn = document.getElementById(type + '-ai-format-btn');
  const originalHtml = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 整理中...';
  
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: rawContent })
    });
    
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || '整理失败');
    }
    
    const data = await resp.json();
    
    // 应用格式化后的内容到编辑器
    if (data.formatted_content) {
      if (window.CKEditorSuperHelper) {
        window.CKEditorSuperHelper.setContent(
          isPolicy ? 'policy-content' : 'news-content',
          data.formatted_content
        );
      } else {
        document.getElementById(isPolicy ? 'policy-content' : 'news-content').value = data.formatted_content;
      }
      showNotification('原文整理完成', 'success');
    }
  } catch (e) {
    showNotification('整理失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function runAiSummary(type) {
  const isPolicy = type === 'policy';
  const apiUrl = isPolicy
    ? 'http://127.0.0.1:8000/api/policies/ai_summary/'
    : 'http://127.0.0.1:8000/api/news/ai_summary/';

  const title = document.getElementById(isPolicy ? 'policy-title' : 'news-title').value.trim();
  const content = window.CKEditorSuperHelper
    ? window.CKEditorSuperHelper.getContent(isPolicy ? 'policy-content' : 'news-content')
    : document.getElementById(isPolicy ? 'policy-content' : 'news-content').value;

  // Strip HTML tags for plain text
  const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (!plainContent || plainContent.length < 50) {
    showNotification('请先填写内容再生成摘要', 'error');
    return;
  }

  const loadingEl = document.getElementById(`${type}-ai-summary-loading`);
  const resultEl  = document.getElementById(`${type}-ai-summary-result`);
  const errorEl   = document.getElementById(`${type}-ai-summary-error`);
  const btn       = document.getElementById(`${type}-ai-summary-btn`);

  loadingEl.style.display = 'block';
  resultEl.style.display  = 'none';
  errorEl.style.display   = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, content: plainContent })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || '摘要生成失败');
    }

    const data = await resp.json();
    if (isPolicy) lastPolicyAiResult = data; else lastNewsAiResult = data;

    // Render summary
    document.getElementById(`${type}-ai-summary-text`).textContent = data.summary || '';

    const kpList = document.getElementById(`${type}-ai-keypoints`);
    kpList.innerHTML = (data.key_points || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');

    document.getElementById(`${type}-ai-category`).textContent = data.category || '';

    const tagsEl = document.getElementById(`${type}-ai-tags`);
    tagsEl.innerHTML = (data.tags || []).map(t =>
      `<span style="display:inline-block;margin:2px 4px;padding:2px 10px;background:rgba(0,113,227,0.1);color:var(--primary-color);border-radius:20px;font-size:12px;">${escapeHtml(t)}</span>`
    ).join('');

    loadingEl.style.display = 'none';
    resultEl.style.display  = 'block';
    showNotification('摘要生成成功', 'success');
  } catch (e) {
    loadingEl.style.display = 'none';
    errorEl.style.display   = 'block';
    errorEl.textContent     = '生成失败：' + e.message;
    showNotification('AI 摘要失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> 生成摘要';
  }
}

function applyAiResult(type) {
  const data = type === 'policy' ? lastPolicyAiResult : lastNewsAiResult;
  
  if (!data) {
    showNotification('请先生成摘要', 'warning');
    return;
  }

  // 应用分类（支持 input 文本框和 select 下拉框）
  const catEl = document.getElementById(type + '-category');
  if (catEl && data.category) {
    catEl.value = data.category;
  }

  // 应用标签（增加安全检查，防止 undefined 错误）
  const tagsEl = document.getElementById(type + '-tags');
  if (tagsEl && data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
    tagsEl.value = data.tags.join(',');
  }

  showNotification('标签与分类已应用', 'success');
}

// Bind buttons after DOM ready
document.addEventListener('DOMContentLoaded', function () {
  document.addEventListener('click', function (e) {
    // 整理原文按钮
    if (e.target.closest('#policy-ai-format-btn')) formatContent('policy');
    if (e.target.closest('#news-ai-format-btn'))   formatContent('news');
    
    // 生成摘要按钮
    if (e.target.closest('#policy-ai-summary-btn')) runAiSummary('policy');
    if (e.target.closest('#news-ai-summary-btn'))   runAiSummary('news');
    
    // 应用标签与分类按钮
    if (e.target.closest('#policy-ai-apply-btn'))   applyAiResult('policy');
    if (e.target.closest('#news-ai-apply-btn'))     applyAiResult('news');
  });
});

// ===== 图片放大查看功能 =====

// 打开图片放大查看
function openImageZoom(imgElementId) {
  const modal = document.getElementById('image-zoom-modal');
  const zoomImg = document.getElementById('image-zoom-img');
  const sourceImg = document.getElementById(imgElementId);
  
  if (modal && zoomImg && sourceImg) {
    zoomImg.src = sourceImg.src;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
  }
}

// 关闭图片放大查看
function closeImageZoom() {
  const modal = document.getElementById('image-zoom-modal');
  
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // 恢复背景滚动
  }
}

// ESC键关闭放大查看
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeImageZoom();
  }
});

// ===== ✨ 缓存管理功能 =====

/**
 * 检测是否为强制刷新（Ctrl+F5）
 */
function checkForceRefresh() {
  // ✨ 检查URL中是否有强制刷新标记
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get(FORCE_REFRESH_FLAG) === 'true') {
    // 清除URL中的标记
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    return true;
  }
  
  // 检查sessionStorage中的标记
  const forceFlag = sessionStorage.getItem(FORCE_REFRESH_FLAG);
  if (forceFlag === 'true') {
    sessionStorage.removeItem(FORCE_REFRESH_FLAG);
    return true;
  }
  
  return false;
}

/**
 * 设置强制刷新标记（供外部调用）
 */
function setForceRefreshFlag() {
  sessionStorage.setItem(FORCE_REFRESH_FLAG, 'true');
}

/**
 * ✨ 强制清除所有缓存并刷新页面（供按钮调用）
 */
async function forceClearCacheAndReload() {
  const confirmed = await showConfirm({
    title: '清除缓存',
    message: '确定要清除所有缓存并刷新页面吗？\n\n这将清除：\n- 所有表单数据\n- 富文本编辑器内容\n- 图片上传状态\n- 当前模块状态',
    confirmText: '清除并刷新',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (confirmed) {
    clearAllCache();
    // 设置标记，确保刷新后也不会恢复
    sessionStorage.setItem(FORCE_REFRESH_FLAG, 'true');
    // 刷新页面
    window.location.reload();
  }
}

/**
 * 保存数据到缓存
 */
function saveToCache(key, data) {
  try {
    const cacheKey = CACHE_PREFIX + key;
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log(`缓存已保存: ${key}`);
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

/**
 * 从缓存读取数据
 */
function loadFromCache(key) {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const data = sessionStorage.getItem(cacheKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('读取缓存失败:', error);
    return null;
  }
}

/**
 * 清除指定缓存
 */
function clearCache(key) {
  try {
    const cacheKey = CACHE_PREFIX + key;
    sessionStorage.removeItem(cacheKey);
    console.log(`缓存已清除: ${key}`);
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

/**
 * 清除所有缓存
 */
function clearAllCache() {
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('所有缓存已清除');
  } catch (error) {
    console.error('清除所有缓存失败:', error);
  }
}

/**
 * 恢复缓存数据
 */
function restoreCache() {
  try {
    // 1. 恢复表单数据（先恢复数据，不影响按钮点击）
    restoreFormData();
    
    // 2. 恢复编辑器内容
    restoreEditorContent();
    
    // 3. 最后恢复模块状态（避免阻塞）
    const currentModule = loadFromCache('current_module');
    if (currentModule) {
      console.log('恢复模块状态:', currentModule);
      // 使用 setTimeout 确保不会阻塞其他操作
      setTimeout(() => {
        showModule(currentModule);
      }, 50);
    }
    
    console.log('✨ 缓存数据恢复完成');
  } catch (error) {
    console.error('恢复缓存失败:', error);
  }
}

/**
 * 恢复表单数据
 */
function restoreFormData() {
  const formFields = [
    // 政策法规
    { id: 'policy-title', type: 'input' },
    { id: 'policy-department', type: 'input' },
    { id: 'policy-level', type: 'select' },
    { id: 'policy-date', type: 'input' },
    { id: 'policy-category', type: 'input' },
    { id: 'policy-tags', type: 'input' },
    { id: 'policy-url', type: 'input' },
    
    // 新闻资讯
    { id: 'news-title', type: 'input' },
    { id: 'news-author', type: 'input' },
    { id: 'news-category', type: 'select' },
    { id: 'news-date', type: 'input' },
    { id: 'news-tags', type: 'input' },
    { id: 'news-cover', type: 'input' },
    
    // 安全隐患
    { id: 'safety-title', type: 'input' },
    { id: 'safety-category', type: 'input' },
    { id: 'safety-risk', type: 'select' },
    { id: 'safety-status', type: 'select' },
    
    // 统计数据
    { id: 'stat-region', type: 'input' },
    { id: 'stat-year', type: 'input' },
    { id: 'stat-tourists', type: 'input' },
    { id: 'stat-revenue', type: 'input' },
    { id: 'stat-flights', type: 'input' },
    { id: 'stat-aircraft', type: 'input' },
    { id: 'stat-growth', type: 'input' },
    
    // 旅游目的地
    { id: 'destination-name', type: 'input' },
    { id: 'destination-city', type: 'input' },
    { id: 'destination-country', type: 'input' },
    { id: 'destination-state', type: 'input' },
    { id: 'destination-location', type: 'input' },
    { id: 'destination-category', type: 'input' },
    { id: 'destination-price-range', type: 'input' },
    { id: 'destination-duration', type: 'input' },
    { id: 'destination-best-season', type: 'input' },
    { id: 'destination-rating', type: 'input' },
    { id: 'destination-is-featured', type: 'select' },
    { id: 'destination-is-hot', type: 'select' },
    { id: 'destination-sort-order', type: 'input' },
  ];
  
  formFields.forEach(field => {
    const cachedValue = loadFromCache(field.id);
    if (cachedValue !== null) {
      const element = document.getElementById(field.id);
      if (element) {
        if (field.type === 'select') {
          element.value = cachedValue;
        } else {
          element.value = cachedValue;
        }
        console.log(`恢复字段 ${field.id}: ${cachedValue}`);
      }
    }
  });
  
  // 恢复推荐类型多选框
  const recommendationTypes = loadFromCache('recommendation_types');
  if (recommendationTypes && Array.isArray(recommendationTypes)) {
    document.querySelectorAll('input[name="recommendation_type"]').forEach(checkbox => {
      checkbox.checked = recommendationTypes.includes(checkbox.value);
    });
  }
  
  // ✨ 恢复图片上传状态
  restoreImageUploadState();
}

/**
 * 恢复编辑器内容
 */
function restoreEditorContent() {
  const editorIds = [
    'policy-content',
    'news-content',
    'safety-description',
    'safety-prevention',
    'safety-plan',
    'destination-description',
    'destination-features',
    'reply-content'
  ];
  
  editorIds.forEach(editorId => {
    const cachedContent = loadFromCache(editorId);
    if (cachedContent) {
      const textarea = document.getElementById(editorId);
      if (textarea) {
        textarea.value = cachedContent;
        console.log(`✨ F5刷新后恢复编辑器内容到 textarea: ${editorId}（不初始化CKEditor，节省加载次数）`);
        // ✨ 重要：只恢复 textarea 文字内容，不初始化 CKEditor，避免消耗加载次数
      }
    }
  });
  
  // ✨ 已移除：不再自动恢复编辑器初始化状态
  // F5刷新后只显示 textarea 文字内容，用户需要点击“编辑文本”按钮才会初始化CKEditor
  // 这样可以最大程度减少编辑器的加载次数
}

/**
 * 恢复图片上传状态
 */
function restoreImageUploadState() {
  // ✨ F5刷新后，由于无法从缓存中恢复Base64图片数据（已不再缓存）
  // 只能恢复文件名标记，用户需要重新选择文件才能看到预览
  
  const coverHasImage = loadFromCache('destination-cover-has-image');
  const coverFileName = loadFromCache('destination-cover-file-name');
  if (coverHasImage && coverFileName) {
    console.log(`检测到封面图已上传: ${coverFileName}（F5后需重新选择文件以查看预览）`);
    // 注意：这里不恢复预览，因为 Base64 数据没有被缓存
    // 用户可以通过文件输入框看到之前选择的文件名（如果浏览器支持）
  }
  
  // 检查展示图片
  [1, 2, 3, 4].forEach(index => {
    const galleryHasImage = loadFromCache(`destination-gallery-image-${index}-has-image`);
    const galleryFileName = loadFromCache(`destination-gallery-image-${index}-name`);
    
    if (galleryHasImage && galleryFileName) {
      console.log(`检测到展示图片${index}已上传: ${galleryFileName}（F5后需重新选择文件以查看预览）`);
      // 同样不恢复预览
    }
  });
}

/**
 * 初始化自动保存功能
 */
function initAutoSave() {
  console.log('初始化自动保存功能');
  
  // 1. 监听所有输入框的变化
  const inputFields = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="url"], select, textarea');
  inputFields.forEach(field => {
    field.addEventListener('input', debounce(() => {
      if (field.id) {
        saveToCache(field.id, field.value);
      }
    }, 500));
    
    field.addEventListener('change', () => {
      if (field.id) {
        saveToCache(field.id, field.value);
      }
    });
  });
  
  // 2. 监听推荐类型多选框
  document.querySelectorAll('input[name="recommendation_type"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedTypes = Array.from(document.querySelectorAll('input[name="recommendation_type"]:checked'))
        .map(cb => cb.value);
      saveToCache('recommendation_types', selectedTypes);
    });
  });
  
  // 3. 监听模块切换
  const originalShowModule = window.showModule;
  window.showModule = function(moduleName) {
    saveToCache('current_module', moduleName);
    originalShowModule(moduleName);
  };
  
  // ✨ 4. 监听图片上传（封面图和展示图片）
  initImageUploadAutoSave();
  
  // 5. 监听编辑器内容变化（延迟执行，等待编辑器初始化）
  setTimeout(() => {
    if (window.CKEditorSuperHelper) {
      const editorIds = [
        'policy-content',
        'news-content',
        'safety-description',
        'safety-prevention',
        'safety-plan',
        'destination-description',
        'destination-features',
        'reply-content'
      ];
      
      editorIds.forEach(editorId => {
        const editor = window.CKEditorSuperHelper.editorInstances[editorId];
        if (editor && editor.model && editor.model.document) {
          editor.model.document.on('change:data', debounce(() => {
            const content = window.CKEditorSuperHelper.getContent(editorId);
            if (content) {
              saveToCache(editorId, content);
            }
          }, 1000));
        }
      });
    }
  }, 2000);
  
  console.log('自动保存功能已启用');
}

/**
 * 初始化图片上传的自动保存
 */
function initImageUploadAutoSave() {
  // 监听封面图上传
  const coverInput = document.getElementById('destination-cover-image');
  if (coverInput) {
    coverInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        
        // ✨ 只保存文件名和标记，不保存Base64数据（避免超出sessionStorage限制）
        saveToCache('destination-cover-file-name', file.name);
        saveToCache('destination-cover-has-image', true); // 标记有图片
        console.log('保存封面图状态到缓存（仅文件名）');
        
        // 实时预览（但不缓存Base64）
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.getElementById('destination-cover-preview');
          const previewImg = document.getElementById('destination-cover-preview-img');
          const fileNameEl = document.getElementById('destination-cover-file-name');
          const uploadBox = document.getElementById('destination-cover-upload-box');
          
          if (preview && previewImg && uploadBox) {
            previewImg.src = e.target.result;
            if (fileNameEl) {
              fileNameEl.textContent = file.name;
            }
            uploadBox.style.display = 'none';
            preview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      } else {
        // 用户取消了选择，清除缓存
        clearCache('destination-cover-file-name');
        clearCache('destination-cover-has-image');
      }
    });
  }
  
  // 监听4张展示图片上传
  [1, 2, 3, 4].forEach(index => {
    const galleryInput = document.getElementById(`destination-gallery-image-${index}`);
    if (galleryInput) {
      galleryInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          const file = this.files[0];
          
          // ✨ 只保存文件名和标记，不保存Base64数据
          saveToCache(`destination-gallery-image-${index}-name`, file.name);
          saveToCache(`destination-gallery-image-${index}-has-image`, true);
          console.log(`保存展示图片${index}状态到缓存（仅文件名）`);
          
          // 实时预览（但不缓存Base64）
          const reader = new FileReader();
          reader.onload = function(e) {
            const preview = document.getElementById(`destination-gallery-preview-${index}`);
            const previewImg = document.getElementById(`destination-gallery-preview-img-${index}`);
            const fileNameEl = document.getElementById(`destination-gallery-file-name-${index}`);
            const uploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
            
            if (preview && previewImg && uploadBox) {
              previewImg.src = e.target.result;
              if (fileNameEl) {
                fileNameEl.textContent = file.name;
              }
              uploadBox.style.display = 'none';
              preview.style.display = 'block';
            }
          };
          reader.readAsDataURL(file);
        } else {
          // 用户取消了选择，清除缓存
          clearCache(`destination-gallery-image-${index}-name`);
          clearCache(`destination-gallery-image-${index}-has-image`);
        }
      });
    }
  });
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
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

/**
 * 提交成功后清除相关缓存
 */
function clearFormCache(formPrefix) {
  const fields = [
    `${formPrefix}-title`,
    `${formPrefix}-content`,
    `${formPrefix}-description`,
    `${formPrefix}-prevention`,
    `${formPrefix}-plan`,
    `${formPrefix}-category`,
    `${formPrefix}-tags`,
    `${formPrefix}-author`,
    `${formPrefix}-date`,
    `${formPrefix}-url`,
    `${formPrefix}-cover`,
    `${formPrefix}-department`,
    `${formPrefix}-level`,
    `${formPrefix}-risk`,
    `${formPrefix}-status`,
    `${formPrefix}-region`,
    `${formPrefix}-year`,
    `${formPrefix}-tourists`,
    `${formPrefix}-revenue`,
    `${formPrefix}-flights`,
    `${formPrefix}-aircraft`,
    `${formPrefix}-growth`,
    `${formPrefix}-name`,
    `${formPrefix}-city`,
    `${formPrefix}-country`,
    `${formPrefix}-state`,
    `${formPrefix}-location`,
    `${formPrefix}-price-range`,
    `${formPrefix}-duration`,
    `${formPrefix}-best-season`,
    `${formPrefix}-rating`,
    `${formPrefix}-is-featured`,
    `${formPrefix}-is-hot`,
    `${formPrefix}-sort-order`,
    `${formPrefix}-features`,
  ];
  
  fields.forEach(field => {
    clearCache(field);
  });
  
  // 清除推荐类型
  if (formPrefix === 'destination') {
    clearCache('recommendation_types');
    
    // ✨ 清除图片上传状态（包括标记和文件名）
    clearCache('destination-cover-has-image');
    clearCache('destination-cover-file-name');
    [1, 2, 3, 4].forEach(index => {
      clearCache(`destination-gallery-image-${index}-has-image`);
      clearCache(`destination-gallery-image-${index}-name`);
    });
  }
}
