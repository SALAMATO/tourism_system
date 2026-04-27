document.addEventListener('DOMContentLoaded', async () => {
  const listContainer = document.getElementById('destination-page-list');
  const cityFilter = document.getElementById('destination-city-filter');
  const levelButtons = Array.from(document.querySelectorAll('[data-domestic]'));
  const typeButtons = Array.from(document.querySelectorAll('[data-type]'));

  let currentDomestic = 'true'; // 默认显示国内
  let currentCity = '';
  let currentType = 'all';
  let cache = [];

  // 更新城市列表
  function updateCities() {
    const filteredCache = cache.filter(item => item.is_domestic === (currentDomestic === 'true'));
    const cities = [...new Set(filteredCache.map(item => item.city).filter(Boolean))];
    renderCities(cities);
  }

  function renderCities(cities) {
    if (!cities.length) {
      cityFilter.innerHTML = '<span class="city-chip active">暂无城市</span>';
      currentCity = '';
      return;
    }

    cityFilter.innerHTML = cities.map((city, index) => `
      <button class="city-chip ${index === 0 ? 'active' : ''}" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>
    `).join('');

    currentCity = cities[0];

    cityFilter.querySelectorAll('[data-city]').forEach(button => {
      button.addEventListener('click', () => {
        cityFilter.querySelectorAll('[data-city]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        currentCity = button.dataset.city;
        renderList();
      });
    });
  }

  function renderList() {
    let filtered = [...cache];

    // 一级过滤：国内/海外
    filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

    // 二级过滤：城市
    if (currentCity) {
      filtered = filtered.filter(item => item.city === currentCity);
    }

    // 三级过滤：推荐类型
    if (currentType !== 'all') {
      filtered = filtered.filter(item => item.recommendation_type === currentType);
    }

    if (!filtered.length) {
      const msg = currentDomestic === 'true' ? '国内' : '海外';
      listContainer.innerHTML = `<div class="destination-page-empty">当前筛选条件下暂无${msg}目的地，请切换其他筛选条件。</div>`;
      return;
    }

    listContainer.innerHTML = filtered.map(item => `
      <a class="destination-page-card" href="/destination-detail.html?id=${item.id}">
        <img src="${escapeHtml(item.cover_image_url || item.cover_image || '')}" alt="${escapeHtml(item.name)}">
        <div class="destination-page-card-body">
          <div class="destination-page-card-top">
            <h3>${escapeHtml(item.name)}</h3>
            <div><i class="fas fa-star" style="color:#ef4444;"></i> ${Number(item.rating || 0).toFixed(1)}</div>
          </div>
          <div class="destination-page-location"><i class="fas fa-location-dot"></i> ${escapeHtml(item.city)} · ${escapeHtml(item.location || '')}</div>
          <p class="destination-page-desc">${truncateText(stripHtmlTags(item.description || ''), 96)}</p>
          <div class="destination-page-meta">
            <span>${escapeHtml(item.duration || '')}</span>
            <span>${escapeHtml(item.price_range || '')}</span>
          </div>
        </div>
      </a>
    `).join('');
  }

  // 一级按钮事件：范围切换
  levelButtons.forEach(button => {
    button.addEventListener('click', () => {
      levelButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentDomestic = button.dataset.domestic;
      currentCity = ''; // 重置城市选择
      currentType = 'all'; // 重置推荐类型
      
      // 重置三级按钮
      typeButtons.forEach(item => item.classList.remove('active'));
      typeButtons[0].classList.add('active');
      
      updateCities();
      renderList();
    });
  });

  // 三级按钮事件：推荐方式
  typeButtons.forEach(button => {
    button.addEventListener('click', () => {
      typeButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentType = button.dataset.type;
      renderList();
    });
  });

  try {
    const response = await api.getDestinations({ limit: 200, sort: 'sort_order' });
    cache = response.data || [];
    updateCities();
    renderList();
  } catch (error) {
    console.error('加载旅游目的地列表失败:', error);
    listContainer.innerHTML = '<div class="destination-page-empty">加载失败，请稍后重试。</div>';
  }
});
