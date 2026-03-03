// 政策法规详情页面逻辑

document.addEventListener('DOMContentLoaded', () => {
  const policyId = getUrlParameter('id');
  if (policyId) {
    loadPolicyDetail(policyId);
  } else {
    showError(document.getElementById('policy-detail-container'), '缺少政策ID参数');
  }
});

async function loadPolicyDetail(policyId) {
  const container = document.getElementById('policy-detail-container');
  
  try {
    showLoading(container);
    const policy = await api.getPolicy(policyId);
    
    // 增加浏览次数
    try {
      await api.request(`http://127.0.0.1:8000/api/policies/${policyId}/increment_views/`, {
        method: 'POST'
      });
    } catch (e) {
      console.log('更新浏览次数失败', e);
    }
    
    renderPolicyDetail(container, policy);
  } catch (error) {
    console.error('加载政策详情失败:', error);
    showError(container, '加载政策详情失败');
  }
}

function renderPolicyDetail(container, policy) {
  const html = `
    <div class="card">
      ${policy.cover_image ? `
        <div style="margin-bottom: 30px;">
          <img src="${escapeHtml(policy.cover_image)}" alt="${escapeHtml(policy.title)}" 
               style="width: 100%; border-radius: 12px; max-height: 500px; object-fit: cover;">
        </div>
      ` : ''}
      
      <h1 style="font-size: 36px; margin-bottom: 20px; line-height: 1.3;">
        ${escapeHtml(policy.title)}
      </h1>
      
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
        <span class="tag ${getLevelTagClass(policy.level)}" style="font-size: 14px;">
          ${escapeHtml(policy.level || '未分类')}
        </span>
        <span style="color: var(--text-secondary);">
          <i class="fas fa-building"></i> ${escapeHtml(policy.department || '未知部门')}
        </span>
        <span style="color: var(--text-secondary);">
          <i class="fas fa-tag"></i> ${escapeHtml(policy.category || '未分类')}
        </span>
        <span style="color: var(--text-secondary);">
          <i class="fas fa-calendar"></i> ${formatDate(policy.publish_date)}
        </span>
        <span style="color: var(--text-secondary);">
          <i class="fas fa-eye"></i> ${(policy.views || 0) + 1} 次浏览
        </span>
      </div>
      
      <div class="card-content rich-text-content" style="font-size: 18px; line-height: 1.8;">
        ${formatRichTextContent(policy.content || '暂无内容')}
      </div>
      
      ${policy.file_url ? `
        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border-color);">
          <a href="${escapeHtml(policy.file_url)}" target="_blank" class="btn btn-primary">
            <i class="fa fa-university"></i> 访问原发布页面
          </a>
        </div>
      ` : ''}
      
      ${policy.tags && policy.tags.length > 0 ? `
        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border-color);">
          <strong style="font-size: 16px; margin-right: 12px;">相关标签：</strong>
          ${policy.tags.map(tag => `<span class="tag" style="font-size: 14px;">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  container.innerHTML = html;
}

function getLevelTagClass(level) {
  switch(level) {
    case '国家级':
      return 'danger';
    case '省级':
      return 'warning';
    case '市级':
      return 'primary';
    default:
      return '';
  }
}
