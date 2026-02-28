// 首页逻辑

document.addEventListener('DOMContentLoaded', () => {
  loadHotDestinations();
  loadLatestNews();
  loadStatistics();
});

//检测 hero 是否在屏幕中
document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero-large');
  const navbar = document.querySelector('.navbar');

  if (!hero || !navbar) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        navbar.classList.add('hero-active');
      } else {
        navbar.classList.remove('hero-active');
      }
    },
    {
      root: null,
      threshold: 0.1   // hero 还有 10% 在视口就算“在 hero 区域”
    }
  );

  observer.observe(hero);
});

// 加载热门目的地
async function loadHotDestinations() {
  const container = document.getElementById('destinations-container');

  try {
    showLoading(container);
    const response = await fetch('http://127.0.0.1:8000/api/destinations/hot/');

    if (response.ok) {
      const destinations = await response.json();
      renderDestinations(container, destinations);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无目的地数据</div></div>';
    }
  } catch (error) {
    console.error('加载目的地失败:', error);
    container.innerHTML = '<div class="loading"><div>加载失败，请稍后重试</div></div>';
  }
}

// 渲染目的地列表
function renderDestinations(container, destinations) {
  if (!destinations || destinations.length === 0) {
    container.innerHTML = '<div class="loading"><div>暂无热门目的地</div></div>';
    return;
  }

  const html = destinations.map(dest => `
    <a href="destination-detail.html?id=${dest.id}" class="destination-card">
      <div class="destination-image">
        ${dest.cover_image ? 
          `<img src="${dest.cover_image}" alt="${escapeHtml(dest.name)}" style="width: 100%; height: 100%; object-fit: cover;">` :
          `<i class="fas fa-helicopter"></i>`
        }
      </div>
      <div class="destination-content">
        <h3 class="destination-title">${escapeHtml(dest.name)}</h3>
        <div class="destination-location">
          <i class="fas fa-map-marker-alt"></i> ${escapeHtml(dest.location)}
        </div>
        <p class="destination-desc">${truncateText(escapeHtml(dest.description), 80)}</p>
        <div class="destination-meta">
          <div class="destination-rating">
            <i class="fas fa-star"></i>
            <span>${dest.rating.toFixed(1)}</span>
            <span style="color: var(--text-secondary); margin-left: 8px; font-size: 14px;">
              ${dest.views} 人浏览
            </span>
          </div>
          <div class="destination-price">
            ${escapeHtml(dest.price_range)}
          </div>
        </div>
      </div>
    </a>
  `).join('');

  container.innerHTML = html;
}

// 加载最新新闻
async function loadLatestNews() {
  const container = document.getElementById('latest-news-container');

  try {
    showLoading(container);
    const response = await api.getNews({ limit: 3, sort: '-created_at' });

    if (response.data && response.data.length > 0) {
      renderNewsList(container, response.data);
    } else {
      container.innerHTML = '<div class="loading"><div>暂无新闻资讯</div></div>';
    }
  } catch (error) {
    console.error('加载新闻失败:', error);
    showError(container);
  }
}

// 渲染新闻列表
function renderNewsList(container, newsItems) {
  const html = newsItems.map(item => `
    <div class="list-item" onclick="location.href='news-detail.html?id=${item.id}'">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="list-item-meta">
        <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
        <span><i class="fas fa-user"></i> ${escapeHtml(item.author || '未知')}</span>
        <span><i class="fas fa-calendar"></i> ${formatDate(item.publish_date)}</span>
        <span><i class="fas fa-eye"></i> ${item.views || 0} 次浏览</span>
      </div>
      <div class="list-item-content">
        ${truncateText(stripHtml(item.content), 150)}
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

// 去除HTML标签
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// 加载统计数据
async function loadStatistics() {
  try {
    const response = await api.getStatistics({ limit: 100 });

    if (response.data && response.data.length > 0) {
      // 计算总数
      let totalTourists = 0;
      let totalRevenue = 0;
      let totalFlights = 0;
      let avgGrowth = 0;

      response.data.forEach(item => {
        totalTourists += item.tourist_count || 0;
        totalRevenue += item.revenue || 0;
        totalFlights += item.flight_count || 0;
        avgGrowth += item.growth_rate || 0;
      });

      avgGrowth = response.data.length > 0 ? (avgGrowth / response.data.length).toFixed(1) : 0;
      totalRevenue = (totalRevenue / 10000).toFixed(2); // 转换为亿元

      // 更新显示
      document.getElementById('stat-tourists').textContent = totalTourists.toLocaleString();
      document.getElementById('stat-revenue').textContent = totalRevenue;
      document.getElementById('stat-flights').textContent = totalFlights.toLocaleString();
      document.getElementById('stat-growth').textContent = avgGrowth;
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}


// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  loadLatestNews();
  loadStatistics();
});


