// 新闻详情页面逻辑

document.addEventListener('DOMContentLoaded', () => {
  const newsId = getUrlParameter('id');
  if (newsId) {
    loadNewsDetail(newsId);
  } else {
    showError(document.getElementById('news-detail-container'), '缺少新闻ID参数');
  }
});

async function loadNewsDetail(newsId) {
  const container = document.getElementById('news-detail-container');
  
  try {
    showLoading(container);
    const news = await api.getNewsItem(newsId);
    
    // 增加浏览次数
    try {
      await api.incrementNewsViews(newsId, news.views || 0);
    } catch (e) {
      console.log('更新浏览次数失败', e);
    }
    
    renderNewsDetail(container, news);
  } catch (error) {
    console.error('加载新闻详情失败:', error);
    showError(container, '加载新闻详情失败');
  }
}

function renderNewsDetail(container, news) {
  const html = `
    <div class="card">
      <h1 style="font-size: 36px; margin-bottom: 20px; line-height: 1.3;">
        ${escapeHtml(news.title)}
      </h1>
      
      <div class="list-item-meta" style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
        <span><i class="fas fa-tag"></i> ${escapeHtml(news.category || '未分类')}</span>
        <span><i class="fas fa-user"></i> ${escapeHtml(news.author || '未知')}</span>
        <span><i class="fas fa-calendar"></i> ${formatDateTime(news.publish_date)}</span>
        <span><i class="fas fa-eye"></i> ${(news.views || 0) + 1} 次浏览</span>
      </div>
      
      ${news.cover_image ? `
        <div style="margin-bottom: 30px;">
          <img src="${escapeHtml(news.cover_image)}" alt="${escapeHtml(news.title)}" 
               style="width: 100%; border-radius: 12px; max-height: 500px; object-fit: cover;">
        </div>
      ` : ''}
      
      <div class="card-content rich-text-content" style="font-size: 18px; line-height: 1.8;">${formatRichTextContent(news.content || '暂无内容')}</div>
      
      ${news.tags && news.tags.length > 0 ? `
        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border-color);">
          <strong style="font-size: 16px; margin-right: 12px;">标签：</strong>
          ${news.tags.map(tag => `<span class="tag" style="font-size: 14px;">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  container.innerHTML = html;
}
