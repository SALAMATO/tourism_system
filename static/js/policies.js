// 政策法规页面逻辑

let currentCategory = 'all';
let currentPage = 1;
let searchQuery = '';
let pagination;
const policyModal = new Modal('policy-modal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initCategoryTabs();
  initSearch();
  loadPolicies();
  
  // 初始化分页器
  pagination = new Pagination('pagination-container', {
    currentPage: 1,
    totalPages: 1,
    onPageChange: (page) => {
      currentPage = page;
      loadPolicies();
      scrollToTop();
    }
  });
});

// 初始化分类标签
function initCategoryTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 更新激活状态
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 更新当前分类
      currentCategory = tab.dataset.category;
      currentPage = 1;
      loadPolicies();
    });
  });
}

// 初始化搜索
function initSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    loadPolicies();
  }, 500));
}

// 搜索处理
function handleSearch() {
  const searchInput = document.getElementById('search-input');
  searchQuery = searchInput.value.trim();
  currentPage = 1;
  loadPolicies();
}

// 加载政策列表
async function loadPolicies() {
  const container = document.getElementById('policies-container');
  
  try {
    showLoading(container);
    
    const params = {
      page: currentPage,
      limit: 10,
      sort: '-created_at'
    };
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    const response = await api.getPolicies(params);
    
    if (response.data && response.data.length > 0) {
      // 如果有分类筛选，客户端过滤
      let filteredData = response.data;
      if (currentCategory !== 'all') {
        filteredData = response.data.filter(policy => 
          policy.level === currentCategory || policy.category === currentCategory
        );
      }
      
      if (filteredData.length > 0) {
        renderPolicies(container, filteredData);
        
        // 更新分页
        const totalPages = Math.ceil(response.total / params.limit);
        pagination.update(currentPage, totalPages);
      } else {
        container.innerHTML = '<div class="loading"><div>未找到相关政策</div></div>';
        pagination.update(1, 1);
      }
    } else {
      container.innerHTML = '<div class="loading"><div>暂无政策数据</div></div>';
      pagination.update(1, 1);
    }
  } catch (error) {
    console.error('加载政策失败:', error);
    showError(container);
  }
}

// 渲染政策列表
function renderPolicies(container, policies) {
  const html = policies.map(policy => `
    <div class="list-item" onclick="showPolicyDetail('${policy.id}')">
      <div class="list-item-header">
        <div>
          <h3>${escapeHtml(policy.title)}</h3>
          <div class="list-item-meta">
            <span><i class="fas fa-building"></i> ${escapeHtml(policy.department || '未知部门')}</span>
            <span><i class="fas fa-layer-group"></i> ${escapeHtml(policy.level || '未分类')}</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(policy.publish_date)}</span>
          </div>
        </div>
        <span class="tag ${getLevelTagClass(policy.level)}">${escapeHtml(policy.level || '未分类')}</span>
      </div>
      <div class="list-item-content preserve-whitespace">
        ${truncateText(stripHtml(policy.content), 200)}
      </div>
      ${policy.tags && policy.tags.length > 0 ? `
        <div style="margin-top: 12px;">
          ${policy.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// 获取级别标签样式
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

// 显示政策详情
async function showPolicyDetail(policyId) {
  try {
    const policy = await api.getPolicy(policyId);
    
    const detailHtml = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <h2 style="margin: 0; flex: 1;">${escapeHtml(policy.title)}</h2>
          <span class="tag ${getLevelTagClass(policy.level)}" style="font-size: 14px;">
            ${escapeHtml(policy.level || '未分类')}
          </span>
        </div>
        
        <div class="list-item-meta" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
          <span><i class="fas fa-building"></i> ${escapeHtml(policy.department || '未知部门')}</span>
          <span><i class="fas fa-tag"></i> ${escapeHtml(policy.category || '未分类')}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(policy.publish_date)}</span>
        </div>
        
        <div class="card-content preserve-whitespace" style="line-height: 1.8;">${escapeHtml((policy.content || '暂无内容'))}</div>
        
        ${policy.file_url ? `
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color);">
            <a href="${escapeHtml(policy.file_url)}" target="_blank" class="btn btn-primary">
              <i class="fas fa-download"></i> 下载文件
            </a>
          </div>
        ` : ''}
        
        ${policy.tags && policy.tags.length > 0 ? `
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color);">
            <strong>标签：</strong>
            ${policy.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    document.getElementById('policy-detail').innerHTML = detailHtml;
    policyModal.open();
  } catch (error) {
    console.error('加载政策详情失败:', error);
    showNotification('加载详情失败', 'error');
  }
}

// 去除HTML标签
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
