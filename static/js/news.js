// 新闻资讯页面逻辑

let currentCategory = 'all';
let currentPage = 1;
let searchQuery = '';
let pagination;

document.addEventListener('DOMContentLoaded', () => {
  initCategoryTabs();
  initSearch();
  loadNews();
  
  pagination = new Pagination('pagination-container', {
    currentPage: 1,
    totalPages: 1,
    onPageChange: (page) => {
      currentPage = page;
      loadNews();
      scrollToTop();
    }
  });
});

function initCategoryTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      currentPage = 1;
      loadNews();
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    currentPage = 1;
    loadNews();
  }, 500));
}

function handleSearch() {
  const searchInput = document.getElementById('search-input');
  searchQuery = searchInput.value.trim();
  currentPage = 1;
  loadNews();
}

async function loadNews() {
  const container = document.getElementById('news-container');
  
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
    
    const response = await api.getNews(params);
    
    if (response.data && response.data.length > 0) {
      let filteredData = response.data;
      if (currentCategory !== 'all') {
        filteredData = response.data.filter(news => news.category === currentCategory);
      }
      
      if (filteredData.length > 0) {
        renderNews(container, filteredData);
        const totalPages = Math.ceil(response.total / params.limit);
        pagination.update(currentPage, totalPages);
      } else {
        container.innerHTML = '<div class="loading"><div>未找到相关新闻</div></div>';
        pagination.update(1, 1);
      }
    } else {
      container.innerHTML = '<div class="loading"><div>暂无新闻资讯</div></div>';
      pagination.update(1, 1);
    }
  } catch (error) {
    console.error('加载新闻失败:', error);
    showError(container);
  }
}

function renderNews(container, newsItems) {
  const html = newsItems.map(item => `
    <div class="list-item" onclick="location.href='news-detail.html?id=${item.id}'">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="list-item-meta">
        <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
        <span><i class="fas fa-user"></i> ${escapeHtml(item.author || '未知')}</span>
        <span><i class="fas fa-calendar"></i> ${formatDate(item.publish_date)}</span>
        <span><i class="fas fa-eye"></i> ${item.views || 0} 次浏览</span>
      </div>
      <div class="list-item-content rich-text-preview">
        ${formatRichTextPreview(item.content, 200)}
      </div>
      ${item.tags && item.tags.length > 0 ? `
        <div style="margin-top: 12px;">
          ${item.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = html;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
