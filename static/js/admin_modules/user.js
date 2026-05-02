/**
 * 用户管理模块 - 完整版
 * 迁移自 admin_old.js，保留所有原有功能
 */
AdminApp.Modules.User = {
    currentPage: 1,
    search: '',
    roleFilter: 'all',
    currentManagingUserId: null,
    
    async init() {
        console.log('👥 初始化用户管理模块');
        await this.loadUsersList();
    },
    
    async loadUsersList() {
        const container = document.getElementById('users-admin-container');
        if (!container) return;
        
        try {
            AdminApp.showLoading(container);
            
            // 构建查询参数
            const params = {
                page: this.currentPage,
                limit: 20,
                sort: '-date_joined'
            };
            
            if (this.search) {
                params.search = this.search;
            }
            
            const response = await api.getUsers(params);
            
            if (response.data && response.data.length > 0) {
                // 根据角色筛选
                let filteredUsers = response.data;
                if (this.roleFilter === 'admin') {
                    filteredUsers = response.data.filter(u => u.is_staff);
                } else if (this.roleFilter === 'normal') {
                    filteredUsers = response.data.filter(u => !u.is_staff);
                }
                
                this.renderUsersList(container, filteredUsers, response.total);
            } else {
                container.innerHTML = '<div class="loading"><div>暂无用户</div></div>';
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            AdminApp.showError(container);
        }
    },
    
    renderUsersList(container, users, total) {
        const searchHtml = `
            <div style="margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
                <input type="text" id="user-search-input" class="form-input" placeholder="搜索用户名或邮箱..." 
                       value="${escapeHtml(this.search)}" style="flex: 1; min-width: 200px;">
                <select id="user-role-filter" class="form-select" style="width: 150px;">
                    <option value="all" ${this.roleFilter === 'all' ? 'selected' : ''}>全部用户</option>
                    <option value="admin" ${this.roleFilter === 'admin' ? 'selected' : ''}>管理员</option>
                    <option value="normal" ${this.roleFilter === 'normal' ? 'selected' : ''}>普通用户</option>
                </select>
                <button onclick="AdminApp.Modules.User.searchUsers()" class="btn btn-primary">
                    <i class="fas fa-search"></i> 搜索
                </button>
                <button onclick="AdminApp.Modules.User.resetSearch()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> 重置
                </button>
            </div>
        `;
        
        const usersHtml = users.map(user => {
            const statusBadge = user.is_active === false 
                ? '<span class="tag danger" style="margin-left: 8px;">已冻结</span>' 
                : '<span class="tag success" style="margin-left: 8px;">正常</span>';
            const roleBadge = user.is_staff 
                ? '<span class="tag primary" style="margin-left: 8px;">管理员</span>' 
                : '<span class="tag" style="margin-left: 8px;">普通用户</span>';
            
            return `
                <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">
                            ${escapeHtml(user.username)} ${roleBadge} ${statusBadge}
                        </div>
                        <div class="list-item-meta">
                            <span><i class="fas fa-envelope"></i> ${escapeHtml(user.email || '未填写')}</span>
                            <span><i class="fas fa-phone"></i> ${escapeHtml(user.phone || '未填写')}</span>
                            <span><i class="fas fa-clock"></i> 注册于 ${formatDateTime(user.date_joined)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary" onclick="AdminApp.Modules.User.openManageModal('${user.id}')">
                            <i class="fas fa-cog"></i> 管理
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // 分页控件
        const totalPages = Math.ceil(total / 20);
        const paginationHtml = totalPages > 1 ? `
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 8px; align-items: center;">
                <button onclick="AdminApp.Modules.User.changePage(${this.currentPage - 1})" class="btn btn-secondary" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> 上一页
                </button>
                <span>第 ${this.currentPage} / ${totalPages} 页</span>
                <button onclick="AdminApp.Modules.User.changePage(${this.currentPage + 1})" class="btn btn-secondary"
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    下一页 <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        ` : '';
        
        container.innerHTML = searchHtml + usersHtml + paginationHtml;
    },
    
    searchUsers() {
        const searchInput = document.getElementById('user-search-input');
        const roleFilter = document.getElementById('user-role-filter');
        this.search = searchInput ? searchInput.value.trim() : '';
        this.roleFilter = roleFilter ? roleFilter.value : 'all';
        this.currentPage = 1;
        this.loadUsersList();
    },
    
    resetSearch() {
        this.search = '';
        this.roleFilter = 'all';
        this.currentPage = 1;
        this.loadUsersList();
    },
    
    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadUsersList();
    },
    
    async openManageModal(userId) {
        try {
            const user = await api.getUser(userId);
            this.currentManagingUserId = userId;
            
            const currentUser = auth.getUser();
            const isSelf = currentUser && String(currentUser.id) === String(userId);
            
            const userInfoHtml = `
                <div style="padding: 16px; background: var(--background-secondary); border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>用户名：</strong> ${escapeHtml(user.username)}</p>
                    <p style="margin-top: 8px;"><strong>邮箱：</strong> ${escapeHtml(user.email || '未填写')}</p>
                    <p style="margin-top: 8px;"><strong>手机：</strong> ${escapeHtml(user.phone || '未填写')}</p>
                    <p style="margin-top: 8px;"><strong>注册时间：</strong> ${formatDateTime(user.date_joined)}</p>
                    <p style="margin-top: 8px;"><strong>角色：</strong> ${user.is_staff ? '管理员' : '普通用户'}</p>
                    <p style="margin-top: 8px;"><strong>状态：</strong> ${user.is_active === false ? '已冻结' : '正常'}</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">账号状态</label>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="AdminApp.Modules.User.toggleStatus('${userId}', ${user.is_active !== false})" 
                                class="btn ${user.is_active === false ? 'btn-success' : 'btn-warning'}"
                                ${isSelf ? 'disabled title="不能冻结自己的账号"' : ''}>
                            <i class="fas fa-${user.is_active === false ? 'unlock' : 'lock'}"></i> 
                            ${user.is_active === false ? '解除冻结' : '冻结账号'}
                        </button>
                    </div>
                    <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
                        冻结后用户无法发表留言和评论
                    </small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">角色权限</label>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="AdminApp.Modules.User.toggleAdmin('${userId}', ${user.is_staff})" 
                                class="btn btn-secondary"
                                ${isSelf ? 'disabled title="不能修改自己的权限"' : ''}>
                            <i class="fas fa-user-shield"></i> 
                            ${user.is_staff ? '取消管理员' : '设为管理员'}
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">密码管理</label>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <input type="text" id="reset-password-input" class="form-input" 
                               placeholder="输入新密码（留空则重置为123456）" style="flex: 1;">
                        <button onclick="AdminApp.Modules.User.resetPassword('${userId}')" class="btn btn-primary">
                            <i class="fas fa-key"></i> 重置密码
                        </button>
                    </div>
                    <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
                        用于帮助忘记密码的用户重置密码
                    </small>
                </div>
            `;
            
            document.getElementById('user-manage-info').innerHTML = userInfoHtml;
            userManageModal.open();
        } catch (error) {
            console.error('加载用户详情失败:', error);
            showNotification('加载用户详情失败', 'error');
        }
    },
    
    async toggleStatus(userId, isActive) {
        const action = isActive ? '冻结' : '解除冻结';
        
        const confirmed = await showConfirm({
            title: `${action}用户`,
            message: isActive 
                ? '确定要冻结该用户吗？冻结后用户无法发表留言和评论。'
                : '确定要解除冻结该用户吗？解除后用户可以正常使用系统。',
            confirmText: action,
            cancelText: '取消',
            type: isActive ? 'warning' : 'info'
        });
        
        if (!confirmed) return;
        
        try {
            await api.updateUser(userId, { is_active: !isActive });
            showNotification(`${action}成功`, 'success');
            userManageModal.close();
            await this.loadUsersList();
        } catch (error) {
            console.error(`${action}用户失败:`, error);
            showNotification(`${action}失败：` + error.message, 'error');
        }
    },
    
    async toggleAdmin(userId, isStaff) {
        const action = isStaff ? '取消管理员权限' : '设为管理员';
        
        const confirmed = await showConfirm({
            title: action,
            message: isStaff
                ? '确定要取消该用户的管理员权限吗？取消后用户将无法访问管理后台。'
                : '确定要将该用户设为管理员吗？设置后用户将可以访问管理后台。',
            confirmText: '确定',
            cancelText: '取消',
            type: 'warning'
        });
        
        if (!confirmed) return;
        
        try {
            await api.updateUser(userId, { is_staff: !isStaff });
            showNotification('用户权限已更新', 'success');
            userManageModal.close();
            await this.loadUsersList();
        } catch (error) {
            console.error('更新用户权限失败:', error);
            showNotification('更新用户权限失败：' + error.message, 'error');
        }
    },
    
    async resetPassword(userId) {
        const passwordInput = document.getElementById('reset-password-input');
        const newPassword = passwordInput ? passwordInput.value.trim() : '';
        const finalPassword = newPassword || '123456';
        
        const confirmed = await showConfirm({
            title: '重置密码',
            message: `确定要将该用户密码重置为：${finalPassword} 吗？`,
            confirmText: '重置',
            cancelText: '取消',
            type: 'warning'
        });
        
        if (!confirmed) return;
        
        try {
            await api.resetUserPassword(userId, finalPassword);
            showNotification('密码重置成功', 'success');
            if (passwordInput) passwordInput.value = '';
        } catch (error) {
            console.error('重置密码失败:', error);
            showNotification('重置密码失败：' + error.message, 'error');
        }
    }
};
