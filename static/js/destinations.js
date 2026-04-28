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
  let nearbyDestinations = []; // 周边推荐缓存

  // 更新城市列表
  function updateCities() {
    let filteredCache = [];
    
    if (currentDomestic === 'nearby') {
      // 周边模式使用IP定位的目的地
      filteredCache = [...nearbyDestinations];
      console.log(`周边模式：当前有 ${filteredCache.length} 个目的地`);
      if (filteredCache.length > 0) {
        console.log('第一个目的地数据示例:', filteredCache[0]);
        console.log('所有城市的值:', filteredCache.map(item => item.city));
      }
    } else {
      filteredCache = cache.filter(item => item.is_domestic === (currentDomestic === 'true'));
    }
    
    // 国内显示省份，海外显示国家，周边显示城市
    let locationField;
    if (currentDomestic === 'nearby') {
      locationField = 'city';
    } else if (currentDomestic === 'true') {
      locationField = 'state';
    } else {
      locationField = 'country';
    }
    
    const locations = [...new Set(filteredCache.map(item => item[locationField]).filter(Boolean))];
    console.log(`更新城市列表：${locationField}字段，共 ${locations.length} 个唯一值`, locations);
    
    // 周边模式：按距离排序城市
    if (currentDomestic === 'nearby' && locations.length > 0) {
      // API返回的nearbyDestinations已经按距离排序（近的在前）
      // 我们根据每个城市第一次出现的顺序来确定距离远近
      const cityOrder = {};
      filteredCache.forEach((item, index) => {
        const city = item.city;
        // 只记录第一次出现的位置（最近的）
        if (!(city in cityOrder)) {
          cityOrder[city] = index;
        }
      });
      
      // 按首次出现的顺序排序（索引小的在前，表示距离近）
      locations.sort((a, b) => (cityOrder[a] || 999) - (cityOrder[b] || 999));
      console.log('周边城市按距离排序后:', locations);
      console.log('城市顺序映射:', cityOrder);
    }
    
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

    // 周边模式：按IP地理位置排序
    if (currentDomestic === 'nearby') {
      filtered = [...nearbyDestinations];
      
      // 二级过滤：城市
      if (currentCity) {
        filtered = filtered.filter(item => item.city === currentCity);
      }
      
      // 三级过滤：推荐类型（如果选择了）
      if (currentType !== 'all') {
        filtered = filtered.filter(item => {
          const types = item.recommendation_type || [];
          return Array.isArray(types) && types.includes(currentType);
        });
      }
    }
    // 智能推荐模式
    else if (currentType === 'all') {
      filtered = [...smartRecommendCache];
      
      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：省份/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'state' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }
    }
    // 最新发布模式
    else if (currentType === 'latest') {
      filtered = [...cache];
      
      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：省份/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'state' : 'country';
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

      // 二级过滤：省份/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'state' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }

      // 三级过滤：推荐类型
      filtered = filtered.filter(item => {
        const types = item.recommendation_type || [];
        return Array.isArray(types) && types.includes(currentType);
      });
    }

    if (!filtered.length) {
      let msg = '';
      if (currentDomestic === 'nearby') {
        msg = '周边';
      } else {
        msg = currentDomestic === 'true' ? '国内' : '海外';
      }
      listContainer.innerHTML = `<div class="destination-page-empty">当前筛选条件下暂无${msg}目的地，请切换其他筛选条件。</div>`;
      return;
    }

    // 确定显示的位置字段和标签
    let locationField, locationLabel;
    if (currentDomestic === 'nearby') {
      // 周边模式：显示 state · location（省份/州 · 具体位置）
      locationField = 'city';
      locationLabel = item => `${escapeHtml(item.state || item.city)} · ${escapeHtml(item.location || '')}`;
    } else if (currentDomestic === 'true') {
      // 国内模式：显示 state · location
      locationField = 'state';
      locationLabel = item => `${escapeHtml(item.state || item.city)} · ${escapeHtml(item.location || '')}`;
    } else {
      // 海外模式：显示 country · location
      locationField = 'country';
      locationLabel = item => `${escapeHtml(item.country)} · ${escapeHtml(item.location || '')}`;
    }

    listContainer.innerHTML = filtered.map(item => `
      <a class="destination-page-card" href="/destination-detail.html?id=${item.id}">
        <img src="${escapeHtml(item.cover_image_url || item.cover_image || '')}" alt="${escapeHtml(item.name)}">
        <div class="destination-page-card-body">
          <div class="destination-page-card-top">
            <h3>${escapeHtml(item.name)}</h3>
            <div><i class="fas fa-star" style="color:#ef4444;"></i> ${Number(item.rating || 0).toFixed(1)}</div>
          </div>
          <div class="destination-page-location"><i class="fas fa-location-dot"></i> ${locationLabel(item)}</div>
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
      
      // 如果是周边模式，加载IP定位数据
      if (currentDomestic === 'nearby') {
        listContainer.innerHTML = '<div class="destination-page-empty">正在获取周边推荐...</div>';
        try {
          const nearbyResponse = await api.request('/api/destinations/nearby_by_ip/');
          console.log('周边推荐API响应:', nearbyResponse);
          if (nearbyResponse && nearbyResponse.destinations) {
            nearbyDestinations = nearbyResponse.destinations;
            console.log(`周边推荐：基于IP ${nearbyResponse.ip}，定位到 ${nearbyResponse.user_province} ${nearbyResponse.user_city}`);
            console.log(`获取到 ${nearbyDestinations.length} 个周边目的地`);
            if (nearbyDestinations.length === 0) {
              console.warn('警告：没有获取到任何周边目的地，请检查数据库中是否有标记为nearby推荐类型的目的地');
            }
          } else {
            console.error('API响应格式错误:', nearbyResponse);
            nearbyDestinations = [];
          }
        } catch (ipError) {
          console.error('IP定位失败:', ipError);
          nearbyDestinations = [];
        }
      }
      // 否则加载智能推荐
      else {
        listContainer.innerHTML = '<div class="destination-page-empty">正在加载智能推荐...</div>';
        await loadSmartRecommend();
      }
      
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
      
      // 智能推荐模式（仅在国内或海外模式下有效）
      if (currentType === 'all' && currentDomestic !== 'nearby') {
        listContainer.innerHTML = '<div class="destination-page-empty">正在计算智能推荐...</div>';
        await loadSmartRecommend();
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
