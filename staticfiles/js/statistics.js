// 发展现状数据可视化页面

let chartsInstances = {};
let statisticsData = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadStatisticsData();
});

// 加载统计数据
async function loadStatisticsData() {
  try {
    const response = await api.getStatistics({ limit: 100 });
    
    if (response.data && response.data.length > 0) {
      statisticsData = response.data;
      updateSummaryCards();
      initializeCharts();
    } else {
      // 如果没有数据，显示提示信息而不是错误
      document.querySelector('.container').innerHTML = '<div class="loading"><div>暂无统计数据，请前往管理后台添加数据</div></div>';
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
    showError(document.querySelector('.container'));
  }
}

// 更新概览卡片
function updateSummaryCards() {
  let totalTourists = 0;
  let totalRevenue = 0;
  let totalFlights = 0;
  let avgGrowth = 0;

  statisticsData.forEach(item => {
    totalTourists += item.tourist_count || 0;
    totalRevenue += item.revenue || 0;
    totalFlights += item.flight_count || 0;
    avgGrowth += item.growth_rate || 0;
  });

  avgGrowth = statisticsData.length > 0 ? (avgGrowth / statisticsData.length).toFixed(1) : 0;
  totalRevenue = (totalRevenue / 10000).toFixed(2); // 转换为亿元

  document.getElementById('total-tourists').textContent = totalTourists.toLocaleString();
  document.getElementById('total-revenue').textContent = totalRevenue;
  document.getElementById('total-flights').textContent = totalFlights.toLocaleString();
  document.getElementById('avg-growth').textContent = avgGrowth;
}

// 初始化所有图表
function initializeCharts() {
  initTouristsChart();
  initRevenueChart();
  initFlightsChart();
  initGrowthChart();
  initRadarChart();
  
  // 窗口调整时重新渲染图表
  window.addEventListener('resize', () => {
    Object.values(chartsInstances).forEach(chart => {
      chart.resize();
    });
  });
}

// 游客数量柱状图
function initTouristsChart() {
  const chartDom = document.getElementById('chart-tourists');
  const chart = echarts.init(chartDom);
  chartsInstances['tourists'] = chart;

  // 按地区分组
  const regionData = {};
  statisticsData.forEach(item => {
    if (!regionData[item.region]) {
      regionData[item.region] = 0;
    }
    regionData[item.region] += item.tourist_count || 0;
  });

  const regions = Object.keys(regionData);
  const values = Object.values(regionData);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: regions,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '游客数量（万人次）'
    },
    series: [{
      name: '游客数量',
      type: 'bar',
      data: values,
      itemStyle: {
        color: '#667eea'
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}'
      }
    }]
  };

  chart.setOption(option);
}

// 营收趋势折线图
function initRevenueChart() {
  const chartDom = document.getElementById('chart-revenue');
  const chart = echarts.init(chartDom);
  chartsInstances['revenue'] = chart;

  // 按年份分组
  const yearData = {};
  statisticsData.forEach(item => {
    if (!yearData[item.year]) {
      yearData[item.year] = 0;
    }
    yearData[item.year] += item.revenue || 0;
  });

  const years = Object.keys(yearData).sort();
  const revenues = years.map(year => (yearData[year] / 10000).toFixed(2));

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: years,
      name: '年份'
    },
    yAxis: {
      type: 'value',
      name: '营收（亿元）'
    },
    series: [{
      name: '营收',
      type: 'line',
      data: revenues,
      smooth: true,
      itemStyle: {
        color: '#764ba2'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(118, 75, 162, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(118, 75, 162, 0.05)'
          }]
        }
      },
      label: {
        show: true,
        formatter: '{c}亿'
      }
    }]
  };

  chart.setOption(option);
}

// 航班运营情况饼图
function initFlightsChart() {
  const chartDom = document.getElementById('chart-flights');
  const chart = echarts.init(chartDom);
  chartsInstances['flights'] = chart;

  // 按地区统计航班数
  const regionFlights = {};
  statisticsData.forEach(item => {
    if (!regionFlights[item.region]) {
      regionFlights[item.region] = 0;
    }
    regionFlights[item.region] += item.flight_count || 0;
  });

  const data = Object.keys(regionFlights).map(region => ({
    name: region,
    value: regionFlights[region]
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      name: '航班数量',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}\n({d}%)'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      data: data
    }]
  };

  chart.setOption(option);
}

