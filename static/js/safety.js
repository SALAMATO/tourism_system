// 安全隐患预警页面逻辑

let currentRisk = 'all';
const alertModal = new Modal('alert-modal');

document.addEventListener('DOMContentLoaded', () => {
  initRiskTabs();
  loadAlerts();
});

function initRiskTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentRisk = tab.dataset.risk;
      loadAlerts();
    });
  });
}

async function loadAlerts() {
  const container = document.getElementById('alerts-container');
  
  try {
    showLoading(container);
    const response = await api.getSafetyAlerts({ limit: 100, sort: '-created_at' });
    
    if (response.data && response.data.length > 0) {
      let filteredData = response.data;
      if (currentRisk !== 'all') {
        filteredData = response.data.filter(alert => alert.risk_level === currentRisk || alert.status === currentRisk);
      }
      
      updateStats(response.data);
      
      if (filteredData.length > 0) {
        renderAlerts(container, filteredData);
      } else {
        container.innerHTML = '<div class="loading"><div>未找到相关隐患</div></div>';
      }
    } else {
      container.innerHTML = '<div class="loading"><div>暂无安全隐患数据</div></div>';
      updateStats([]);
    }
  } catch (error) {
    console.error('加载安全隐患失败:', error);
    showError(container);
  }
}

function updateStats(data) {
  const highRisk = data.filter(a => a.risk_level === '高').length;
  const mediumRisk = data.filter(a => a.risk_level === '中').length;
  const lowRisk = data.filter(a => a.risk_level === '低').length;
  const resolved = data.filter(a => a.status === '已解决').length;
  
  document.getElementById('high-risk-count').textContent = highRisk;
  document.getElementById('medium-risk-count').textContent = mediumRisk;
  document.getElementById('low-risk-count').textContent = lowRisk;
  document.getElementById('resolved-count').textContent = resolved;
}

function renderAlerts(container, alerts) {
  const html = alerts.map(alert => `
    <div class="list-item" onclick="showAlertDetail('${alert.id}')">
      <div class="list-item-header">
        <div>
          <h3>${escapeHtml(alert.title)}</h3>
          <div class="list-item-meta">
            <span><i class="fas fa-layer-group"></i> ${escapeHtml(alert.category || '未分类')}</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(alert.report_date)}</span>
            <span><i class="fas fa-info-circle"></i> ${escapeHtml(alert.status || '待处理')}</span>
          </div>
        </div>
        <span class="tag ${getRiskTagClass(alert.risk_level)}">${escapeHtml(alert.risk_level || '未知')}</span>
      </div>
      <div class="list-item-content rich-text-preview">
        ${formatRichTextPreview(alert.description, 200)}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

function getRiskTagClass(risk) {
  switch(risk) {
    case '高': return 'danger';
    case '中': return 'warning';
    case '低': return 'success';
    default: return '';
  }
}

async function showAlertDetail(alertId) {
  try {
    const alert = await api.getSafetyAlert(alertId);
    
    const detailHtml = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <h2 style="margin: 0; flex: 1;">${escapeHtml(alert.title)}</h2>
          <span class="tag ${getRiskTagClass(alert.risk_level)}" style="font-size: 14px;">
            ${escapeHtml(alert.risk_level || '未知')}风险
          </span>
        </div>
        
        <div class="list-item-meta" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
          <span><i class="fas fa-layer-group"></i> ${escapeHtml(alert.category || '未分类')}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(alert.report_date)}</span>
          <span><i class="fas fa-info-circle"></i> ${escapeHtml(alert.status || '待处理')}</span>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 20px; margin-bottom: 12px;">隐患描述</h3>
          <div class="card-content rich-text-content">${formatRichTextContent(alert.description || '暂无描述')}</div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 20px; margin-bottom: 12px;">预防措施</h3>
          <div class="card-content rich-text-content">${formatRichTextContent(alert.prevention || '暂无预防措施')}</div>
        </div>
        
        <div>
          <h3 style="font-size: 20px; margin-bottom: 12px;">应急预案</h3>
          <div class="card-content rich-text-content">${formatRichTextContent(alert.emergency_plan || '暂无应急预案')}</div>
        </div>
      </div>
    `;
    
    document.getElementById('alert-detail').innerHTML = detailHtml;
    alertModal.open();
  } catch (error) {
    console.error('加载隐患详情失败:', error);
    showNotification('加载详情失败', 'error');
  }
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
