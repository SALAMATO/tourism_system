
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
    // 加载周边目的地（使用周边模式）
    const nearbyResponse = await api.request('/api/destinations/nearby_by_ip/');
    console.log('首页周边推荐API响应:', nearbyResponse);
    
    if (nearbyResponse && nearbyResponse.destinations) {
      console.log(`周边推荐原始数据量: ${nearbyResponse.destinations.length}`);
      const nearbyDestinations = nearbyResponse.destinations.slice(0, 4); // 只显示前4个
      console.log(`首页周边推荐：实际显示 ${nearbyDestinations.length} 个目的地`);
      renderHomepageDestinationModule('nearby', nearbyDestinations, nearbyContainer, nearbyResponse.user_city);
    } else {
      nearbyContainer.innerHTML = '<div class="loading"><div>暂无周边推荐</div></div>';
    }
    
    // 加载显示全部目的地（使用智能推荐 - 国内模式）
    const allResponse = await api.request('/api/destinations/smart_recommend/?is_domestic=true');
    console.log('首页智能推荐API响应:', allResponse);
    
    if (allResponse && Array.isArray(allResponse)) {
      console.log(`智能推荐原始数据量: ${allResponse.length}`);
      const allDestinations = allResponse.slice(0, 4); // 只显示前4个
      console.log(`首页智能推荐：实际显示 ${allDestinations.length} 个目的地`);
      renderHomepageDestinationModule('all', allDestinations, managedContainer, null);
    } else {
      managedContainer.innerHTML = '<div class="loading"><div>暂无推荐内容</div></div>';
    }
  } catch (error) {
    console.error('加载首页目的地模块失败:', error);
    nearbyContainer.innerHTML = '<div class="loading"><div>加载失败，请稍后重试</div></div>';
    managedContainer.innerHTML = '<div class="loading"><div>加载失败，请稍后重试</div></div>';
  }
}

function renderHomepageDestinationModule(type, destinations, container, userCity) {
  if (!destinations || destinations.length === 0) {
    container.innerHTML = '<div class="loading"><div>暂无推荐内容</div></div>';
    return;
  }

  // 生成目的地卡片 HTML
  const itemsHtml = destinations.map(item => {
    // 根据类型确定位置显示格式
    let locationText;
    if (type === 'nearby') {
      // 周边模式：显示 省份 · 具体位置
      locationText = `${escapeHtml(item.state || item.city)} · ${escapeHtml(item.location || '')}`;
    } else if (type === 'all') {
      // 显示全部模式：国内显示省份，海外显示国家
      if (item.is_domestic) {
        locationText = `${escapeHtml(item.state || item.city)} · ${escapeHtml(item.location || '')}`;
      } else {
        locationText = `${escapeHtml(item.country)}`; // 只显示国家
      }
    } else {
      // 默认：城市 · 位置
      locationText = `${escapeHtml(item.city)} · ${escapeHtml(item.location || '')}`;
    }
    
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
        <div class="destination-explore-location"><i class="fas fa-location-dot"></i> ${locationText}</div>
        <div class="destination-explore-desc rich-text-content rich-text-clamp">${richContent}</div>
        <div class="destination-explore-meta">
          <span>${escapeHtml(item.duration || '')}</span>
          <strong>${escapeHtml(item.price_range || '')}</strong>
        </div>
      </div>
    </a>
  `}).join('');

  // 生成标题和描述
  let title, subtitle, tagText;
  if (type === 'nearby') {
    tagText = 'AROUND YOU';
    title = '周边低空旅行';
    subtitle = userCity 
      ? `基于您当前所在城市（${escapeHtml(userCity)}）推荐的低空旅行目的地`
      : '结合城市维度展示更贴近当前浏览者的低空旅行灵感，让每一座城市都拥有独特的云端风景。';
  } else if (type === 'all') {
    tagText = "EDITOR'S PICK";
    title = '精选低空旅行';
    subtitle = '呈现更值得关注的空中观光、热气球与飞行体验目的地。';
  }

  container.innerHTML = `
    <div class="destination-explore-panel">
      <div class="homepage-destination-heading">
        <div>
          <div class="recommend-tag">${tagText}</div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
      </div>
      <div class="destination-explore-grid">
        ${itemsHtml}
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <a href="/destinations/" class="btn btn-secondary destination-more-btn">查看更多目的地</a>
      </div>
    </div>
  `;
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
          <i class="fas fa-map-marker-alt"></i> ${escapeHtml(dest.city)} · ${escapeHtml(dest.location)}
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
