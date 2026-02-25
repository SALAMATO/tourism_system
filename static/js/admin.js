//管理后台逻辑
let currentReplyMessageId = null;
const replyModal = new Modal('reply-modal');

// 各模块当前正在编辑的记录ID
let currentPolicyEditingId = null;
let currentNewsEditingId = null;
let currentNewsEditingData = null;
let currentSafetyEditingId = null;
let currentSafetyEditingData = null;
let currentStatisticEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
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
  } catch (error) {
    console.error('管理后台权限校验失败:', error);
    showNotification('访问管理后台失败，请重新登录', 'error');
    setTimeout(() => {
      window.location.href = '/auth/?redirect=' + encodeURIComponent('/admin-page/');
    }, 1500);
  }
});

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
  
  // 新闻资讯表单
  document.getElementById('news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitNews();
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
}

// 使用事件委托：在 document 上监听点击，避免按钮在隐藏模块内时绑定失效
function initDeleteButtons() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#policy-delete-btn, #news-delete-btn, #safety-delete-btn, #statistics-delete-btn, #reply-delete-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.id === 'policy-delete-btn') deleteCurrentPolicy();
    else if (btn.id === 'news-delete-btn') deleteCurrentNews();
    else if (btn.id === 'safety-delete-btn') deleteCurrentSafetyAlert();
    else if (btn.id === 'statistics-delete-btn') deleteCurrentStatistic();
    else if (btn.id === 'reply-delete-btn') deleteCurrentReply();
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
      content: document.getElementById('policy-content').value,
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
    document.getElementById('policy-content').value = policy.content || '';
    document.getElementById('policy-url').value = policy.file_url || '';
    document.getElementById('policy-tags').value = (policy.tags || []).join(',');

    const titleEl = document.querySelector('#policy-module .card-title');
    if (titleEl) titleEl.textContent = '编辑政策法规';
    const submitBtn = document.querySelector('#policy-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('policy-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    scrollToTop();
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
    
    // 使用当前时间作为发布日期
    const publishDate = new Date().toISOString();
    
    const data = {
      title: document.getElementById('news-title').value,
      category: document.getElementById('news-category').value,
      author: document.getElementById('news-author').value,
      cover_image: document.getElementById('news-cover').value || '',
      content: document.getElementById('news-content').value,
      publish_date: publishDate,
      views: 0,
      tags: tags
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
    document.getElementById('news-content').value = news.content || '';
    document.getElementById('news-tags').value = (news.tags || []).join(',');

    const titleEl = document.querySelector('#news-module .card-title');
    if (titleEl) titleEl.textContent = '编辑新闻';
    const submitBtn = document.querySelector('#news-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '保存修改';
    const deleteBtn = document.getElementById('news-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    scrollToTop();
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

    scrollToTop();
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

    scrollToTop();
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
    <div class="card" style="margin-bottom: 20px; ${msg.is_hidden ? 'opacity: 0.6; border: 2px solid #ff4444;' : ''}">
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
        <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.content)}</p>
      </div>
      
      ${msg.reply ? `
        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
          <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.reply)}</p>
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
        <p style="margin-top: 8px;"><strong>内容：</strong> ${escapeHtml(message.content)}</p>
      </div>
    `;
    
    document.getElementById('reply-message-info').innerHTML = infoHtml;
    document.getElementById('reply-content').value = message.reply || '';
    
    // 根据是否已有回复，更新模态框标题和提交按钮文字
    const isEditing = !!message.reply;
    const modalTitle = document.querySelector('#reply-modal .modal-title');
    if (modalTitle) modalTitle.textContent = isEditing ? '修改回复' : '回复留言';
    const submitBtn = document.getElementById('reply-submit-btn');
    if (submitBtn) submitBtn.textContent = isEditing ? '保存修改' : '提交回复';
    
    replyModal.open();
  } catch (error) {
    console.error('加载留言详情失败:', error);
    showNotification('加载失败', 'error');
  }
}

// 提交回复 / 保存修改
async function submitReply() {
  const replyContent = document.getElementById('reply-content').value.trim();
  
  if (!replyContent) {
    showNotification('请输入回复内容', 'error');
    return;
  }
  
  try {
    await api.replyMessage(currentReplyMessageId, replyContent);
    showNotification('保存成功', 'success');
    replyModal.close();
    loadMessagesForAdmin();
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
            <div class="comment-content" style="font-size: 14px; line-height: 1.6; padding: 8px 0;">
              ${escapeHtml(comment.content)}
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