// 增长率对比图
function initGrowthChart() {
  const chartDom = document.getElementById('chart-growth');
  const chart = echarts.init(chartDom);
  chartsInstances['growth'] = chart;

  // 按地区统计平均增长率
  const regionGrowth = {};
  const regionCount = {};
  
  statisticsData.forEach(item => {
    if (!regionGrowth[item.region]) {
      regionGrowth[item.region] = 0;
      regionCount[item.region] = 0;
    }
    regionGrowth[item.region] += item.growth_rate || 0;
    regionCount[item.region]++;
  });

  const regions = Object.keys(regionGrowth);
  const avgGrowth = regions.map(region => 
    (regionGrowth[region] / regionCount[region]).toFixed(1)
  );

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '增长率（%）'
    },
    yAxis: {
      type: 'category',
      data: regions
    },
    series: [{
      name: '增长率',
      type: 'bar',
      data: avgGrowth,
      itemStyle: {
        color: (params) => {
          const value = parseFloat(params.value);
          if (value >= 20) return '#34c759';
          if (value >= 10) return '#ff9500';
          return '#ff3b30';
        }
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%'
      }
    }]
  };

  chart.setOption(option);
}

// 雷达图综合对比
function initRadarChart() {
  const chartDom = document.getElementById('chart-radar');
  const chart = echarts.init(chartDom);
  chartsInstances['radar'] = chart;

  // 获取前5个地区的数据
  const regionStats = {};
  
  statisticsData.forEach(item => {
    if (!regionStats[item.region]) {
      regionStats[item.region] = {
        tourists: 0,
        revenue: 0,
        flights: 0,
        aircraft: 0,
        growth: 0,
        count: 0
      };
    }
    const stats = regionStats[item.region];
    stats.tourists += item.tourist_count || 0;
    stats.revenue += item.revenue || 0;
    stats.flights += item.flight_count || 0;
    stats.aircraft += item.aircraft_count || 0;
    stats.growth += item.growth_rate || 0;
    stats.count++;
  });

  // 转换为数组并排序
  const regions = Object.keys(regionStats)
    .sort((a, b) => regionStats[b].tourists - regionStats[a].tourists)
    .slice(0, 5);

  // 找出最大值用于标准化
  let maxTourists = 0, maxRevenue = 0, maxFlights = 0, maxAircraft = 0, maxGrowth = 0;
  regions.forEach(region => {
    const stats = regionStats[region];
    maxTourists = Math.max(maxTourists, stats.tourists);
    maxRevenue = Math.max(maxRevenue, stats.revenue);
    maxFlights = Math.max(maxFlights, stats.flights);
    maxAircraft = Math.max(maxAircraft, stats.aircraft);
    maxGrowth = Math.max(maxGrowth, stats.growth / stats.count);
  });

  const seriesData = regions.map(region => {
    const stats = regionStats[region];
    return {
      name: region,
      value: [
        ((stats.tourists / maxTourists) * 100).toFixed(0),
        ((stats.revenue / maxRevenue) * 100).toFixed(0),
        ((stats.flights / maxFlights) * 100).toFixed(0),
        ((stats.aircraft / maxAircraft) * 100).toFixed(0),
        (((stats.growth / stats.count) / maxGrowth) * 100).toFixed(0)
      ]
    };
  });

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      data: regions,
      bottom: 10
    },
    radar: {
      indicator: [
        { name: '游客数量', max: 100 },
        { name: '营收规模', max: 100 },
        { name: '航班数量', max: 100 },
        { name: '航空器数', max: 100 },
        { name: '增长速度', max: 100 }
      ],
      radius: '60%'
    },
    series: [{
      name: '地区发展对比',
      type: 'radar',
      data: seriesData
    }]
  };

  chart.setOption(option);
}
