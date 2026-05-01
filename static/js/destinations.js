document.addEventListener('DOMContentLoaded', async () => {
  const listContainer = document.getElementById('destination-page-list');
  const cityFilter = document.getElementById('destination-city-filter');
  const levelButtons = Array.from(document.querySelectorAll('[data-domestic]'));
  const typeButtons = Array.from(document.querySelectorAll('[data-type]'));

  let currentDomestic = 'all'; // 默认显示全部
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
        console.log('所有城市的值（按API返回顺序）:', filteredCache.map(item => item.city));
        console.log('所有城市的分数（按API返回顺序）:', filteredCache.map(item => item.match_score));
      }
    } else if (currentDomestic === 'all') {
      // 显示全部模式：使用所有缓存数据
      filteredCache = [...cache];
      console.log(`显示全部模式：当前有 ${filteredCache.length} 个目的地`);
    } else {
      filteredCache = cache.filter(item => item.is_domestic === (currentDomestic === 'true'));
    }
    
    // 显示全部、国内显示省份，海外显示国家，周边显示城市
    let locationField;
    if (currentDomestic === 'nearby') {
      locationField = 'city';
    } else if (currentDomestic === 'all') {
      // 显示全部模式：优先显示省份，如果没有则显示城市
      locationField = 'state';
    } else if (currentDomestic === 'true') {
      locationField = 'state';
    } else {
      locationField = 'country';
    }
    
    const locations = [...new Set(filteredCache.map(item => item[locationField]).filter(Boolean))];
    console.log(`更新城市列表：${locationField}字段，共 ${locations.length} 个唯一值`, locations);
    
    // 周边模式：按距离排序城市
    if (currentDomestic === 'nearby' && locations.length > 0) {
      console.log('=== 开始处理周边模式城市排序 ===');
      console.log('排序前的locations:', locations);
      console.log('filteredCache长度:', filteredCache.length);
      
      // API返回的nearbyDestinations已经按距离排序（近的在前）
      // 我们根据每个城市第一次出现的顺序来确定距离远近
      const cityOrder = {};
      const cityDistances = {}; // 记录每个城市的最近距离（公里）
      
      filteredCache.forEach((item, index) => {
        const city = item.city;
        console.log(`  目的地${index + 1}: ${city}, match_score=${item.match_score}`);
        // 只记录第一次出现的位置（最近的）
        if (!(city in cityOrder)) {
          cityOrder[city] = index;
          // match_score 现在是真实距离（公里），四舍五入后的整数
          cityDistances[city] = item.match_score || 'N/A';
          console.log(`    -> 首次出现，记录索引: ${index}, 距离: ${item.match_score}公里`);
        }
      });
      
      console.log('城市顺序映射:', cityOrder);
      console.log('城市距离信息（公里）:', cityDistances);
      
      // 按距离从小到大排序（距离小的在前）
      locations.sort((a, b) => {
        const distA = cityDistances[a] || 99999;
        const distB = cityDistances[b] || 99999;
        return distA - distB;  // 升序：距离小的排前面
      });
      console.log('排序后的locations:', locations);
      console.log('说明：距离越小越靠前');
      
      // 调试：打印每个城市的详细信息
      locations.forEach((city, idx) => {
        console.log(`  ${idx + 1}. ${city} - 索引: ${cityOrder[city]}, 距离: ${cityDistances[city]}公里`);
      });
      
      // 打印前几个目的地的详细信息
      console.log('前5个目的地详情:');
      filteredCache.slice(0, 5).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.city} - 距离: ${item.match_score || 'N/A'}公里, 评分: ${item.rating}, 浏览: ${item.views}`);
      });
      console.log('=== 城市排序处理完成 ===\n');
    }
    
    renderCities(locations);
  }

  function renderCities(locations) {
    if (!locations.length) {
      cityFilter.innerHTML = '<span class="city-chip active">暂无地区</span>';
      currentCity = '';
      return;
    }

    // 在地区列表前添加"全部地区"选项
    const allRegionsButton = `<button class="city-chip active" data-city="">全部地区</button>`;
    const regionButtons = locations.map((location) => `
      <button class="city-chip" data-city="${escapeHtml(location)}">${escapeHtml(location)}</button>
    `).join('');
    
    cityFilter.innerHTML = allRegionsButton + regionButtons;

    currentCity = ''; // 默认不筛选任何地区

    cityFilter.querySelectorAll('[data-city]').forEach(button => {
      button.addEventListener('click', () => {
        cityFilter.querySelectorAll('[data-city]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        currentCity = button.dataset.city; // 空字符串表示显示全部地区
        renderList();
      });
    });
  }

  function renderList() {
    let filtered = [];

    // 一级过滤：根据范围筛选数据源
    if (currentDomestic === 'all') {
      // 显示全部模式：使用所有目的地
      filtered = [...cache];
      
      // 二级过滤：省份/国家（如果选择了）
      if (currentCity) {
        filtered = filtered.filter(item => 
          item.state === currentCity || item.country === currentCity
        );
      }
    }
    else if (currentDomestic === 'nearby') {
      // 周边模式：使用IP定位数据
      filtered = [...nearbyDestinations];
      
      // 二级过滤：城市
      if (currentCity) {
        filtered = filtered.filter(item => item.city === currentCity);
      }
    }
    else if (currentType === 'all') {
      // 国内/海外模式 + 三级“显示全部”：使用智能推荐
      filtered = [...smartRecommendCache];
      
      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：省份/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'state' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }
    }
    else {
      // 国内/海外模式：使用缓存数据
      filtered = [...cache];

      // 一级过滤：国内/海外
      filtered = filtered.filter(item => item.is_domestic === (currentDomestic === 'true'));

      // 二级过滤：省份/国家
      if (currentCity) {
        const locationField = currentDomestic === 'true' ? 'state' : 'country';
        filtered = filtered.filter(item => item[locationField] === currentCity);
      }
    }

    // 三级过滤：推荐类型
    if (currentType === 'latest') {
      // 最新发布模式：按发布日期降序排序
      console.log('=== 最新发布模式调试信息 ===');
      console.log('当前一级模式:', currentDomestic);
      console.log('排序前数据量:', filtered.length);
      if (filtered.length > 0) {
        console.log('第一条数据的 publish_date:', filtered[0]?.publish_date);
        console.log('第一条数据的 created_at:', filtered[0]?.created_at);
      }
      
      filtered.sort((a, b) => {
        // 优先使用 publish_date，如果为空则使用 created_at
        const dateA = new Date(a.publish_date || a.created_at || 0);
        const dateB = new Date(b.publish_date || b.created_at || 0);
        
        // 调试：打印前3条数据的排序信息
        if (filtered.indexOf(a) < 3 || filtered.indexOf(b) < 3) {
          console.log(`比较: ${a.name} (${a.publish_date || a.created_at}) vs ${b.name} (${b.publish_date || b.created_at})`);
          console.log(`  结果: ${dateB - dateA > 0 ? 'b在前' : 'a在前'}`);
        }
        
        return dateB - dateA; // 降序：最新的在前
      });
      
      console.log('排序后前3条数据:');
      filtered.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} - publish_date: ${item.publish_date}, created_at: ${item.created_at}`);
      });
      console.log('=== 排序完成 ===');
    }
    else if (currentType !== 'all') {
      // 其他推荐类型：过滤 recommendation_type
      filtered = filtered.filter(item => {
        const types = item.recommendation_type || [];
        return Array.isArray(types) && types.includes(currentType);
      });
    }

    if (!filtered.length) {
      let msg = '';
      if (currentDomestic === 'all') {
        msg = '全部';
      } else if (currentDomestic === 'nearby') {
        msg = '周边';
      } else {
        msg = currentDomestic === 'true' ? '国内' : '海外';
      }
      listContainer.innerHTML = `<div class="destination-page-empty">当前筛选条件下暂无${msg}目的地，请切换其他筛选条件。</div>`;
      return;
    }

    // 确定显示的位置字段和标签
    let locationField, locationLabel;
    if (currentDomestic === 'all') {
      // 显示全部模式：根据 is_domestic 判断显示省份还是国家
      locationLabel = item => {
        if (item.is_domestic) {
          return `${escapeHtml(item.state || item.city)} · ${escapeHtml(item.location || '')}`;
        } else {
          return `${escapeHtml(item.country)} · ${escapeHtml(item.location || '')}`;
        }
      };
    } else if (currentDomestic === 'nearby') {
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
      
      // 如果是显示全部模式，不需要加载特殊数据
      if (currentDomestic === 'all') {
        // 显示全部模式直接使用缓存数据
        listContainer.innerHTML = '<div class="destination-page-empty">正在加载全部目的地...</div>';
      }
      // 如果是周边模式，加载IP定位数据
      else if (currentDomestic === 'nearby') {
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
        
      // 显示全部模式：清除二级地区筛选，使用智能推荐
      if (currentType === 'all') {
        currentCity = ''; // 清空城市筛选，显示所有地区
        // 移除二级按钮的所有激活状态，并激活“全部地区”按钮
        cityFilter.querySelectorAll('[data-city]').forEach(item => item.classList.remove('active'));
        const allRegionsBtn = cityFilter.querySelector('[data-city=""]');
        if (allRegionsBtn) {
          allRegionsBtn.classList.add('active');
        }
          
        // 加载智能推荐数据（仅在国内/海外模式下）
        if (currentDomestic !== 'nearby' && currentDomestic !== 'all') {
          listContainer.innerHTML = '<div class="destination-page-empty">正在计算智能推荐...</div>';
          await loadSmartRecommend();
        }
      }
      // 最新发布模式：重新加载数据以确保最新
      else if (currentType === 'latest') {
        // 最新发布直接使用 cache，无需额外加载
      }
        
      updateCities();
      renderList();
    });
  });

  try {
    // 加载所有目的地到缓存
    const response = await api.getDestinations({ limit: 500, sort: 'sort_order' });
    cache = response.data || [];
    
    console.log('=== 数据加载调试信息 ===');
    console.log('总共加载', cache.length, '个目的地');
    if (cache.length > 0) {
      console.log('第一条数据:', cache[0]);
      console.log('第一条数据的 publish_date:', cache[0].publish_date);
      console.log('第一条数据的 created_at:', cache[0].created_at);
    }
    console.log('=== 数据加载完成 ===');
    
    // 加载智能推荐
    await loadSmartRecommend();
    
    updateCities();
    renderList();
  } catch (error) {
    console.error('加载旅游目的地列表失败:', error);
    listContainer.innerHTML = '<div class="destination-page-empty">加载失败，请稍后重试。</div>';
  }
});
