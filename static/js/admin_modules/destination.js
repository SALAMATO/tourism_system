/**
 * 旅游目的地管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能（图片上传、2个富文本编辑器）
 */
AdminApp.Modules.Destination = {
    currentEditingId: null,
    currentEditingData: null,
    
    async init() {
        console.log('🌍 初始化旅游目的地模块');
        this.initForm();
        await this.loadDestinationsList();
        
        // ✅ 自动初始化编辑器（不再需要点击按钮）
        setTimeout(() => {
            this.initEditors();
        }, 300);
    },
    
    initForm() {
        const form = document.getElementById('destination-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });
        
        const deleteBtn = document.getElementById('destination-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentDestination());
        }
        
        // 封面图片预览
        const coverInput = document.getElementById('destination-cover-image');
        if (coverInput) {
            coverInput.addEventListener('change', () => this.previewCoverImage());
        }
        
        // 展示图片预览
        [1, 2, 3, 4].forEach(index => {
            const galleryInput = document.getElementById(`destination-gallery-image-${index}`);
            if (galleryInput) {
                galleryInput.addEventListener('change', () => this.previewGalleryImage(index));
            }
        });
    },
    
    buildFormData() {
        const formData = new FormData();
        const coverInput = document.getElementById('destination-cover-image');
        const coverFile = coverInput.files && coverInput.files[0];
        const galleryInputs = [1, 2, 3, 4].map(index => document.getElementById(`destination-gallery-image-${index}`));
        
        formData.append('name', document.getElementById('destination-name').value.trim());
        formData.append('city', document.getElementById('destination-city').value.trim());
        formData.append('location', document.getElementById('destination-location').value.trim());
        formData.append('country', document.getElementById('destination-country').value.trim() || '中国');
        formData.append('state', document.getElementById('destination-state').value.trim());
        formData.append('category', document.getElementById('destination-category').value.trim());
        formData.append('price_range', document.getElementById('destination-price-range').value.trim());
        formData.append('duration', document.getElementById('destination-duration').value.trim());
        formData.append('best_season', document.getElementById('destination-best-season').value.trim());
        formData.append('rating', document.getElementById('destination-rating').value || '4.9');
        
        // recommendation_type现在是多选，从checkbox获取
        const checkedTypes = Array.from(document.querySelectorAll('input[name="recommendation_type"]:checked')).map(cb => cb.value);
        // 确保始终包含default
        if (!checkedTypes.includes('default')) {
            checkedTypes.push('default');
        }
        formData.append('recommendation_type', JSON.stringify(checkedTypes));
        formData.append('sort_order', document.getElementById('destination-sort-order').value || '0');
        
        // 处理发布日期
        const publishDateValue = document.getElementById('destination-publish-date').value;
        if (publishDateValue) {
            formData.append('publish_date', publishDateValue);
        }
        
        formData.append('is_featured', document.getElementById('destination-is-featured').value);
        formData.append('is_hot', document.getElementById('destination-is-hot').value);
        formData.append(
            'description',
            (window.WangEditorHelper && window.WangEditorHelper.editorInstances['destination-description'])
                ? window.WangEditorHelper.getContent('destination-description')
                : document.getElementById('destination-description').value.trim()
        );
        formData.append(
            'features_display',
            (window.WangEditorHelper && window.WangEditorHelper.editorInstances['destination-features'])
                ? window.WangEditorHelper.getContent('destination-features')
                : document.getElementById('destination-features').value.trim()
        );
        formData.append('views', String(this.currentEditingData?.views || 0));
        
        if (coverFile) {
            formData.append('cover_image', coverFile);
        }
        
        galleryInputs.forEach((input, index) => {
            const file = input?.files && input.files[0];
            if (file) {
                formData.append(`gallery_image_${index + 1}`, file);
            }
        });
        
        return formData;
    },
    
    previewCoverImage() {
        const input = document.getElementById('destination-cover-image');
        const uploadBox = document.getElementById('destination-cover-upload-box');
        const preview = document.getElementById('destination-cover-preview');
        const previewImage = document.getElementById('destination-cover-preview-img');
        const fileNameEl = document.getElementById('destination-cover-file-name');
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
    
    previewGalleryImage(index) {
        const input = document.getElementById(`destination-gallery-image-${index}`);
        const uploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
        const preview = document.getElementById(`destination-gallery-preview-${index}`);
        const previewImage = document.getElementById(`destination-gallery-preview-img-${index}`);
        const fileNameEl = document.getElementById(`destination-gallery-file-name-${index}`);
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
        const input = document.getElementById('destination-cover-image');
        if (input) input.click();
    },
    
    removeCoverImage() {
        const input = document.getElementById('destination-cover-image');
        const uploadBox = document.getElementById('destination-cover-upload-box');
        const preview = document.getElementById('destination-cover-preview');
        const previewImage = document.getElementById('destination-cover-preview-img');
        const fileNameEl = document.getElementById('destination-cover-file-name');
        
        if (input) input.value = '';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        // 显示上传框，隐藏预览
        if (uploadBox) uploadBox.style.display = 'block';
        if (preview) preview.style.display = 'none';
    },
    
    editGalleryImage(index) {
        const input = document.getElementById(`destination-gallery-image-${index}`);
        if (input) input.click();
    },
    
    removeGalleryImage(index) {
        const input = document.getElementById(`destination-gallery-image-${index}`);
        const uploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
        const preview = document.getElementById(`destination-gallery-preview-${index}`);
        const previewImage = document.getElementById(`destination-gallery-preview-img-${index}`);
        const fileNameEl = document.getElementById(`destination-gallery-file-name-${index}`);
        
        if (input) input.value = '';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        // 显示上传框，隐藏预览
        if (uploadBox) uploadBox.style.display = 'block';
        if (preview) preview.style.display = 'none';
    },
    
    async submitForm() {
        try {
            const data = this.buildFormData();
            
            if (this.currentEditingId) {
                await api.updateDestination(this.currentEditingId, data);
                showNotification('旅游目的地修改成功', 'success');
            } else {
                await api.createDestination(data);
                showNotification('旅游目的地添加成功', 'success');
            }
            
            this.resetForm();
            AdminApp.clearModuleCache('destination');
            await this.loadDestinationsList();
        } catch (error) {
            console.error('提交旅游目的地失败:', error);
            showNotification('提交失败：' + error.message, 'error');
        }
    },
    
    resetForm() {
        const form = document.getElementById('destination-form');
        if (form) form.reset();
        
        // 重置推荐类型复选框 - 默认推荐始终选中但隐藏
        document.querySelectorAll('input[name="recommendation_type"]').forEach(cb => {
            cb.checked = cb.value === 'default';
        });
        const defaultCheckbox = document.querySelector('input[name="recommendation_type"][value="default"]');
        if (defaultCheckbox) defaultCheckbox.checked = true;
        
        this.currentEditingId = null;
        this.currentEditingData = null;
        
        const titleEl = document.querySelector('#destination-module .card-title');
        if (titleEl) titleEl.textContent = '新增旅游目的地';
        
        const submitBtn = document.querySelector('#destination-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '提交';
        
        const deleteBtn = document.getElementById('destination-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        // 重置发布日期
        const publishDateInput = document.getElementById('destination-publish-date');
        if (publishDateInput) publishDateInput.value = '';
        
        const preview = document.getElementById('destination-cover-preview');
        const previewImage = document.getElementById('destination-cover-preview-img');
        const fileNameEl = document.getElementById('destination-cover-file-name');
        const uploadBox = document.getElementById('destination-cover-upload-box');
        if (preview) preview.style.display = 'none';
        if (previewImage) previewImage.src = '';
        if (fileNameEl) fileNameEl.textContent = '';
        if (uploadBox) uploadBox.style.display = 'block';
        
        [1, 2, 3, 4].forEach(index => {
            const galleryPreview = document.getElementById(`destination-gallery-preview-${index}`);
            const galleryImage = document.getElementById(`destination-gallery-preview-img-${index}`);
            const galleryFileName = document.getElementById(`destination-gallery-file-name-${index}`);
            const galleryUploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
            if (galleryPreview) galleryPreview.style.display = 'none';
            if (galleryImage) galleryImage.src = '';
            if (galleryFileName) galleryFileName.textContent = '';
            if (galleryUploadBox) galleryUploadBox.style.display = 'block';
        });
        
        // 清空编辑器
        if (window.WangEditorHelper && window.WangEditorHelper.batchSetContent) {
            window.WangEditorHelper.batchSetContent({
                'destination-description': '',
                'destination-features': ''
            });
        }
    },
    
    async editDestination(id) {
        try {
            const destination = await api.getDestination(id);
            this.currentEditingId = id;
            this.currentEditingData = destination;
            
            document.getElementById('destination-name').value = destination.name || '';
            document.getElementById('destination-city').value = destination.city || '';
            document.getElementById('destination-location').value = destination.location || '';
            document.getElementById('destination-country').value = destination.country || '中国';
            document.getElementById('destination-state').value = destination.state || '';
            document.getElementById('destination-category').value = destination.category || '';
            document.getElementById('destination-price-range').value = destination.price_range || '';
            document.getElementById('destination-duration').value = destination.duration || '';
            document.getElementById('destination-best-season').value = destination.best_season || '';
            document.getElementById('destination-rating').value = destination.rating || 4.9;
            
            // 处理多选推荐类型 - 确保default始终被选中
            const recTypes = Array.isArray(destination.recommendation_type) ? destination.recommendation_type : [destination.recommendation_type];
            document.querySelectorAll('input[name="recommendation_type"]').forEach(cb => {
                cb.checked = recTypes.includes(cb.value);
            });
            const defaultCheckbox = document.querySelector('input[name="recommendation_type"][value="default"]');
            if (defaultCheckbox && !defaultCheckbox.checked) {
                defaultCheckbox.checked = true;
            }
            
            document.getElementById('destination-sort-order').value = destination.sort_order || 0;
            
            // 处理发布日期 - 将 ISO 格式转换为 datetime-local 格式
            if (destination.publish_date) {
                const publishDate = new Date(destination.publish_date);
                const year = publishDate.getFullYear();
                const month = String(publishDate.getMonth() + 1).padStart(2, '0');
                const day = String(publishDate.getDate()).padStart(2, '0');
                const hours = String(publishDate.getHours()).padStart(2, '0');
                const minutes = String(publishDate.getMinutes()).padStart(2, '0');
                document.getElementById('destination-publish-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                document.getElementById('destination-publish-date').value = '';
            }
            
            document.getElementById('destination-is-featured').value = String(Boolean(destination.is_featured));
            document.getElementById('destination-is-hot').value = String(Boolean(destination.is_hot));
            
            // 设置内容到textarea
            document.getElementById('destination-description').value = destination.description || '';
            document.getElementById('destination-features').value = destination.features_display || (destination.features || []).join('\n');
            
            // 封面图片
            const preview = document.getElementById('destination-cover-preview');
            const previewImage = document.getElementById('destination-cover-preview-img');
            const fileNameEl = document.getElementById('destination-cover-file-name');
            const uploadBox = document.getElementById('destination-cover-upload-box');
            const coverUrl = destination.cover_image_url || destination.cover_image || '';
            previewImage.src = coverUrl;
            if (fileNameEl && coverUrl) {
                const fileName = coverUrl.split('/').pop();
                fileNameEl.textContent = fileName || '已上传图片';
            }
            if (coverUrl) {
                if (uploadBox) uploadBox.style.display = 'none';
                if (preview) preview.style.display = 'block';
            } else {
                if (uploadBox) uploadBox.style.display = 'block';
                if (preview) preview.style.display = 'none';
            }
            
            // 展示图片
            [1, 2, 3, 4].forEach(index => {
                const galleryPreview = document.getElementById(`destination-gallery-preview-${index}`);
                const galleryImage = document.getElementById(`destination-gallery-preview-img-${index}`);
                const galleryFileName = document.getElementById(`destination-gallery-file-name-${index}`);
                const galleryUploadBox = document.getElementById(`destination-gallery-upload-box-${index}`);
                const imageUrl = destination[`gallery_image_${index}_url`] || destination[`gallery_image_${index}`] || '';
                if (galleryImage) galleryImage.src = imageUrl;
                if (galleryFileName && imageUrl) {
                    const fileName = imageUrl.split('/').pop();
                    galleryFileName.textContent = fileName || '已上传图片';
                }
                if (imageUrl) {
                    if (galleryUploadBox) galleryUploadBox.style.display = 'none';
                    if (galleryPreview) galleryPreview.style.display = 'block';
                } else {
                    if (galleryUploadBox) galleryUploadBox.style.display = 'block';
                    if (galleryPreview) galleryPreview.style.display = 'none';
                }
            });
            
            const titleEl = document.querySelector('#destination-module .card-title');
            if (titleEl) titleEl.textContent = '编辑旅游目的地';
            
            const submitBtn = document.querySelector('#destination-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '保存修改';
            
            const deleteBtn = document.getElementById('destination-delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
            
            document.getElementById('destination-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // 缓存所有表单数据
            AdminApp.saveToCache('destination-name', destination.name || '');
            AdminApp.saveToCache('destination-city', destination.city || '');
            AdminApp.saveToCache('destination-location', destination.location || '');
            AdminApp.saveToCache('destination-country', destination.country || '中国');
            AdminApp.saveToCache('destination-state', destination.state || '');
            AdminApp.saveToCache('destination-category', destination.category || '');
            AdminApp.saveToCache('destination-price-range', destination.price_range || '');
            AdminApp.saveToCache('destination-duration', destination.duration || '');
            AdminApp.saveToCache('destination-best-season', destination.best_season || '');
            AdminApp.saveToCache('destination-rating', destination.rating || 4.9);
            AdminApp.saveToCache('destination-sort-order', destination.sort_order || 0);
            
            // 缓存发布日期
            if (destination.publish_date) {
                const publishDate = new Date(destination.publish_date);
                const year = publishDate.getFullYear();
                const month = String(publishDate.getMonth() + 1).padStart(2, '0');
                const day = String(publishDate.getDate()).padStart(2, '0');
                const hours = String(publishDate.getHours()).padStart(2, '0');
                const minutes = String(publishDate.getMinutes()).padStart(2, '0');
                AdminApp.saveToCache('destination-publish-date', `${year}-${month}-${day}T${hours}:${minutes}`);
            }
            
            AdminApp.saveToCache('destination-is-featured', String(Boolean(destination.is_featured)));
            AdminApp.saveToCache('destination-is-hot', String(Boolean(destination.is_hot)));
            AdminApp.saveToCache('destination-description', destination.description || '');
            AdminApp.saveToCache('destination-features', destination.features_display || (destination.features || []).join('\n'));
            AdminApp.saveToCache('recommendation_types', recTypes);
            
            // 缓存图片状态
            if (coverUrl) {
                AdminApp.saveToCache('destination-cover-has-image', true);
                const fileName = coverUrl.split('/').pop();
                AdminApp.saveToCache('destination-cover-file-name', fileName || '已上传图片');
            }
            
            [1, 2, 3, 4].forEach(index => {
                const imageUrl = destination[`gallery_image_${index}_url`] || destination[`gallery_image_${index}`] || '';
                if (imageUrl) {
                    AdminApp.saveToCache(`destination-gallery-image-${index}-has-image`, true);
                    const fileName = imageUrl.split('/').pop();
                    AdminApp.saveToCache(`destination-gallery-image-${index}-name`, fileName || '已上传图片');
                }
            });
            
            console.log('✨ 已缓存旅游目的地编辑数据');
            
            // 自动初始化富文本编辑器
            setTimeout(async () => {
                try {
                    const editors = [
                        { id: 'destination-description', placeholder: '请输入旅游目的地的详细介绍...', content: destination.description },
                        { id: 'destination-features', placeholder: '请输入旅游目的地特色亮点，可使用富文本排版...', content: destination.features_display || '' }
                    ];
                    
                    for (const editor of editors) {
                        if (!window.WangEditorHelper || 
                            !window.WangEditorHelper.editorInstances[editor.id] ||
                            window.WangEditorHelper.editorInstances[editor.id]._destroyed) {
                            console.log(`正在自动初始化目的地编辑器: ${editor.id}`);
                            await AdminApp.lazyInitEditor(editor.id, editor.placeholder);
                            
                            if (editor.content) {
                                window.WangEditorHelper.setContent(editor.id, editor.content);
                            }
                        } else {
                            window.WangEditorHelper.setContent(editor.id, editor.content || '');
                        }
                    }
                } catch (error) {
                    console.error('自动初始化目的地编辑器失败:', error);
                }
            }, 300);
        } catch (error) {
            console.error('加载目的地详情失败:', error);
            showNotification('加载目的地详情失败', 'error');
        }
    },
    
    async deleteCurrentDestination() {
        if (!this.currentEditingId) {
            showNotification('请先选择要编辑的目的地', 'error');
            return;
        }
        
        const confirmed = await showConfirm({
            title: '删除旅游目的地',
            message: '确定要删除当前这条旅游目的地吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteDestination(this.currentEditingId);
            showNotification('删除成功', 'success');
            this.resetForm();
            AdminApp.clearModuleCache('destination');
            await this.loadDestinationsList();
        } catch (error) {
            console.error('删除当前目的地失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async deleteDestinationById(id) {
        const confirmed = await showConfirm({
            title: '删除旅游目的地',
            message: '确定要删除该旅游目的地吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteDestination(id);
            showNotification('删除成功', 'success');
            await this.loadDestinationsList();
        } catch (error) {
            console.error('删除旅游目的地失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async loadDestinationsList() {
        const container = document.getElementById('destination-list-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getDestinations({ limit: 100, sort: 'sort_order' });
            
            if (response.data && response.data.length > 0) {
                this.renderDestinationsList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无旅游目的地</div></div>';
            }
        } catch (error) {
            console.error('加载旅游目的地失败:', error);
            AdminApp.showError(container);
        }
    },
    
    formatRecommendationTypes(types) {
        if (!types) return '未设置';
        const typeArray = Array.isArray(types) ? types : [types];
        const typeMap = {
            'default': '默认推荐',
            'nearby': 'IP周边',
            'managed': '管理员精选',
            'selected': '出行推荐'
        };
        return typeArray.map(t => typeMap[t] || t).join(', ');
    },
    
    renderDestinationsList(container, destinations) {
        const html = destinations.map(item => `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
                <div style="display:flex; gap:16px; align-items:center; flex:1;">
                    <img src="${escapeHtml(item.cover_image_url || item.cover_image || '')}" alt="${escapeHtml(item.name)}" style="width:96px; height:72px; object-fit:cover; border-radius:12px; border:1px solid var(--border-color);">
                    <div style="flex:1;">
                        <div style="font-weight:500;">${escapeHtml(item.name)}</div>
                        <div class="list-item-meta">
                            <span><i class="fas fa-location-dot"></i> ${escapeHtml(item.city)} · ${escapeHtml(item.location || '')}</span>
                            <span><i class="fas fa-globe"></i> ${item.is_domestic ? '国内' : '国际'}</span>
                            <span><i class="fas fa-tag"></i> ${escapeHtml(item.category || '未分类')}</span>
                            <span><i class="fas fa-star"></i> ${item.rating || 0}</span>
                            <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                            <span><i class="fas fa-layer-group"></i> ${this.formatRecommendationTypes(item.recommendation_type)}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary" onclick="AdminApp.Modules.Destination.editDestination('${item.id}')">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-secondary" onclick="AdminApp.Modules.Destination.deleteDestinationById('${item.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    // ==================== 编辑器初始化 ====================
    
    // 初始化编辑器（2个字段）
    async initEditors() {
        try {
            if (!window.WangEditorHelper) {
                console.warn('WangEditorHelper未加载');
                return;
            }
            
            const editors = [
                { id: 'destination-description', placeholder: '请输入旅游目的地的详细介绍...' },
                { id: 'destination-features', placeholder: '请输入旅游目的地特色亮点，可使用富文本排版...' }
            ];
            
            for (const editor of editors) {
                // 检查是否已经初始化
                if (window.WangEditorHelper.editorInstances[editor.id] &&
                    !window.WangEditorHelper.editorInstances[editor.id]._destroyed) {
                    console.log(`目的地编辑器 ${editor.id} 已存在，跳过初始化`);
                    continue;
                }
                
                console.log(`正在初始化目的地编辑器: ${editor.id}`);
                await AdminApp.lazyInitEditor(editor.id, editor.placeholder);
            }
            
            console.log('✅ 目的地编辑器初始化成功');
        } catch (error) {
            console.error('❌ 目的地编辑器初始化失败:', error);
        }
    }
};
