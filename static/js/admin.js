/**
 * 管理后台主应用 - 模块化架构
 * 版本: 20260502
 * 说明: 采用模块化设计，降低耦合度
 */

// ==================== 全局命名空间 ====================
const AdminApp = {
    // 当前加载的模块
    currentModule: null,
    
    // 模块配置
    modules: {
        policy: { name: '政策法规', template: 'policy' },
        news: { name: '新闻资讯', template: 'news' },
        safety: { name: '安全隐患', template: 'safety' },
        destination: { name: '旅游目的地', template: 'destination' },
        statistics: { name: '统计数据', template: 'statistics' },
        message: { name: '留言管理', template: 'message' },
        user: { name: '用户管理', template: 'user' }
    },
    
    // 初始化应用
    init() {
        console.log('🚀 AdminApp 初始化...');
        
        // 检查权限
        this.checkPermission().then(() => {
            // 初始化通用功能
            this.initCommonFeatures();
            
            // ✅ 监听浏览器返回/前进按钮（hash变化）
            this.initHashChangeListener();
            
            // 检查URL hash，自动加载对应模块
            const hash = window.location.hash.replace('#', '');
            if (hash && this.modules[hash]) {
                this.loadModule(hash);
            }
            
            console.log('✅ AdminApp 初始化完成');
        }).catch(error => {
            console.error('❌ AdminApp 初始化失败:', error);
        });
    },
    
    // 权限检查
    async checkPermission() {
        if (!auth.isAuthenticated()) {
            showNotification('请先登录管理员账号', 'error');
            setTimeout(() => {
                window.location.href = '/auth/?redirect=' + encodeURIComponent('/admin-page/');
            }, 1500);
            throw new Error('未登录');
        }
        
        let user = auth.getUser();
        if (!user) {
            user = await auth.getCurrentUser();
        }
        
        if (!user || !user.is_staff) {
            showNotification('您无权访问管理后台', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            throw new Error('非管理员');
        }
        
        return user;
    },
    
    // 初始化通用功能
    initCommonFeatures() {
        // 缓存清除按钮
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearAllCache();
            });
        }
        
        console.log('✅ 通用功能初始化完成');
    },
    
    // ✅ 初始化Hash变化监听器（支持浏览器返回/前进按钮）
    initHashChangeListener() {
        window.addEventListener('popstate', (event) => {
            console.log('🔙 检测到浏览器返回/前进操作');
            
            const hash = window.location.hash.replace('#', '');
            
            if (hash && this.modules[hash]) {
                // 如果hash指向一个有效模块，加载该模块
                console.log(`📦 加载模块: ${hash}`);
                this.loadModule(hash);
            } else {
                // 如果hash为空或无效，显示模块选择器
                console.log('🏠 显示模块选择器');
                this.showModuleSelector();
            }
        });
        
        console.log('✅ Hash变化监听器已启动');
    },
    
    // 加载模块
    async loadModule(moduleName) {
        const module = this.modules[moduleName];
        if (!module) {
            console.error(`无效的模块: ${moduleName}`);
            return;
        }
        
        console.log(`📦 加载模块: ${module.name}`);
        
        // 隐藏模块选择器
        const selector = document.getElementById('module-selector');
        if (selector) {
            selector.style.display = 'none';
        }
        
        // 显示加载动画
        const container = document.getElementById('admin-module-container');
        if (container) {
            container.innerHTML = `
                <div class="module-loading">
                    <div class="spinner"></div>
                    <div>正在加载 ${module.name} 模块...</div>
                </div>
            `;
        }
        
        try {
            // AJAX 加载模块HTML
            const response = await fetch(`/api/admin/module/${moduleName}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            
            // 插入HTML
            if (container) {
                container.innerHTML = html;
            }
            
            // ✅ 添加返回按钮到模块左上角
            this.addBackButton(moduleName);
            
            // 更新当前模块
            this.currentModule = moduleName;
            
            // ✅ 更新URL hash（使用pushState添加到历史记录）
            window.history.pushState({ module: moduleName }, '', `#${moduleName}`);
            
            // 初始化模块特定功能
            await this.initModule(moduleName);
            
            console.log(`✅ 模块 ${module.name} 加载成功`);
            
        } catch (error) {
            console.error(`❌ 加载模块失败:`, error);
            if (container) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger-color); margin-bottom: 20px;"></i>
                        <h3>加载失败</h3>
                        <p>${error.message}</p>
                        <button onclick="AdminApp.showModuleSelector()" class="btn btn-primary" style="margin-top: 20px;">
                            返回模块选择
                        </button>
                    </div>
                `;
            }
        }
    },
    
    // 初始化模块特定功能
    async initModule(moduleName) {
        console.log(`🔧 初始化模块功能: ${moduleName}`);
        
        // 根据模块名称调用对应的初始化函数
        switch (moduleName) {
            case 'policy':
                await this.Modules.Policy.init();
                break;
            case 'news':
                await this.Modules.News.init();
                break;
            case 'safety':
                await this.Modules.Safety.init();
                break;
            case 'destination':
                await this.Modules.Destination.init();
                break;
            case 'statistics':
                await this.Modules.Statistics.init();
                break;
            case 'message':
                await this.Modules.Message.init();
                break;
            case 'user':
                await this.Modules.User.init();
                break;
            default:
                console.warn(`未知模块: ${moduleName}`);
        }
    },
    
    // 显示模块选择器
    showModuleSelector() {
        const selector = document.getElementById('module-selector');
        if (selector) {
            selector.style.display = 'grid';
        }
        
        const container = document.getElementById('admin-module-container');
        if (container) {
            container.innerHTML = '';
        }
        
        this.currentModule = null;
        
        // ✅ 清除hash并添加到历史记录（支持浏览器返回）
        window.history.pushState({ module: null }, '', window.location.pathname);
        
        console.log('🏠 返回模块选择器');
    },
    
    // 添加返回按钮到模块左上角
    addBackButton(moduleName) {
        const module = this.modules[moduleName];
        if (!module) return;
        
        // 查找模块容器
        const moduleContainer = document.querySelector('.admin-module') || 
                               document.getElementById(`${moduleName}-module`);
        
        if (!moduleContainer) {
            console.warn(`未找到模块容器: ${moduleName}`);
            return;
        }
        
        // 检查是否已经存在返回按钮
        if (moduleContainer.querySelector('.back-button')) {
            return;
        }
        
        // 创建返回按钮
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> 返回模块选择';
        backButton.onclick = () => this.showModuleSelector();
        
        // 插入到模块容器的最前面
        moduleContainer.insertBefore(backButton, moduleContainer.firstChild);
        
        console.log(`✅ 已为 ${module.name} 添加返回按钮`);
    },
    
    // 清除所有缓存
    clearAllCache() {
        // 清除localStorage中的admin缓存
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('admin_cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        // 清除sessionStorage
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('admin_')) {
                sessionStorage.removeItem(key);
            }
        });
        
        showNotification('缓存已清除，页面将刷新', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    },
    
    // 清除模块缓存
    clearModuleCache(moduleName) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`admin_cache_${moduleName}-`)) {
                localStorage.removeItem(key);
            }
        });
        console.log(`✨ 已清除 ${moduleName} 模块缓存`);
    },
    
    // 保存缓存
    saveToCache(key, value) {
        try {
            localStorage.setItem(`admin_cache_${key}`, JSON.stringify(value));
        } catch (error) {
            console.warn('缓存保存失败:', error);
        }
    },
    
    // 读取缓存
    loadFromCache(key) {
        try {
            const value = localStorage.getItem(`admin_cache_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn('缓存读取失败:', error);
            return null;
        }
    },
    
    // 恢复缓存
    restoreCache() {
        console.log('🔄 尝试恢复缓存...');
        // 由各个模块自行实现缓存恢复逻辑
    },
    
    // 显示加载状态
    showLoading(container) {
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div><div>加载中...</div></div>';
        }
    },
    
    // 显示错误状态
    showError(container) {
        if (container) {
            container.innerHTML = '<div class="loading"><div style="color: var(--danger-color);">加载失败</div></div>';
        }
    },
    
    // 懒加载初始化编辑器
    async lazyInitEditor(elementId, placeholder = '请输入内容...') {
        try {
            // 检查是否已经初始化过
            if (window.WangEditorHelper && 
                window.WangEditorHelper.editorInstances[elementId] &&
                !window.WangEditorHelper.editorInstances[elementId]._destroyed) {
                console.log(`编辑器 ${elementId} 已存在，无需重复初始化`);
                return window.WangEditorHelper.editorInstances[elementId];
            }
            
            // 等待WangEditorHelper加载
            if (typeof window.WangEditorHelper === 'undefined') {
                console.warn('WangEditorHelper未加载，等待...');
                await new Promise(resolve => setTimeout(resolve, 500));
                return await this.lazyInitEditor(elementId, placeholder);
            }
            
            console.log(`正在初始化编辑器: ${elementId}`);
            const editor = await window.WangEditorHelper.initEditor(elementId, {
                placeholder: placeholder
            });
            
            // ✅ 不再需要隐藏按钮（按钮已被删除）
            
            console.log(`编辑器 ${elementId} 初始化成功`);
            return editor;
        } catch (error) {
            console.error(`初始化编辑器 ${elementId} 失败:`, error);
            return null;
        }
    }
};

// ==================== 模块命名空间 ====================
AdminApp.Modules = {
    Policy: {},
    News: {},
    Safety: {},
    Destination: {},
    Statistics: {},
    Message: {},
    User: {}
};

// ==================== 页面加载完成后初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

// ==================== 导出全局函数（兼容旧代码） ====================
// 为了保持与HTML中onclick的兼容性
window.loadAdminModule = (moduleName) => {
    AdminApp.loadModule(moduleName);
};

window.showModuleSelector = () => {
    AdminApp.showModuleSelector();
};
