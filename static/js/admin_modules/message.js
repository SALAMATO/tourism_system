/**
 * 留言管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能
 */
AdminApp.Modules.Message = {
    currentReplyMessageId: null,
    
    async init() {
        console.log('💬 初始化留言管理模块');
        await this.loadMessagesList();
    },
    
    async loadMessagesList() {
        const container = document.getElementById('messages-admin-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            const response = await api.getMessages({ limit: 100, sort: '-created_at' });
            
            if (response.data && response.data.length > 0) {
                this.renderMessagesList(container, response.data);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无留言</div></div>';
            }
        } catch (error) {
            console.error('加载留言失败:', error);
            AdminApp.showError(container);
        }
    },
    
    renderMessagesList(container, messages) {
        const html = messages.map(msg => `
            <div class="card" data-message-id="${msg.id}" style="margin-bottom: 20px; ${msg.is_hidden ? 'opacity: 0.6; border: 2px solid #ff4444;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <h3 style="font-size: 20px; margin-bottom: 8px;">
                            <i class="fas fa-user-circle"></i> ${escapeHtml(msg.user_nickname || '匿名用户')}
                            ${msg.user ? `<span style="font-size: 14px; color: var(--text-secondary); font-weight: normal;"> (ID: ${msg.user})</span>` : ''}
                        </h3>
                        <div class="list-item-meta">
                            <span><i class="fas fa-tag"></i> ${escapeHtml(msg.message_type)}</span>
                            <span><i class="fas fa-clock"></i> ${formatDateTime(msg.created_at)}</span>
                            <span><i class="fas fa-heart"></i> ${msg.likes_count || 0} 点赞</span>
                            <span><i class="fas fa-comment"></i> ${msg.comments_count || 0} 评论</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="tag ${msg.status === '已回复' ? 'success' : 'warning'}">
                            ${escapeHtml(msg.status)}
                        </span>
                        ${msg.is_hidden ? '<span class="tag danger">已屏蔽</span>' : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 16px; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
                    <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                        <strong>发表者信息：</strong>
                        <div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">
                            <div><i class="fas fa-user"></i> 账号：${escapeHtml(msg.user_username || '未知')}</div>
                            <div style="margin-top: 4px;"><i class="fas fa-envelope"></i> 邮箱：${escapeHtml(msg.user_email || '未填写')}</div>
                            <div style="margin-top: 4px;"><i class="fas fa-phone"></i> 电话：${escapeHtml(msg.user_phone || '未填写')}</div>
                        </div>
                    </div>
                    <strong>留言内容：</strong>
                    <div class="rich-text-content" style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.content)}</div>
                </div>
                
                ${msg.reply ? `
                    <div style="margin-bottom: 16px; padding: 16px; background: rgba(0, 113, 227, 0.05); border-radius: 8px; border-left: 3px solid var(--primary-color);">
                        <strong style="color: var(--primary-color);"><i class="fas fa-reply"></i> 官方回复：</strong>
                        <div class="rich-text-content" style="margin-top: 8px; line-height: 1.6;">${formatRichTextContent(msg.reply)}</div>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <button onclick="AdminApp.Modules.Message.openReplyModal('${msg.id}')"
                        class="btn btn-reply ${msg.reply ? 'reply-active' : ''}">
                        <i class="fa-solid fa-reply"></i>
                        ${msg.reply ? '修改回复' : '回复'}
                    </button>
                    
                    <button onclick="AdminApp.Modules.Message.viewComments('${msg.id}')"
                        class="btn btn-comments">
                        <i class="fa-solid fa-comments"></i>
                        查看评论 (${msg.comments_count || 0})
                    </button>
                    
                    <button onclick="AdminApp.Modules.Message.toggleHidden('${msg.id}', ${!!msg.is_hidden})"
                        class="btn btn-visibility ${msg.is_hidden ? 'hidden-active' : ''}">
                        <i class="fa-solid fa-${msg.is_hidden ? 'eye' : 'eye-slash'}"></i> 
                        ${msg.is_hidden ? '取消屏蔽' : '屏蔽'}
                    </button>
                    
                    <div class="dropdown-menu">
                        <button class="dropdown-toggle" onclick="AdminApp.Modules.Message.toggleAdminDropdown('admin-msg-menu-${msg.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-content" id="admin-msg-menu-${msg.id}">
                            ${msg.reply ? `
                                <button class="dropdown-item danger" onclick="AdminApp.Modules.Message.deleteReply('${msg.id}')">
                                    <i class="fas fa-eraser"></i> 删除回复
                                </button>
                                <div class="dropdown-divider"></div>
                            ` : ''}
                            ${msg.comments_count > 0 ? `
                                <button class="dropdown-item danger" onclick="AdminApp.Modules.Message.clearAllComments('${msg.id}')">
                                    <i class="fas fa-broom"></i> 清空所有评论
                                </button>
                                <div class="dropdown-divider"></div>
                            ` : ''}
                            <button class="dropdown-item danger" onclick="AdminApp.Modules.Message.deleteMessage('${msg.id}')">
                                <i class="fas fa-trash"></i> 删除留言
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="admin-comments-${msg.id}" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    async openReplyModal(messageId) {
        try {
            const message = await api.getMessage(messageId);
            this.currentReplyMessageId = messageId;
            
            const infoHtml = `
                <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px;">
                    <p><strong>昵称：</strong> ${escapeHtml(message.user_nickname || '匿名用户')}</p>
                    <p style="margin-top: 8px;"><strong>用户ID：</strong> ${message.user || '未知'}</p>
                    <p style="margin-top: 8px;"><strong>登录账号：</strong> ${escapeHtml(message.user_username || '未知')}</p>
                    <p style="margin-top: 8px;"><strong>邮箱：</strong> ${escapeHtml(message.user_email || '未填写')}</p>
                    <p style="margin-top: 8px;"><strong>电话：</strong> ${escapeHtml(message.user_phone || '未填写')}</p>
                    <p style="margin-top: 8px;"><strong>类型：</strong> ${escapeHtml(message.message_type)}</p>
                    <div style="margin-top: 8px;"><strong>内容：</strong></div>
                    <div class="rich-text-content" style="margin-top: 8px; padding: 12px; background: var(--background); border-radius: 4px;">${formatRichTextContent(message.content)}</div>
                </div>
            `;
            
            document.getElementById('reply-message-info').innerHTML = infoHtml;
            
            // 设置回复内容
            const replyContent = message.reply || '';
            if (window.WangEditorHelper && window.WangEditorHelper.editorInstances['reply-content']) {
                window.WangEditorHelper.setContent('reply-content', replyContent);
            } else {
                document.getElementById('reply-content').value = replyContent;
            }
            
            // 更新模态框标题和按钮文字
            const isEditing = !!message.reply;
            const modalTitle = document.querySelector('#reply-modal .modal-title');
            if (modalTitle) modalTitle.textContent = isEditing ? '修改回复' : '回复留言';
            const submitBtn = document.getElementById('reply-submit-btn');
            if (submitBtn) submitBtn.textContent = isEditing ? '保存修改' : '提交回复';
            
            // 打开模态框
            replyModal.open();
            
            // 自动初始化编辑器
            setTimeout(async () => {
                try {
                    if (!window.WangEditorHelper || 
                        !window.WangEditorHelper.editorInstances['reply-content'] ||
                        window.WangEditorHelper.editorInstances['reply-content']._destroyed) {
                        await AdminApp.lazyInitEditor('reply-content', '请输入回复内容...');
                        
                        if (replyContent) {
                            window.WangEditorHelper.setContent('reply-content', replyContent);
                        }
                    }
                } catch (error) {
                    console.error('自动初始化回复编辑器失败:', error);
                }
            }, 300);
        } catch (error) {
            console.error('加载留言详情失败:', error);
            showNotification('加载失败', 'error');
        }
    },
    
    async submitReply() {
        let replyContent;
        if (window.WangEditorHelper && window.WangEditorHelper.editorInstances['reply-content']) {
            replyContent = window.WangEditorHelper.getContent('reply-content').trim();
        } else {
            replyContent = document.getElementById('reply-content').value.trim();
        }
        
        if (!replyContent) {
            showNotification('请输入回复内容', 'error');
            return;
        }
        
        try {
            await api.replyMessage(this.currentReplyMessageId, replyContent);
            showNotification('保存成功', 'success');
            replyModal.close();
            
            // 刷新当前留言的状态
            await this.loadMessagesList();
        } catch (error) {
            console.error('回复/修改失败:', error);
            showNotification('保存失败，请稍后重试', 'error');
        }
    },
    
    async deleteMessage(id) {
        const confirmed = await showConfirm({
            title: '删除留言',
            message: '确定要删除该留言吗？删除后将无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteMessage(id);
            showNotification('删除成功', 'success');
            await this.loadMessagesList();
        } catch (error) {
            console.error('删除留言失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    async toggleHidden(messageId, isHidden) {
        const action = isHidden ? '取消屏蔽' : '屏蔽';
        
        const confirmed = await showConfirm({
            title: `${action}留言`,
            message: isHidden 
                ? '确定要取消屏蔽该留言吗？取消后该留言将在前台显示。'
                : '确定要屏蔽该留言吗？屏蔽后该留言将不会在前台显示。',
            confirmText: action,
            cancelText: '取消',
            type: isHidden ? 'info' : 'warning'
        });
        
        if (!confirmed) return;
        
        try {
            await api.updateMessage(messageId, { is_hidden: !isHidden });
            showNotification(`${action}成功`, 'success');
            await this.loadMessagesList();
        } catch (error) {
            console.error(`${action}留言失败:`, error);
            showNotification(`${action}失败：` + error.message, 'error');
        }
    },
    
    async deleteReply(messageId) {
        const confirmed = await showConfirm({
            title: '删除回复',
            message: '确定要删除该回复吗？',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.updateMessage(messageId, { reply: '' });
            showNotification('删除回复成功', 'success');
            await this.loadMessagesList();
        } catch (error) {
            console.error('删除回复失败:', error);
            showNotification('删除回复失败', 'error');
        }
    },
    
    async clearAllComments(messageId) {
        const confirmed = await showConfirm({
            title: '清空所有评论',
            message: '确定要清空这条留言的所有评论吗？此操作无法恢复！',
            confirmText: '清空',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            const comments = await api.getMessageComments(messageId);
            
            if (!comments || comments.length === 0) {
                showNotification('该留言没有评论', 'warning');
                return;
            }
            
            // 逐个删除评论
            for (const comment of comments) {
                await api.deleteComment(comment.id);
            }
            
            showNotification(`成功清空 ${comments.length} 条评论`, 'success');
            await this.loadAdminMessageComments(messageId);
            await this.loadMessagesList();
        } catch (error) {
            console.error('清空评论失败:', error);
            showNotification('清空失败：' + error.message, 'error');
        }
    },
    
    // 查看留言的评论
    async viewComments(messageId) {
        const container = document.getElementById(`admin-comments-${messageId}`);
        if (!container) return;
        
        if (container.style.display === 'none') {
            container.style.display = 'block';
            await this.loadAdminMessageComments(messageId);
        } else {
            container.style.display = 'none';
        }
    },
    
    // 加载留言评论（管理员视图）
    async loadAdminMessageComments(messageId) {
        const container = document.getElementById(`admin-comments-${messageId}`);
        if (!container) return;
        
        try {
            const comments = await api.getMessageComments(messageId);
            
            if (comments && comments.length > 0) {
                const html = `
                    <h4 style="margin-bottom: 12px; font-size: 16px; color: var(--primary-color);">
                        <i class="fas fa-comments"></i> 评论列表 (${comments.length})
                    </h4>
                    ${comments.map(comment => `
                        <div class="comment-item" style="position: relative; padding: 16px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 12px;">
                            <div class="comment-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <div>
                                    <div class="comment-author" style="font-weight: 500; font-size: 14px;">
                                        <i class="fas fa-user-circle"></i> ${escapeHtml(comment.user_nickname || '匿名用户')}
                                        ${comment.user_is_staff ? '<span class="tag primary" style="margin-left: 8px; font-size: 12px;">官方回复</span>' : ''}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                        <i class="fas fa-id-badge"></i> 用户ID: ${comment.user || '未知'}
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div class="comment-time" style="font-size: 12px; color: var(--text-secondary);">
                                        ${formatDateTime(comment.created_at)}
                                    </div>
                                    <div class="dropdown-menu">
                                        <button class="dropdown-toggle" onclick="AdminApp.Modules.Message.toggleAdminDropdown('admin-comment-menu-${comment.id}')" style="padding: 4px 8px; font-size: 14px;">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <div class="dropdown-content" id="admin-comment-menu-${comment.id}">
                                            <button class="dropdown-item danger" onclick="AdminApp.Modules.Message.deleteAdminComment('${comment.id}', '${messageId}')">
                                                <i class="fas fa-trash"></i> 删除评论
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="comment-content rich-text-content" style="font-size: 14px; line-height: 1.6; padding: 8px 0;">
                                ${formatRichTextContent(comment.content)}
                            </div>
                        </div>
                    `).join('')}
                `;
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 16px;">暂无评论</div>';
            }
        } catch (error) {
            console.error('加载评论失败:', error);
            container.innerHTML = '<div style="text-align: center; color: var(--danger-color); padding: 16px;">加载评论失败</div>';
        }
    },
    
    // 删除评论（管理员）
    async deleteAdminComment(commentId, messageId) {
        const confirmed = await showConfirm({
            title: '删除评论',
            message: '确定要删除这条评论吗？删除后无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (!confirmed) return;
        
        try {
            await api.deleteComment(commentId);
            showNotification('评论删除成功', 'success');
            await this.loadAdminMessageComments(messageId);
            await this.loadMessagesList(); // 刷新留言列表以更新评论数
        } catch (error) {
            console.error('删除评论失败:', error);
            showNotification('删除失败：' + error.message, 'error');
        }
    },
    
    // 切换管理员下拉菜单
    toggleAdminDropdown(menuId) {
        // 关闭所有其他下拉菜单
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            if (menu.id !== menuId) {
                menu.classList.remove('show');
            }
        });
        
        // 切换当前菜单
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.toggle('show');
        }
    }
};

// 点击外部关闭下拉菜单
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});
