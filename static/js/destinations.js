document.addEventListener('DOMContentLoaded', async () => {
  const listContainer = document.getElementById('destination-page-list');
  const cityFilter = document.getElementById('destination-city-filter');
  const levelButtons = Array.from(document.querySelectorAll('[data-domestic]'));
  const typeButtons = Array.from(document.querySelectorAll('[data-type]'));

  let currentDomestic = 'true'; // 默认显示国内
  let currentCity = '';
  let currentType = 'all';
  let cache = [];
  let smartRecommendCache = []; // 智能推荐缓存

  // 更新城市列表
  function updateCities() {
    const filteredCache = cache.filter(item => item.is_domestic === (currentDomestic === 'true'));
    // 国内显示城市，海外显示国家
    const locationField = currentDomestic === 'true' ? 'city' : 'country';
    const locations = [...new Set(filteredCache.map(item => item[locationField]).filter(Boolean))];
    renderCities(locations);
  }

  function renderCities(locations) {
    if (!locations.length) {
      cityFilter.innerHTML = '<span class="city-chip active">暂无地区</span>';
      currentCity = '';
      return;
    }

    cityFilter.innerHTML = locations.map((location, index) => `
      <button class="city-chip ${index === 0 ? 'active' : ''}" data-city="${escapeHtml(location)}">${escapeHtml(location)}</button>
    `).join('');

    currentCity = locations[0];

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
    let filtered = [];

    // 智能推荐模式
    if (currentType === 'all') {
      filtered = [...smartRecommendCache];
      
      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：城市/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'city' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }
    }
    // 最新发布模式
    else if (currentType === 'latest') {
      filtered = [...cache];
      
      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：城市/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'city' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }
      
      // 按创建时间降序排序（最新发布）
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    // 其他推荐类型模式
    else {
      filtered = [...cache];

      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：城市/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'city' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }

      // 三级过滤：推荐类型
      filtered = filtered.filter(item => {
        const types = item.recommendation_type || [];
        return Array.isArray(types) && types.includes(currentType);
      });
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
          <div class="destination-page-location"><i class="fas fa-location-dot"></i> ${escapeHtml(currentDomestic === 'true' ? item.city : item.country)} · ${escapeHtml(item.location || '')}</div>
          <p class="destination-page-desc">${truncateText(stripHtmlTags(item.description || ''), 96)}</p>
          <div class="destination-page-meta">
            <span>${escapeHtml(item.duration || '')}</span>
            <span>${escapeHtml(item.price_range || '')}</span>
          </div>
        </div>
      </a>
    `).join('');
  }

  // 加载智能推荐数据
  async function loadSmartRecommend() {
    try {
      const params = {
        is_domestic: currentDomestic
      };
      if (currentCity) {
        params.city = currentCity;
      }
      
      const query = new URLSearchParams(params).toString();
      const response = await api.request(`/api/destinations/smart_recommend/?${query}`);
      smartRecommendCache = response || [];
    } catch (error) {
      console.error('加载智能推荐失败:', error);
      smartRecommendCache = [];
    }
  }

  // 一级按钮事件：范围切换
  levelButtons.forEach(button => {
    button.addEventListener('click', async () => {
      levelButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentDomestic = button.dataset.domestic;
      currentCity = ''; // 重置城市选择
      currentType = 'all'; // 重置推荐类型
      
      // 重置三级按钮
      typeButtons.forEach(item => item.classList.remove('active'));
      typeButtons[0].classList.add('active');
      
      // 重新加载智能推荐
      listContainer.innerHTML = '<div class="destination-page-empty">正在加载智能推荐...</div>';
      await loadSmartRecommend();
      
      updateCities();
      renderList();
    });
  });

  // 三级按钮事件：推荐方式
  typeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      typeButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentType = button.dataset.type;
      
      // 智能推荐模式
      if (currentType === 'all') {
        listContainer.innerHTML = '<div class="destination-page-empty">正在计算智能推荐...</div>';
        await loadSmartRecommend();
      }
      // 周边推荐模式
      else if (currentType === 'nearby' && currentDomestic === 'true') {
        try {
          listContainer.innerHTML = '<div class="destination-page-empty">正在获取周边推荐...</div>';
          const nearbyResponse = await api.request('/api/destinations/nearby_by_ip/');
          if (nearbyResponse && nearbyResponse.destinations) {
            const ipDestinations = nearbyResponse.destinations;
            const ipIds = new Set(ipDestinations.map(d => d.id));
            
            // 移除原有的包含nearby的目的地，添加IP推荐的
            cache = cache.filter(item => {
              const types = item.recommendation_type || [];
              return !(Array.isArray(types) && types.includes('nearby') && ipIds.has(item.id));
            });
            cache = cache.concat(ipDestinations);
            
            console.log(`周边推荐：基于IP ${nearbyResponse.ip}，定位到 ${nearbyResponse.user_province} ${nearbyResponse.user_city}`);
          }
        } catch (ipError) {
          console.error('IP定位失败，使用默认推荐:', ipError);
        }
      }
      
      updateCities();
      renderList();
    });
  });

  try {
    // 加载所有目的地到缓存
    const response = await api.getDestinations({ limit: 500, sort: 'sort_order' });
    cache = response.data || [];
    
    // 加载智能推荐
    await loadSmartRecommend();
    
    updateCities();
    renderList();
  } catch (error) {
    console.error('加载旅游目的地列表失败:', error);
    listContainer.innerHTML = '<div class="destination-page-empty">加载失败，请稍后重试。</div>';
  }
});
