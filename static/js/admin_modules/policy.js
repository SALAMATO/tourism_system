/**
 * 政策法规管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能
 */
AdminApp.Modules.Policy = {
    currentEditingId: null,
    lastAiResult: null,
    
    async init() {
        console.log('📚 初始化政策法规模块');
        
        // 初始化表单
        this.initForm();
        
        // 初始化AI功能
        this.initAIFeatures();
        
        // 加载政策列表
        await this.loadPolicyList();
        
        // 初始化政策识别功能
        this.initPolicyFetcher();
        
        // ✅ 自动初始化编辑器（不再需要点击按钮）
        setTimeout(() => {
            this.initEditors();
        }, 300);
    },
    
    // 初始化表单
    initForm() {
        const form = document.getElementById('policy-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });
        
        // 删除按钮
        const deleteBtn = document.getElementById('policy-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deletePolicy();
            });
        }
    },
    
    // 提交表单
    async submitForm() {
        try {
            const tags = document.getElementById('policy-tags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            
            const dateValue = document.getElementById('policy-date').value;
            if (!dateValue) {
                showNotification('请选择发布日期', 'error');
                return;
            }
            
            const publishDate = new Date(dateValue).toISOString();
            
            const data = {
                title: document.getElementById('policy-title').value,
                level: document.getElementById('policy-level').value,
                category: document.getElementById('policy-category').value,
                department: document.getElementById('policy-department').value,
                publish_date: publishDate,
                content: this.getContent(),
                file_url: document.getElementById('policy-url').value || '',
                tags: tags
            };
            
            console.log('提交政策数据:', data);
            
            if (this.currentEditingId) {
                await api.updatePolicy(this.currentEditingId, data);
                showNotification('政策法规修改成功', 'success');
            } else {
                await api.createPolicy(data);
                showNotification('政策法规添加成功', 'success');
            }
            
            this.resetForm();
            AdminApp.clearModuleCache('policy');
            await this.loadPolicyList();
        } catch (error) {
            console.error('提交政策失败:', error);
            showNotification('添加失败：' + error.message, 'error');
        }
    },
    
    // 获取编辑器内容
    getContent() {
        if (window.WangEditorHelper && window.WangEditorHelper.editorInstances['policy-content']) {
            return window.WangEditorHelper.getContent('policy-content');
        }
        return document.getElementById('policy-content').value;
    },
    
    // 重置表单
    resetForm() {
        const form = document.getElementById('policy-form');
        if (form) form.reset();
        
        this.currentEditingId = null;
        
        const titleEl = document.querySelector('#policy-module .card-title');
        if (titleEl) titleEl.textContent = '添加政策法规';
        
        const submitBtn = document.querySelector('#policy-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '提交';
        
        const deleteBtn = document.getElementById('policy-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        // 重置编辑器
        if (window.WangEditorHelper && window.WangEditorHelper.editorInstances['policy-content']) {
            window.WangEditorHelper.setContent('policy-content', '');
        }
    },
    
    // 加载政策列表
    async loadPolicyList() {
        const container = document.getElementById('policy-list-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getPolicies({ limit: 50, sort: '-created_at' });
            
            if (response.data && response.data.length > 0) {
                this.renderPolicyList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无政策数据</div></div>';
            }
        } catch (error) {
            console.error('加载政策列表失败:', error);
            AdminApp.showError(container);
        }
    },
    
    // 渲染政策列表
    renderPolicyList(container, policies) {
        const html = policies.map(policy => `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(policy.title)}</div>
                    <div class="list-item-meta">
                        <span><i class="fas fa-building"></i> ${escapeHtml(policy.department || '未知部门')}</span>
                        <span><i class="fas fa-layer-group"></i> ${escapeHtml(policy.level || '未分类')}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(policy.publish_date)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="AdminApp.Modules.Policy.editPolicy('${policy.id}')">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-secondary" onclick="AdminApp.Modules.Policy.deletePolicyById('${policy.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // 编辑政策
    async editPolicy(id) {
        try {
            const policy = await api.getPolicy(id);
            this.currentEditingId = id;
            
            document.getElementById('policy-title').value = policy.title || '';
            document.getElementById('policy-level').value = policy.level || '';
            document.getElementById('policy-category').value = policy.category || '';
            document.getElementById('policy-department').value = policy.department || '';
            document.getElementById('policy-date').value = formatDate(policy.publish_date);
            document.getElementById('policy-content').value = policy.content || '';
            document.getElementById('policy-url').value = policy.file_url || '';
            document.getElementById('policy-tags').value = (policy.tags || []).join(',');
            
            const titleEl = document.querySelector('#policy-module .card-title');
            if (titleEl) titleEl.textContent = '编辑政策法规';
            
            const submitBtn = document.querySelector('#policy-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '保存修改';
            
            const deleteBtn = document.getElementById('policy-delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            
            // 滚动到表单顶部
            document.getElementById('policy-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // 缓存表单数据
            AdminApp.saveToCache('policy-title', policy.title || '');
            AdminApp.saveToCache('policy-level', policy.level || '');
            AdminApp.saveToCache('policy-category', policy.category || '');
            AdminApp.saveToCache('policy-department', policy.department || '');
            AdminApp.saveToCache('policy-date', formatDate(policy.publish_date));
            AdminApp.saveToCache('policy-content', policy.content || '');
            AdminApp.saveToCache('policy-url', policy.file_url || '');
            AdminApp.saveToCache('policy-tags', (policy.tags || []).join(','));
            console.log('✨ 已缓存政策编辑数据');
            
            // 自动初始化富文本编辑器
            setTimeout(async () => {
                try {
                    if (!window.WangEditorHelper || 
                        !window.WangEditorHelper.editorInstances['policy-content'] ||
                        window.WangEditorHelper.editorInstances['policy-content']._destroyed) {
                        console.log('正在自动初始化政策编辑器...');
                        await AdminApp.lazyInitEditor('policy-content', '请输入政策法规内容...');
                        
                        if (policy.content) {
                            window.WangEditorHelper.setContent('policy-content', policy.content);
                        }
                    } else {
                        window.WangEditorHelper.setContent('policy-content', policy.content || '');
                    }
                } catch (error) {
                    console.error('自动初始化政策编辑器失败:', error);
                }
            }, 300);
        } catch (error) {
            console.error('加载政策详情用于编辑失败:', error);
            showNotification('加载政策详情失败', 'error');
        }
    },
    
    // 删除当前政策（编辑状态下）
    async deletePolicy() {
        if (!this.currentEditingId) {
            showNotification('请先选择要编辑的政策', 'error');
            return;
        }
        
        const confirmed = await showConfirm({
            title: '删除政策',
            message: '确定要删除当前这条政策吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deletePolicy(this.currentEditingId);
            showNotification('删除成功', 'success');
            this.resetForm();
            AdminApp.clearModuleCache('policy');
            await this.loadPolicyList();
        } catch (error) {
            console.error('删除当前政策失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    // 删除指定ID的政策（列表中的删除按钮）
    async deletePolicyById(id) {
        const confirmed = await showConfirm({
            title: '删除政策',
            message: '确定要删除该政策吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deletePolicy(id);
            showNotification('删除成功', 'success');
            await this.loadPolicyList();
        } catch (error) {
            console.error('删除政策失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    // 初始化AI功能
    initAIFeatures() {
        // AI整理原文
        const formatBtn = document.getElementById('policy-ai-format-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                this.formatContent();
            });
        }
        
        // AI生成摘要
        const summaryBtn = document.getElementById('policy-ai-summary-btn');
        if (summaryBtn) {
            summaryBtn.addEventListener('click', () => {
                this.generateSummary();
            });
        }
        
        // 应用AI建议
        const applyBtn = document.getElementById('policy-ai-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyAISuggestions();
            });
        }
    },
    
    // AI整理原文
    async formatContent() {
        const apiUrl = 'http://127.0.0.1:8000/api/policies/format_content/';
        
        const rawContent = this.getContent();
        const plainContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!plainContent || plainContent.length < 50) {
            showNotification('请先填写内容再整理原文', 'error');
            return;
        }
        
        const btn = document.getElementById('policy-ai-format-btn');
        const originalHtml = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 整理中...';
        
        try {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ content: rawContent })
            });
            
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || '整理失败');
            }
            
            const data = await resp.json();
            
            // 填充整理后的内容
            if (data.formatted_content) {
                if (window.WangEditorHelper) {
                    window.WangEditorHelper.setContent('policy-content', data.formatted_content);
                } else {
                    document.getElementById('policy-content').value = data.formatted_content;
                }
            }
            
            showNotification('原文整理成功', 'success');
        } catch (error) {
            console.error('整理原文失败:', error);
            showNotification('整理失败：' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    },
    
    // AI生成摘要
    async generateSummary() {
        const apiUrl = 'http://127.0.0.1:8000/api/policies/ai_summary/';
        
        const rawContent = this.getContent();
        const plainContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!plainContent || plainContent.length < 100) {
            showNotification('请先填写足够的内容再生成摘要', 'error');
            return;
        }
        
        const loadingEl = document.getElementById('policy-ai-summary-loading');
        const resultEl = document.getElementById('policy-ai-summary-result');
        const errorEl = document.getElementById('policy-ai-summary-error');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (resultEl) resultEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        
        try {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ content: rawContent })
            });
            
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || '生成摘要失败');
            }
            
            const data = await resp.json();
            this.lastAiResult = data;
            
            // 显示结果
            if (loadingEl) loadingEl.style.display = 'none';
            if (resultEl) resultEl.style.display = 'block';
            
            document.getElementById('policy-ai-summary-text').textContent = data.summary || '';
            
            // 核心观点
            const keypointsEl = document.getElementById('policy-ai-keypoints');
            if (keypointsEl && data.keypoints) {
                keypointsEl.innerHTML = data.keypoints.map(point => `<li>${point}</li>`).join('');
            }
            
            // 推荐分类和标签
            if (data.category) {
                document.getElementById('policy-ai-category').textContent = data.category;
            }
            if (data.tags) {
                document.getElementById('policy-ai-tags').textContent = data.tags.join(', ');
            }
            
            showNotification('摘要生成成功', 'success');
        } catch (error) {
            console.error('生成摘要失败:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) {
                errorEl.textContent = 'AI处理失败: ' + error.message;
                errorEl.style.display = 'block';
            }
            showNotification('生成摘要失败：' + error.message, 'error');
        }
    },
    
    // 应用AI建议
    applyAISuggestions() {
        if (!this.lastAiResult) {
            showNotification('请先生成摘要', 'warning');
            return;
        }
        
        if (this.lastAiResult.category) {
            document.getElementById('policy-category').value = this.lastAiResult.category;
        }
        
        if (this.lastAiResult.tags) {
            document.getElementById('policy-tags').value = this.lastAiResult.tags.join(',');
        }
        
        showNotification('已应用AI建议', 'success');
    },
    
    // 初始化政策识别功能
    initPolicyFetcher() {
        const fetchBtn = document.getElementById('fetch-policy-btn');
        if (!fetchBtn) return;
        
        fetchBtn.addEventListener('click', async () => {
            await this.fetchPolicyFromUrl();
        });
    },
    
    // 从URL识别政策
    async fetchPolicyFromUrl() {
        const urlInput = document.getElementById('policy-url-input');
        const statusDiv = document.getElementById('fetch-policy-status');
        const fetchBtn = document.getElementById('fetch-policy-btn');
        
        const url = urlInput.value.trim();
        if (!url) {
            statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入政策URL</span>';
            return;
        }
        
        try {
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
            statusDiv.innerHTML = '<span style="color: var(--primary-color);">正在识别原文，请稍候...</span>';
            
            const data = await api.fetchPolicyFromUrl(url);
            
            // 填充表单
            if (data.title) document.getElementById('policy-title').value = data.title;
            if (data.department) document.getElementById('policy-department').value = data.department;
            if (data.publish_date) document.getElementById('policy-date').value = data.publish_date;
            if (data.content) {
                if (window.WangEditorHelper) {
                    setTimeout(() => {
                        window.WangEditorHelper.setContent('policy-content', data.content);
                    }, 100);
                } else {
                    document.getElementById('policy-content').value = data.content;
                }
            }
            
            statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充表单</span>';
            showNotification('原文识别成功', 'success');
        } catch (error) {
            console.error('识别失败:', error);
            statusDiv.innerHTML = `<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> 识别失败：${error.message}</span>`;
            showNotification('识别失败：' + error.message, 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别原文';
        }
    },
    
    // 初始化编辑器
    async initEditors() {
        try {
            if (!window.WangEditorHelper) {
                console.warn('WangEditorHelper未加载');
                return;
            }
            
            // 检查是否已经初始化
            if (window.WangEditorHelper.editorInstances['policy-content'] &&
                !window.WangEditorHelper.editorInstances['policy-content']._destroyed) {
                console.log('政策编辑器已存在，跳过初始化');
                return;
            }
            
            console.log('正在初始化政策编辑器...');
            await AdminApp.lazyInitEditor('policy-content', '请输入政策法规内容...');
            console.log('✅ 政策编辑器初始化成功');
        } catch (error) {
            console.error('❌ 政策编辑器初始化失败:', error);
        }
    }
};
