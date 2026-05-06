/**
 * 新闻资讯管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能
 */
AdminApp.Modules.News = {
    currentEditingId: null,
    currentEditingData: null,
    lastAiResult: null,  // 存储AI生成的结果
    
    async init() {
        console.log('📰 初始化新闻资讯模块');
        this.initForm();
        this.initAiButtons();  // 初始化AI按钮
        this.initNewsFetcher();  // 初始化新闻识别功能
        await this.loadNewsList();
        
        // ✅ 自动初始化编辑器（不再需要点击按钮）
        setTimeout(() => {
            this.initEditors();
        }, 300);
    },
    
    initForm() {
        const form = document.getElementById('news-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });
        
        const deleteBtn = document.getElementById('news-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentNews());
        }
        
        // 封面图片上传框点击事件
        const uploadBox = document.getElementById('news-cover-upload-box');
        if (uploadBox) {
            uploadBox.addEventListener('click', () => {
                const input = document.getElementById('news-cover-image');
                if (input) input.click();
            });
        }
        
        // 封面图片预览
        const coverInput = document.getElementById('news-cover-image');
        if (coverInput) {
            coverInput.addEventListener('change', () => this.previewCoverImage());
        }
    },
    
    async submitForm() {
        try {
            const tags = document.getElementById('news-tags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            
            // 获取发布日期
            const dateValue = document.getElementById('news-date').value;
            const publishDate = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();
            
            // 使用 FormData 支持文件上传
            const formData = new FormData();
            formData.append('title', document.getElementById('news-title').value);
            formData.append('category', document.getElementById('news-category').value);
            formData.append('author', document.getElementById('news-author').value);
            formData.append('content', (window.WangEditorHelper && window.WangEditorHelper.editorInstances['news-content']) 
                ? window.WangEditorHelper.getContent('news-content') 
                : document.getElementById('news-content').value);
            
            // 正确处理tags数组 - 为每个标签添加一个单独的字段
            tags.forEach((tag, index) => {
                formData.append(`tags`, tag);
            });
            
            formData.append('publish_date', publishDate);
            
            // 处理封面图片
            const coverInput = document.getElementById('news-cover-image');
            const coverFile = coverInput.files && coverInput.files[0];
            if (coverFile) {
                formData.append('cover_image', coverFile);
            }
            
            console.log('提交新闻数据');
            
            if (this.currentEditingId) {
                // 保留原有的发布日期和浏览次数
                if (this.currentEditingData) {
                    formData.append('views', this.currentEditingData.views);
                }
                await api.updateNews(this.currentEditingId, formData);
                showNotification('新闻修改成功', 'success');
            } else {
                await api.createNews(formData);
                showNotification('新闻发布成功', 'success');
            }
            
            this.resetForm();
            AdminApp.clearModuleCache('news');
            await this.loadNewsList();
        } catch (error) {
            console.error('发布新闻失败:', error);
            showNotification('发布失败：' + error.message, 'error');
        }
    },
    
    resetForm() {
        const form = document.getElementById('news-form');
        if (form) form.reset();
        
        this.currentEditingId = null;
        this.currentEditingData = null;
        
        // 重置封面图片
        const preview = document.getElementById('news-cover-preview');
        const previewImage = document.getElementById('news-cover-preview-img');
        const fileNameEl = document.getElementById('news-cover-file-name');
        const uploadBox = document.getElementById('news-cover-upload-box');
        const coverInput = document.getElementById('news-cover-image');
        
        if (coverInput) coverInput.value = '';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        if (uploadBox) uploadBox.style.display = 'block';
        if (preview) preview.style.display = 'none';
        
        const titleEl = document.querySelector('#news-module .card-title');
        if (titleEl) titleEl.textContent = '发布新闻';
        
        const submitBtn = document.querySelector('#news-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '发布';
        
        const deleteBtn = document.getElementById('news-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
    },
    
    async editNews(id) {
        try {
            const news = await api.getNewsItem(id);
            this.currentEditingId = id;
            this.currentEditingData = news;
            
            // 安全地设置表单字段值
            const titleInput = document.getElementById('news-title');
            if (titleInput) titleInput.value = news.title || '';
            
            const categorySelect = document.getElementById('news-category');
            if (categorySelect) categorySelect.value = news.category || '';
            
            const authorInput = document.getElementById('news-author');
            if (authorInput) authorInput.value = news.author || '';
            
            // 设置内容到textarea（如果编辑器未初始化）
            const contentTextarea = document.getElementById('news-content');
            if (contentTextarea) {
                contentTextarea.value = news.content || '';
            }
            
            const tagsInput = document.getElementById('news-tags');
            if (tagsInput) {
                tagsInput.value = (news.tags || []).join(',');
            }
            
            // 封面图片
            const preview = document.getElementById('news-cover-preview');
            const previewImage = document.getElementById('news-cover-preview-img');
            const fileNameEl = document.getElementById('news-cover-file-name');
            const uploadBox = document.getElementById('news-cover-upload-box');
            const coverUrl = news.cover_image_url || news.cover_image || '';
            
            if (previewImage) previewImage.src = coverUrl;
            if (fileNameEl && coverUrl) {
                const fileName = coverUrl.split('/').pop();
                fileNameEl.textContent = fileName || '已上传图片';
            }
            
            // 如果有图片，隐藏上传框，显示预览；否则显示上传框
            if (coverUrl) {
                if (uploadBox) uploadBox.style.display = 'none';
                if (preview) preview.style.display = 'block';
            } else {
                if (uploadBox) uploadBox.style.display = 'block';
                if (preview) preview.style.display = 'none';
            }
            
            const titleEl = document.querySelector('#news-module .card-title');
            if (titleEl) titleEl.textContent = '编辑新闻';
            
            const submitBtn = document.querySelector('#news-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '保存修改';
            
            const deleteBtn = document.getElementById('news-delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            
            // 滚动到新闻资讯管理区域
            const moduleEl = document.getElementById('news-module');
            if (moduleEl) {
                moduleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // 缓存所有表单数据
            AdminApp.saveToCache('news-title', news.title || '');
            AdminApp.saveToCache('news-category', news.category || '');
            AdminApp.saveToCache('news-author', news.author || '');
            AdminApp.saveToCache('news-content', news.content || '');
            AdminApp.saveToCache('news-tags', (news.tags || []).join(','));
            
            // 缓存图片状态
            if (coverUrl) {
                AdminApp.saveToCache('news-cover-has-image', true);
                const fileName = coverUrl.split('/').pop();
                AdminApp.saveToCache('news-cover-file-name', fileName || '已上传图片');
            }
            
            console.log('✨ 已缓存新闻编辑数据');
            
            // 自动初始化富文本编辑器
            setTimeout(async () => {
                try {
                    if (!window.WangEditorHelper || 
                        !window.WangEditorHelper.editorInstances['news-content'] ||
                        window.WangEditorHelper.editorInstances['news-content']._destroyed) {
                        console.log('正在自动初始化新闻编辑器...');
                        await AdminApp.lazyInitEditor('news-content', '请输入新闻资讯内容...');
                        
                        // 填充内容
                        if (news.content) {
                            window.WangEditorHelper.setContent('news-content', news.content);
                        }
                    } else {
                        // 编辑器已存在，直接设置内容
                        window.WangEditorHelper.setContent('news-content', news.content || '');
                    }
                } catch (error) {
                    console.error('自动初始化新闻编辑器失败:', error);
                }
            }, 300);
        } catch (error) {
            console.error('加载新闻详情用于编辑失败:', error);
            showNotification('加载新闻详情失败', 'error');
        }
    },
    
    async deleteCurrentNews() {
        if (!this.currentEditingId) {
            showNotification('请先选择要编辑的新闻', 'error');
            return;
        }
        
        const confirmed = await showConfirm({
            title: '删除新闻',
            message: '确定要删除当前这条新闻吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteNews(this.currentEditingId);
            showNotification('删除成功', 'success');
            this.resetForm();
            AdminApp.clearModuleCache('news');
            await this.loadNewsList();
        } catch (error) {
            console.error('删除当前新闻失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async deleteNewsById(id) {
        const confirmed = await showConfirm({
            title: '删除新闻',
            message: '确定要删除该新闻吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteNews(id);
            showNotification('删除成功', 'success');
            await this.loadNewsList();
        } catch (error) {
            console.error('删除新闻失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    // ==================== 封面图片操作 ====================
    
    previewCoverImage() {
        const input = document.getElementById('news-cover-image');
        const uploadBox = document.getElementById('news-cover-upload-box');
        const preview = document.getElementById('news-cover-preview');
        const previewImage = document.getElementById('news-cover-preview-img');
        const fileNameEl = document.getElementById('news-cover-file-name');
        const file = input.files && input.files[0];
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = event => {
            previewImage.src = event.target.result;
            if (fileNameEl) {
                fileNameEl.textContent = file.name;
            }
            // 隐藏上传框，显示预览
            if (uploadBox) uploadBox.style.display = 'none';
            if (preview) preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },
    
    editCoverImage() {
        const input = document.getElementById('news-cover-image');
        if (input) input.click();
    },
    
    removeCoverImage() {
        const input = document.getElementById('news-cover-image');
        const uploadBox = document.getElementById('news-cover-upload-box');
        const preview = document.getElementById('news-cover-preview');
        const previewImage = document.getElementById('news-cover-preview-img');
        const fileNameEl = document.getElementById('news-cover-file-name');
        
        if (input) input.value = '';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        // 显示上传框，隐藏预览
        if (uploadBox) uploadBox.style.display = 'block';
        if (preview) preview.style.display = 'none';
    },
    
    async loadNewsList() {
        const container = document.getElementById('news-list-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getNews({ limit: 50, sort: '-created_at' });
            
            if (response.data && response.data.length > 0) {
                this.renderNewsList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无新闻</div></div>';
            }
        } catch (error) {
            console.error('加载新闻列表失败:', error);
            AdminApp.showError(container);
        }
    },
    
    renderNewsList(container, newsItems) {
        const html = newsItems.map(item => `
            <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(item.title)}</div>
                    <div class="list-item-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(item.author || '未知作者')}</span>
                        <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(item.publish_date)}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0} 阅读</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="AdminApp.Modules.News.editNews('${item.id}')">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-secondary" onclick="AdminApp.Modules.News.deleteNewsById('${item.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // ==================== AI 智能助手功能 ====================
    
    // 获取编辑器内容
    getContent() {
        if (window.WangEditorHelper && window.WangEditorHelper.editorInstances['news-content']) {
            return window.WangEditorHelper.getContent('news-content');
        }
        return document.getElementById('news-content').value;
    },
    
    // 初始化AI按钮事件
    initAiButtons() {
        // AI整理原文
        const formatBtn = document.getElementById('news-ai-format-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                this.formatContent();
            });
        }
        
        // AI生成摘要
        const summaryBtn = document.getElementById('news-ai-summary-btn');
        if (summaryBtn) {
            summaryBtn.addEventListener('click', () => {
                this.generateSummary();
            });
        }
        
        // 应用AI建议
        const applyBtn = document.getElementById('news-ai-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyAISuggestions();
            });
        }
    },
    
    // AI整理原文
    async formatContent() {
        const apiUrl = 'http://127.0.0.1:8000/api/news/format_content/';
        
        const rawContent = this.getContent();
        const plainContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!plainContent || plainContent.length < 50) {
            showNotification('请先填写内容再整理原文', 'error');
            return;
        }
        
        const btn = document.getElementById('news-ai-format-btn');
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
                    window.WangEditorHelper.setContent('news-content', data.formatted_content);
                } else {
                    document.getElementById('news-content').value = data.formatted_content;
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
        const apiUrl = 'http://127.0.0.1:8000/api/news/ai_summary/';
        
        const rawContent = this.getContent();
        const plainContent = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!plainContent || plainContent.length < 100) {
            showNotification('请先填写足够的内容再生成摘要', 'error');
            return;
        }
        
        const loadingEl = document.getElementById('news-ai-summary-loading');
        const resultEl = document.getElementById('news-ai-summary-result');
        const errorEl = document.getElementById('news-ai-summary-error');
        
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
            
            document.getElementById('news-ai-summary-text').textContent = data.summary || '';
            
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
            document.getElementById('news-category').value = this.lastAiResult.category;
        }
        
        if (this.lastAiResult.tags) {
            document.getElementById('news-tags').value = this.lastAiResult.tags.join(',');
        }
        
        showNotification('已应用AI建议', 'success');
    },
    
    // ==================== 编辑器初始化 ====================
    
    // 初始化编辑器
    async initEditors() {
        try {
            if (!window.WangEditorHelper) {
                console.warn('WangEditorHelper未加载');
                return;
            }
            
            // 检查是否已经初始化
            if (window.WangEditorHelper.editorInstances['news-content'] &&
                !window.WangEditorHelper.editorInstances['news-content']._destroyed) {
                console.log('新闻编辑器已存在，跳过初始化');
                return;
            }
            
            console.log('正在初始化新闻编辑器...');
            await AdminApp.lazyInitEditor('news-content', '请输入新闻资讯内容...');
            console.log('✅ 新闻编辑器初始化成功');
        } catch (error) {
            console.error('❌ 新闻编辑器初始化失败:', error);
        }
    },
    
    // ==================== 新闻识别功能 ====================
    
    // 初始化新闻识别功能
    initNewsFetcher() {
        const fetchBtn = document.getElementById('fetch-news-btn');
        if (!fetchBtn) return;
        
        fetchBtn.addEventListener('click', async () => {
            await this.fetchNewsFromUrl();
        });
    },
    
    // 从URL识别新闻
    async fetchNewsFromUrl() {
        const urlInput = document.getElementById('news-url-input');
        const statusDiv = document.getElementById('fetch-news-status');
        const fetchBtn = document.getElementById('fetch-news-btn');
        
        const url = urlInput.value.trim();
        if (!url) {
            statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入新闻URL</span>';
            return;
        }
        
        try {
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
            statusDiv.innerHTML = '<span style="color: var(--primary-color);">正在识别新闻，请稍候...</span>';
            
            const data = await api.fetchNewsFromUrl(url);
            
            // 填充表单
            if (data.title) document.getElementById('news-title').value = data.title;
            if (data.author) document.getElementById('news-author').value = data.author;
            if (data.publish_date) {
                // 处理日期格式
                const dateStr = data.publish_date.split('T')[0]; // 取日期部分
                document.getElementById('news-date').value = dateStr;
            }
            if (data.content) {
                if (window.WangEditorHelper) {
                    setTimeout(() => {
                        window.WangEditorHelper.setContent('news-content', data.content);
                    }, 100);
                } else {
                    document.getElementById('news-content').value = data.content;
                }
            }
            
            statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充表单</span>';
            showNotification('新闻识别成功', 'success');
        } catch (error) {
            console.error('识别失败:', error);
            statusDiv.innerHTML = `<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> 识别失败：${error.message}</span>`;
            showNotification('识别失败：' + error.message, 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别新闻';
        }
    }
};
