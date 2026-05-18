/**
 * 统计数据管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能
 */
AdminApp.Modules.Statistics = {
    currentEditingId: null,
    
    async init() {
        console.log('📊 初始化统计数据模块');
        this.initForm();
        await this.loadStatisticsList();
    },
    
    initForm() {
        const form = document.getElementById('statistics-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });
        
        const deleteBtn = document.getElementById('statistics-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteStatistic());
        }
    },
    
    async submitForm() {
        try {
            const data = {
                region: document.getElementById('stat-region').value,
                year: parseInt(document.getElementById('stat-year').value),
                tourist_count: parseFloat(document.getElementById('stat-tourists').value),
                revenue: parseFloat(document.getElementById('stat-revenue').value),
                flight_count: parseInt(document.getElementById('stat-flights').value),
                aircraft_count: parseInt(document.getElementById('stat-aircraft').value),
                growth_rate: parseFloat(document.getElementById('stat-growth').value)
            };
            
            console.log('提交统计数据:', data);
            
            if (this.currentEditingId) {
                await api.updateStatistic(this.currentEditingId, data);
                showNotification('统计数据修改成功', 'success');
            } else {
                await api.createStatistic(data);
                showNotification('统计数据添加成功', 'success');
            }
            
            this.resetForm();
            AdminApp.clearModuleCache('stat');
            await this.loadStatisticsList();
        } catch (error) {
            console.error('添加统计数据失败:', error);
            showNotification('添加失败：' + error.message, 'error');
        }
    },
    
    resetForm() {
        const form = document.getElementById('statistics-form');
        if (form) form.reset();
        
        this.currentEditingId = null;
        
        const titleEl = document.querySelector('#statistics-module .card-title');
        if (titleEl) titleEl.textContent = '添加统计数据';
        
        const submitBtn = document.querySelector('#statistics-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '提交';
        
        const deleteBtn = document.getElementById('statistics-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
    },
    
    async editStatistic(id) {
        try {
            const stat = await api.getStatistic(id);
            this.currentEditingId = id;
            
            document.getElementById('stat-region').value = stat.region || '';
            document.getElementById('stat-year').value = stat.year || '';
            document.getElementById('stat-tourists').value = stat.tourist_count || '';
            document.getElementById('stat-revenue').value = stat.revenue || '';
            document.getElementById('stat-flights').value = stat.flight_count || '';
            document.getElementById('stat-aircraft').value = stat.aircraft_count || '';
            document.getElementById('stat-growth').value = stat.growth_rate || '';
            
            const titleEl = document.querySelector('#statistics-module .card-title');
            if (titleEl) titleEl.textContent = '编辑统计数据';
            
            const submitBtn = document.querySelector('#statistics-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '保存修改';
            
            const deleteBtn = document.getElementById('statistics-delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            
            // 滚动到统计数据管理区域
            document.getElementById('statistics-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // 缓存所有表单数据
            AdminApp.saveToCache('stat-region', stat.region || '');
            AdminApp.saveToCache('stat-year', stat.year || '');
            AdminApp.saveToCache('stat-tourists', stat.tourist_count || '');
            AdminApp.saveToCache('stat-revenue', stat.revenue || '');
            AdminApp.saveToCache('stat-flights', stat.flight_count || '');
            AdminApp.saveToCache('stat-aircraft', stat.aircraft_count || '');
            AdminApp.saveToCache('stat-growth', stat.growth_rate || '');
            console.log('✨ 已缓存统计数据编辑数据');
        } catch (error) {
            console.error('加载统计数据详情用于编辑失败:', error);
            showNotification('加载统计数据详情失败', 'error');
        }
    },
    
    async deleteStatistic() {
        if (!this.currentEditingId) {
            showNotification('请先选择要编辑的统计记录', 'error');
            return;
        }
        
        const confirmed = await showConfirm({
            title: '删除统计记录',
            message: '确定要删除当前这条统计记录吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteStatistic(this.currentEditingId);
            showNotification('删除成功', 'success');
            this.resetForm();
            AdminApp.clearModuleCache('stat');
            await this.loadStatisticsList();
        } catch (error) {
            console.error('删除当前统计记录失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async deleteStatisticById(id) {
        const confirmed = await showConfirm({
            title: '删除统计记录',
            message: '确定要删除该统计记录吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteStatistic(id);
            showNotification('删除成功', 'success');
            await this.loadStatisticsList();
        } catch (error) {
            console.error('删除统计记录失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async loadStatisticsList() {
        const container = document.getElementById('statistics-list-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getStatistics({ limit: 50, sort: '-year' });
            
            if (response.data && response.data.length > 0) {
                this.renderStatisticsList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无统计数据</div></div>';
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            AdminApp.showError(container);
        }
    },
    
    renderStatisticsList(container, stats) {
        const html = stats.map(stat => `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">
                        ${escapeHtml(stat.region)} - ${stat.year}
                    </div>
                    <div class="list-item-meta">
                        <span><i class="fas fa-users"></i> 游客 ${stat.tourist_count} 万人次</span>
                        <span><i class="fas fa-yen-sign"></i> 营收 ${stat.revenue} 万元</span>
                        <span><i class="fas fa-percentage"></i> 增长率 ${stat.growth_rate}%</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="AdminApp.Modules.Statistics.editStatistic('${stat.id}')">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-secondary" onclick="AdminApp.Modules.Statistics.deleteStatisticById('${stat.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
};
