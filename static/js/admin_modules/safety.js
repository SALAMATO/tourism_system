/**
 * 安全隐患管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能（3个富文本编辑器）
 */
AdminApp.Modules.Safety = {
    currentEditingId: null,
    currentEditingData: null,
    
    async init() {
        console.log('⚠️ 初始化安全隐患模块');
        this.initForm();
        await this.loadSafetyList();
        
        // ✅ 自动初始化编辑器（不再需要点击按钮）
        setTimeout(() => {
            this.initEditors();
        }, 300);
    },
    
    initForm() {
        const form = document.getElementById('safety-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });
        
        const deleteBtn = document.getElementById('safety-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentSafety());
        }
    },
    
    async submitForm() {
        try {
            // 使用当前时间作为报告日期
            const reportDate = new Date().toISOString();
            
            const data = {
                title: document.getElementById('safety-title').value,
                risk_level: document.getElementById('safety-risk').value,
                category: document.getElementById('safety-category').value,
                description: (window.WangEditorHelper && window.WangEditorHelper.editorInstances['safety-description']) 
                    ? window.WangEditorHelper.getContent('safety-description') 
                    : document.getElementById('safety-description').value,
                prevention: (window.WangEditorHelper && window.WangEditorHelper.editorInstances['safety-prevention']) 
                    ? window.WangEditorHelper.getContent('safety-prevention') 
                    : document.getElementById('safety-prevention').value,
                emergency_plan: (window.WangEditorHelper && window.WangEditorHelper.editorInstances['safety-plan']) 
                    ? window.WangEditorHelper.getContent('safety-plan') 
                    : document.getElementById('safety-plan').value,
                status: document.getElementById('safety-status').value,
                report_date: reportDate
            };
            
            console.log('提交安全隐患数据:', data);
            
            if (this.currentEditingId) {
                // 保留原有报告时间
                if (this.currentEditingData) {
                    data.report_date = this.currentEditingData.report_date;
                }
                await api.updateSafetyAlert(this.currentEditingId, data);
                showNotification('安全隐患修改成功', 'success');
            } else {
                await api.createSafetyAlert(data);
                showNotification('安全隐患添加成功', 'success');
            }
            
            this.resetForm();
            AdminApp.clearModuleCache('safety');
            await this.loadSafetyList();
        } catch (error) {
            console.error('添加安全隐患失败:', error);
            showNotification('添加失败：' + error.message, 'error');
        }
    },
    
    resetForm() {
        const form = document.getElementById('safety-form');
        if (form) form.reset();
        
        this.currentEditingId = null;
        this.currentEditingData = null;
        
        const titleEl = document.querySelector('#safety-module .card-title');
        if (titleEl) titleEl.textContent = '添加安全隐患';
        
        const submitBtn = document.querySelector('#safety-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '提交';
        
        const deleteBtn = document.getElementById('safety-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
    },
    
    async editSafety(id) {
        try {
            const alert = await api.getSafetyAlert(id);
            this.currentEditingId = id;
            this.currentEditingData = alert;
            
            document.getElementById('safety-title').value = alert.title || '';
            document.getElementById('safety-risk').value = alert.risk_level || '中';
            document.getElementById('safety-category').value = alert.category || '';
            
            // 设置内容到textarea（如果编辑器未初始化）
            document.getElementById('safety-description').value = alert.description || '';
            document.getElementById('safety-prevention').value = alert.prevention || '';
            document.getElementById('safety-plan').value = alert.emergency_plan || '';
            
            document.getElementById('safety-status').value = alert.status || '待处理';
            
            const titleEl = document.querySelector('#safety-module .card-title');
            if (titleEl) titleEl.textContent = '编辑安全隐患';
            
            const submitBtn = document.querySelector('#safety-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '保存修改';
            
            const deleteBtn = document.getElementById('safety-delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            
            // 滚动到安全隐患管理区域
            document.getElementById('safety-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // 缓存所有表单数据
            AdminApp.saveToCache('safety-title', alert.title || '');
            AdminApp.saveToCache('safety-risk', alert.risk_level || '中');
            AdminApp.saveToCache('safety-category', alert.category || '');
            AdminApp.saveToCache('safety-description', alert.description || '');
            AdminApp.saveToCache('safety-prevention', alert.prevention || '');
            AdminApp.saveToCache('safety-plan', alert.emergency_plan || '');
            AdminApp.saveToCache('safety-status', alert.status || '待处理');
            console.log('✨ 已缓存安全隐患编辑数据');
            
            // 自动初始化富文本编辑器（三个字段）
            setTimeout(async () => {
                try {
                    const editors = [
                        { id: 'safety-description', placeholder: '请输入安全隐患的详细描述...', content: alert.description },
                        { id: 'safety-prevention', placeholder: '请输入预防措施...', content: alert.prevention },
                        { id: 'safety-plan', placeholder: '请输入应急预案...', content: alert.emergency_plan }
                    ];
                    
                    for (const editor of editors) {
                        if (!window.WangEditorHelper || 
                            !window.WangEditorHelper.editorInstances[editor.id] ||
                            window.WangEditorHelper.editorInstances[editor.id]._destroyed) {
                            console.log(`正在自动初始化安全隐患编辑器: ${editor.id}`);
                            await AdminApp.lazyInitEditor(editor.id, editor.placeholder);
                            
                            // 填充内容
                            if (editor.content) {
                                window.WangEditorHelper.setContent(editor.id, editor.content);
                            }
                        } else {
                            // 编辑器已存在，直接设置内容
                            window.WangEditorHelper.setContent(editor.id, editor.content || '');
                        }
                    }
                } catch (error) {
                    console.error('自动初始化安全隐患编辑器失败:', error);
                }
            }, 300);
        } catch (error) {
            console.error('加载安全隐患详情用于编辑失败:', error);
            showNotification('加载安全隐患详情失败', 'error');
        }
    },
    
    async deleteCurrentSafety() {
        if (!this.currentEditingId) {
            showNotification('请先选择要编辑的安全隐患', 'error');
            return;
        }
        
        const confirmed = await showConfirm({
            title: '删除安全隐患',
            message: '确定要删除当前这条安全隐患记录吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteSafetyAlert(this.currentEditingId);
            showNotification('删除成功', 'success');
            this.resetForm();
            AdminApp.clearModuleCache('safety');
            await this.loadSafetyList();
        } catch (error) {
            console.error('删除当前安全隐患失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async deleteSafetyById(id) {
        const confirmed = await showConfirm({
            title: '删除安全隐患',
            message: '确定要删除该安全隐患记录吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteSafetyAlert(id);
            showNotification('删除成功', 'success');
            await this.loadSafetyList();
        } catch (error) {
            console.error('删除安全隐患失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async loadSafetyList() {
        const container = document.getElementById('safety-list-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getSafetyAlerts({ limit: 50, sort: '-created_at' });
            
            if (response.data && response.data.length > 0) {
                this.renderSafetyList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无安全隐患</div></div>';
            }
        } catch (error) {
            console.error('加载安全隐患列表失败:', error);
            AdminApp.showError(container);
        }
    },
    
    renderSafetyList(container, alerts) {
        const html = alerts.map(alert => `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(alert.title)}</div>
                    <div class="list-item-meta">
                        <span><i class="fas fa-exclamation-triangle"></i> 风险等级: ${escapeHtml(alert.risk_level)}</span>
                        <span><i class="fas fa-tag"></i> ${escapeHtml(alert.category || '未分类')}</span>
                        <span><i class="fas fa-info-circle"></i> 状态: ${escapeHtml(alert.status)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="AdminApp.Modules.Safety.editSafety('${alert.id}')">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-secondary" onclick="AdminApp.Modules.Safety.deleteSafetyById('${alert.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // ==================== 编辑器初始化 ====================
    
    // 初始化编辑器（3个字段）
    async initEditors() {
        try {
            if (!window.WangEditorHelper) {
                console.warn('WangEditorHelper未加载');
                return;
            }
            
            const editors = [
                { id: 'safety-description', placeholder: '请输入安全隐患的详细描述...' },
                { id: 'safety-prevention', placeholder: '请输入预防措施...' },
                { id: 'safety-plan', placeholder: '请输入应急预案...' }
            ];
            
            for (const editor of editors) {
                // 检查是否已经初始化
                if (window.WangEditorHelper.editorInstances[editor.id] &&
                    !window.WangEditorHelper.editorInstances[editor.id]._destroyed) {
                    console.log(`安全隐患编辑器 ${editor.id} 已存在，跳过初始化`);
                    continue;
                }
                
                console.log(`正在初始化安全隐患编辑器: ${editor.id}`);
                await AdminApp.lazyInitEditor(editor.id, editor.placeholder);
            }
            
            console.log('✅ 安全隐患编辑器初始化成功');
        } catch (error) {
            console.error('❌ 安全隐患编辑器初始化失败:', error);
        }
    }
};
