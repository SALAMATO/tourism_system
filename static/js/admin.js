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

document.addEventListener('DOMContentLoaded', () => {
  initForms();
  initDeleteButtons();
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
  if (!confirm('确定要删除当前这条政策吗？')) return;
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
  if (!confirm('确定要删除当前这条新闻吗？')) return;
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
  if (!confirm('确定要删除当前这条安全隐患记录吗？')) return;
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
  if (!confirm('确定要删除当前这条统计记录吗？')) return;
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
  if (!confirm('确定要删除该政策吗？')) return;
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
  if (!confirm('确定要删除该新闻吗？')) return;
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
  if (!confirm('确定要删除该安全隐患记录吗？')) return;
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
  if (!confirm('确定要删除该统计记录吗？')) return;
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

// 渲染留言列表（管理员视图）
function renderMessagesForAdmin(container, messages) {
  const html = messages.map(msg => `
    <div class="card" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 20px; margin-bottom: 8px;">
            <i class="fas fa-user-circle"></i> ${escapeHtml(msg.username)}
          </h3>
          <div class="list-item-meta">
            <span><i class="fas fa-envelope"></i> ${escapeHtml(msg.email)}</span>
            <span><i class="fas fa-tag"></i> ${escapeHtml(msg.message_type)}</span>
            <span><i class="fas fa-clock"></i> ${formatDateTime(msg.created_at)}</span>
          </div>
        </div>
        <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
          ${escapeHtml(msg.status)}
        </span>
      </div>
      
      <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
        <strong>留言内容：</strong>
        <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.content)}</p>
      </div>
      
      ${msg.reply ? `
        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
          <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 已回复：</strong>
          <p class="preserve-whitespace" style="margin-top: 8px; line-height: 1.6;">${escapeHtml(msg.reply)}</p>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 12px;">
        <button onclick="openReplyModal('${msg.id}')" class="btn ${msg.status === '已回复' ? 'btn-secondary' : 'btn-primary'}">
          <i class="fas fa-reply"></i> ${msg.status === '已回复' ? '修改回复' : '回复'}
        </button>
        <button onclick="deleteMessage('${msg.id}')" class="btn btn-danger">
          <i class="fas fa-trash"></i> 删除
        </button>
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
        <p><strong>用户：</strong> ${escapeHtml(message.username)}</p>
        <p style="margin-top: 8px;"><strong>邮箱：</strong> ${escapeHtml(message.email)}</p>
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
  if (!window.confirm('确定要删除该留言吗？')) return;
  try {
    await api.deleteMessage(id);
    showNotification('删除成功', 'success');
    loadMessagesForAdmin();
  } catch (error) {
    console.error('删除留言失败:', error);
    showNotification('删除失败：' + error.message, 'error');
  }
}

// 在回复模态框中直接删除当前留言
async function deleteCurrentReply() {
  if (!currentReplyMessageId) {
    showNotification('请先选择要回复的留言', 'error');
    return;
  }
  if (!confirm('确定要删除这条留言吗？')) return;
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