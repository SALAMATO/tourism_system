// 新闻资讯页面逻辑

let currentCategory = 'all';
let currentPage = 1;
let searchQuery = '';
let pagination;

// 相对时间格式化函数
function formatTime(dateString) {
    const now = new Date();
    const publishTime = new Date(dateString);
    const diff = now - publishTime;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
        return `${minutes} 分钟前`;
    }

    if (hours < 24) {
        return `${hours} 小时前`;
    }

    if (days === 1) {
        return "昨天";
    }

    if (days <= 3) {
        return `${days} 天前`;
    }

    return publishTime.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

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
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            <h3>未找到相关新闻</h3>
            <p>请尝试其他搜索关键词或分类</p>
          </div>
        `;
        pagination.update(1, 1);
      }
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>暂无新闻资讯</h3>
          <p>敬请期待更多精彩内容</p>
        </div>
      `;
      pagination.update(1, 1);
    }
  } catch (error) {
    console.error('加载新闻失败:', error);
    showError(container);
  }
}

function renderNews(container, newsItems) {
  const html = `
    <div class="news-grid">
      ${newsItems.map(item => `
        <div class="apple-news-card" onclick="location.href='news-detail.html?id=${item.id}'">
          <div class="news-image-container">
            ${item.cover_image ? `
              <img src="${escapeHtml(item.cover_image)}" alt="${escapeHtml(item.title)}" loading="lazy">
            ` : `
              <div class="news-image-placeholder">
                <i class="fas fa-newspaper"></i>
              </div>
            `}
          </div>
          <div class="news-card-content">
            <div class="news-category-badge">${escapeHtml(item.category || '新闻资讯')}</div>
            <h3 class="news-card-title">${escapeHtml(item.title)}</h3>
            <div class="news-card-meta">
              <span>
                <i class="fas fa-clock"></i>
                ${formatTime(item.publish_date)}
              </span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
