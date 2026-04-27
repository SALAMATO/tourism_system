
document.addEventListener('DOMContentLoaded', () => {
  const hotContainer = document.getElementById('destinations-container');
  if (hotContainer) {
    loadHotDestinations();
  }
  loadHomepageDestinationModules();
  loadLatestNews();
  loadStatistics();
});

async function loadHomepageDestinationModules() {
  const nearbyContainer = document.getElementById('nearby-destination-content');
  const managedContainer = document.getElementById('managed-destination-content');

  if (!nearbyContainer || !managedContainer) {
    return;
  }

  try {
    const response = await api.getHomepageDestinationModules();
    renderHomepageDestinationModule('nearby', response.nearby, nearbyContainer);
    renderHomepageDestinationModule('managed', response.managed, managedContainer);
  } catch (error) {
    console.error('加载首页目的地模块失败:', error);
    nearbyContainer.innerHTML = '<div class="loading"><div>加载失败，请稍后重试</div></div>';
    managedContainer.innerHTML = '<div class="loading"><div>加载失败，请稍后重试</div></div>';
  }
}

function renderHomepageDestinationModule(type, moduleData, container) {
  if (!moduleData) {
    container.innerHTML = '<div class="loading"><div>暂无推荐内容</div></div>';
    return;
  }

  const citiesHtml = (moduleData.cities || []).map(city => `
    <button class="destination-switch-btn ${city === moduleData.current_city ? 'active' : ''}" data-module-type="${type}" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>
  `).join('');

  const itemsHtml = (moduleData.items || []).map(item => {
    const richContent = item.features_rich_text || item.features_display || item.description || '';
    return `
    <a href="/destination-detail.html?id=${item.id}" class="destination-explore-card">
      <div class="destination-explore-image-wrap">
        <img src="${escapeHtml(item.cover_image_url || item.cover_image || '')}" alt="${escapeHtml(item.name)}" class="destination-explore-image">
      </div>
      <div class="destination-explore-body">
        <div class="destination-explore-title-row">
          <h3>${escapeHtml(item.name)}</h3>
          <span><i class="fas fa-star" style="color:#ef4444;"></i> ${Number(item.rating || 0).toFixed(1)}</span>
        </div>
        <div class="destination-explore-location"><i class="fas fa-location-dot"></i> ${escapeHtml(item.city)} · ${escapeHtml(item.location || '')}</div>
        <div class="destination-explore-desc rich-text-content rich-text-clamp">${richContent}</div>
        <div class="destination-explore-meta">
          <span>${escapeHtml(item.duration || '')}</span>
          <strong>${escapeHtml(item.price_range || '')}</strong>
        </div>
      </div>
    </a>
  `}).join('');

  container.innerHTML = `
    <div class="destination-explore-panel">
      <div class="destination-explore-toolbar">
        <div class="destination-switch-group">${citiesHtml}</div>
        <a href="/destinations/" class="btn btn-secondary destination-more-btn">查看旅游目的地</a>
      </div>
      <div class="destination-explore-grid">
        ${itemsHtml || '<div class="loading"><div>当前城市暂无低空旅游项目</div></div>'}
      </div>
    </div>
  `;

  container.querySelectorAll('.destination-switch-btn').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        const nearbyCity = type === 'nearby' ? button.dataset.city : document.querySelector('[data-module-type="nearby"].active')?.dataset.city;
        const managedCity = type === 'managed' ? button.dataset.city : document.querySelector('[data-module-type="managed"].active')?.dataset.city;
        const response = await api.getHomepageDestinationModules({ nearby_city: nearbyCity, managed_city: managedCity });
        renderHomepageDestinationModule('nearby', response.nearby, document.getElementById('nearby-destination-content'));
        renderHomepageDestinationModule('managed', response.managed, document.getElementById('managed-destination-content'));
      } catch (error) {
        console.error('切换首页目的地城市失败:', error);
      }
    });
  });
}

// 加载热门目的地
async function loadHotDestinations() {
  const container = document.getElementById('destinations-container');
  if (!container) return;
  
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
        ${dest.cover_image_url || dest.cover_image ? 
          `<img src="${dest.cover_image_url || dest.cover_image}" alt="${escapeHtml(dest.name)}" style="width: 100%; height: 100%; object-fit: cover;">` :
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
            <span>${Number(dest.rating || 0).toFixed(1)}</span>
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
