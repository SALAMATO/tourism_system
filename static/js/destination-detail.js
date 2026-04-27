document.addEventListener('DOMContentLoaded', async () => {
  const shell = document.getElementById('destination-detail-shell');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    shell.innerHTML = '<div class="card"><h2>未找到目的地</h2><p>请返回目的地列表重新选择。</p></div>';
    return;
  }

  try {
    const destination = await api.getDestination(id);
    await api.incrementDestinationViews(id);

    const fallbackImage = 'https://via.placeholder.com/1200x800/f3f4f6/9ca3af?text=Low+Altitude+Tourism';
    const images = [
      destination.cover_image_url || destination.cover_image,
      destination.gallery_image_1_url || destination.gallery_image_1,
      destination.gallery_image_2_url || destination.gallery_image_2,
      destination.gallery_image_3_url || destination.gallery_image_3,
      destination.gallery_image_4_url || destination.gallery_image_4,
    ].filter(Boolean);

    const gallery = [...images];
    while (gallery.length < 5) {
      gallery.push(gallery[0] || fallbackImage);
    }

    const featuresHtml = destination.features_display || (Array.isArray(destination.features) ? destination.features.join('') : '');

    shell.innerHTML = `
      <header class="detail-header">
        <div class="detail-title">${escapeHtml(destination.name)}</div>
        <div class="detail-meta-row">
          <span><i class="fas fa-star" style="color:#ef4444;"></i> ${Number(destination.rating || 0).toFixed(1)}</span>
          <span><i class="fas fa-location-dot"></i> ${escapeHtml(destination.city)} · ${escapeHtml(destination.location || '')}</span>
          <span><i class="fas fa-eye"></i> ${destination.views || 0} 次浏览</span>
          <span><i class="fas fa-tag"></i> ${escapeHtml(destination.category || '')}</span>
        </div>
      </header>

      <section class="detail-gallery">
        <div class="detail-gallery-main" style="background-image:url('${gallery[0]}')"></div>
        <div class="detail-gallery-side" style="background-image:url('${gallery[1]}')"></div>
        <div class="detail-gallery-side" style="background-image:url('${gallery[2]}')"></div>
        <div class="detail-gallery-side" style="background-image:url('${gallery[3]}')"></div>
        <div class="detail-gallery-side" style="background-image:url('${gallery[4]}')"></div>
      </section>

      <div class="detail-main-layout">
        <div>
          <section class="detail-section">
            <h2>${escapeHtml(destination.city)}的精选低空旅行体验</h2>
            <div class="rich-text-content">${destination.description || ''}</div>
          </section>

          <section class="detail-section">
            <h2>目的地亮点</h2>
            <div class="rich-text-content">${featuresHtml || '<p>暂无亮点介绍</p>'}</div>
          </section>

          <section class="detail-section">
            <h2>行程信息</h2>
            <div class="detail-stat-list">
              <div class="detail-stat-card"><strong>${escapeHtml(destination.price_range || '--')}</strong><span>价格区间</span></div>
              <div class="detail-stat-card"><strong>${escapeHtml(destination.duration || '--')}</strong><span>游玩时长</span></div>
              <div class="detail-stat-card"><strong>${escapeHtml(destination.best_season || '--')}</strong><span>最佳季节</span></div>
            </div>
          </section>
        </div>

        <aside class="booking-card">
          <div class="booking-price">${escapeHtml(destination.price_range || '--')}</div>
          <div class="booking-grid">
            <div class="booking-grid-item">
              <span class="booking-label">所在城市</span>
              <span class="booking-value">${escapeHtml(destination.city || '--')}</span>
            </div>
            <div class="booking-grid-item">
              <span class="booking-label">项目类型</span>
              <span class="booking-value">${escapeHtml(destination.category || '--')}</span>
            </div>
            <div class="booking-grid-item">
              <span class="booking-label">游玩时长</span>
              <span class="booking-value">${escapeHtml(destination.duration || '--')}</span>
            </div>
            <div class="booking-grid-item">
              <span class="booking-label">最佳季节</span>
              <span class="booking-value">${escapeHtml(destination.best_season || '--')}</span>
            </div>
          </div>
          <a href="/destinations/" class="btn btn-primary" style="width:100%; text-align:center;">查看更多目的地</a>
          <p style="text-align:center; margin-top:12px; color:#6b7280; font-size:12px;">推荐内容由热度、评分综合生成</p>
        </aside>
      </div>
    `;
  } catch (error) {
    console.error('加载目的地详情失败:', error);
    shell.innerHTML = '<div class="card"><h2>加载失败</h2><p>目的地详情暂时无法展示，请稍后重试。</p></div>';
  }
});
