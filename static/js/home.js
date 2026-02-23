// 首页逻辑

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
