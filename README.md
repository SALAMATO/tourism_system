# 基于 Django 的低空旅游安全信息管理系统

### Graduation Project – Low-altitude Tourism Safety Information Management System

---

## 📌 目录

* [一、项目简介](#一项目简介)
* [二、项目背景与研究意义](#二项目背景与研究意义)
* [三、系统总体架构](#三系统总体架构)
* [四、技术栈](#四技术栈)
* [五、系统功能模块](#五系统功能模块)
* [六、数据库设计](#六数据库设计)
* [七、项目文件结构](#七项目文件结构)
* [八、管理后台模块化架构](#八管理后台模块化架构)
* [九、系统运行环境](#九系统运行环境)
* [十、AI智能助手功能](#十ai智能助手功能)
* [十一、项目创新点](#十一项目创新点)
* [十二、系统不足与优化方向](#十二系统不足与优化方向)
* [十三、数据库导出与导入](#十三数据库导出与导入)
* [十四、总结](#十四总结)

---

## 一、项目简介

本项目基于 **Python + Django + Django REST Framework** 开发，实现了一个低空旅游安全信息管理系统。

系统包含：

* 旅游目的地管理（国内/国外）
* 政策法规管理
* 新闻资讯发布
* 安全隐患预警
* 互动交流社区
* 数据统计分析
* AI智能助手（集成阿里云通义千问）
* 用户位置定位与周边推荐
* 媒体文件哈希去重管理

采用 **前后端分离架构**：

* 前端：HTML5 + Tailwind CSS + JavaScript (ES6) + ECharts
* 后端：Django 6.0 + Django REST Framework
* 数据库：SQLite3（开发环境）/ MySQL（生产环境）
* AI服务：阿里云百炼平台（通义千问系列模型）

整体设计风格采用 Apple Human Interface Guidelines 极简风格，加入毛玻璃与动态阴影效果。

---

## 二、项目背景与研究意义

随着低空经济的快速发展，低空旅游成为新兴产业形态。

目前存在问题：

* 政策信息分散
* 安全隐患管理不足
* 数据统计不直观
* 信息交互效率低

本系统旨在构建一体化信息管理平台，提高行业管理效率。

---

## 三、系统总体架构

### 3.1 整体架构

```
浏览器（前端页面）
    │
    │  Fetch API（JSON）
    ↓
Django REST Framework（后端API）
    │
    ↓
MySQL 数据库
```

### 3.2 管理后台模块化架构

管理后台采用**完全解耦的模块化设计**，实现高内聚低耦合：

```
admin.html（主容器）
    │
    ├── admin.js（核心控制器）
    │     ├── 模块加载器
    │     ├── 权限验证
    │     ├── Hash路由管理
    │     └── 缓存管理
    │
    └── admin_modules/（功能模块）
          ├── policy.js + policy.html      # 政策法规管理
          ├── news.js + news.html          # 新闻资讯管理
          ├── safety.js + safety.html      # 安全隐患管理
          ├── destination.js + destination.html  # 旅游目的地管理
          ├── statistics.js + statistics.html    # 统计数据管理
          ├── message.js + message.html    # 留言管理
          └── user.js + user.html          # 用户管理
```

**架构特点：**
- **动态加载**：通过AJAX按需加载模块HTML片段
- **Hash路由**：支持浏览器前进/后退按钮，URL自动同步模块状态
- **命名空间隔离**：每个模块独立命名空间（AdminApp.Modules.XXX）
- **懒加载机制**：富文本编辑器仅在需要时初始化
- **缓存策略**：localStorage缓存表单数据，防止意外丢失
- **统一接口**：所有模块遵循统一的init()初始化规范

---

## 四、技术栈

### 后端技术

* Python 3.x
* Django 6.0
* Django REST Framework
* SQLite3 / MySQL
* Django ORM
* Token Authentication
* CORS Headers

### 前端技术

* HTML5
* JavaScript (ES6)
* Fetch API
* ECharts（数据可视化）
* Tailwind CSS 4.2
* WangEditor（富文本编辑器）

### AI技术

* 阿里云百炼平台
* 通义千问系列模型（qwen3.5-plus, qwen-turbo, qwen3-max）
* OpenAI兼容API接口

### 第三方服务

* 高德地图API（IP定位、地理编码、距离计算）
* Haversine公式（本地距离计算）

---

## 五、系统功能模块

### 1️⃣ 首页模块

* 系统功能导航
* 热门旅游地区推荐
* 热门低空视频推荐
* 最新信息展示
* 数据概览统计
* 基于IP的周边目的地推荐
* 管理员精选目的地

---

### 2️⃣ 旅游目的地管理模块

接口：

```
GET     /api/destinations/
POST    /api/destinations/
PUT     /api/destinations/{id}/
DELETE  /api/destinations/{id}/
GET     /api/destinations/hot/           # 热门目的地
GET     /api/destinations/nearby_by_ip/  # IP周边推荐
GET     /api/destinations/smart_recommend/ # 智能推荐
GET     /api/destinations/homepage_modules/ # 首页模块
GET     /api/destinations/cities/        # 城市列表
```

功能：

* 目的地增删改查
* 国内/国外目的地分类
* 多维度筛选（城市、热门、推荐类型）
* 图片画廊（最多5张图片）
* 评分与浏览量统计
* 智能推荐算法（综合评分+时间衰减）
* 基于IP的地理位置推荐
* 目的地详情展示

---

### 3️⃣ 政策法规管理模块

接口：

```
GET     /api/policies/
POST    /api/policies/
PUT     /api/policies/{id}/
DELETE  /api/policies/{id}/
```

功能：

* 新增 / 修改 / 删除
* 分类展示
* 搜索
* 详情查看
* 浏览次数统计

---

### 4️⃣ 新闻资讯管理模块

接口：

```
GET     /api/news/
POST    /api/news/
GET     /api/news/{id}/
POST    /api/news/{id}/increment_views/  # 增加浏览量
```

功能：

* 新闻发布
* 分类筛选
* 详情页展示
* 浏览量统计

---

### 5️⃣ 安全隐患预警模块

接口：

```
GET     /api/safety-alerts/
POST    /api/safety-alerts/
PUT     /api/safety-alerts/{id}/
DELETE  /api/safety-alerts/{id}/
```

功能：

* 隐患上报
* 风险等级管理（高/中/低）
* 状态更新（待处理/处理中/已解决）
* 分类筛选
* 预防措施与应急预案

---

### 6️⃣ 互动交流模块

接口：

```
GET     /api/messages/
POST    /api/messages/
PUT     /api/messages/{id}/
DELETE  /api/messages/{id}/
GET     /api/message-comments/
POST    /api/message-comments/
POST    /api/messages/{id}/like/          # 点赞
```

功能：

* 用户留言提交
* 用户点赞评论
* 官方留言回复
* 状态管理（待回复/已回复）
* 屏蔽功能
* 评论系统

---

### 7️⃣ 数据统计模块

接口：

```
GET     /api/statistics/
POST    /api/statistics/
PUT     /api/statistics/{id}/
DELETE  /api/statistics/{id}/
```

功能：

* 信息数量统计
* 分类统计
* 图表可视化（ECharts）
* 按地区和年份统计

---

### 8️⃣ 用户认证与管理模块

接口：

```
POST    /api/auth/register/              # 注册
POST    /api/auth/login/                 # 登录
POST    /api/auth/logout/                # 登出
GET     /api/auth/me/                    # 获取当前用户信息
POST    /api/user/change_password/       # 修改密码
POST    /api/user/update_profile/        # 更新个人信息
POST    /api/user/{id}/reset_password/   # 管理员重置密码
```

功能：

* 用户注册与登录
* Token认证
* 个人信息修改（昵称、邮箱、手机号、用户名）
* 密码修改
* 用户名修改限制（60天内最多2次）
* 基于IP的自动位置定位
* 管理员用户管理
* 账号冻结功能

---

### 9️⃣ 管理后台模块化架构

**架构特点：**

* **动态加载**：通过AJAX按需加载模块HTML片段，减少首屏加载时间
* **Hash路由**：支持浏览器前进/后退按钮，URL自动同步模块状态
* **命名空间隔离**：每个模块独立命名空间（AdminApp.Modules.XXX），避免全局污染
* **懒加载机制**：富文本编辑器仅在需要时初始化，提升性能
* **缓存策略**：localStorage缓存表单数据，防止意外刷新丢失
* **统一接口**：所有模块遵循统一的init()初始化规范

**模块列表：**

| 模块名称 | URL Hash | 模板文件 | 脚本文件 | 功能描述 |
|---------|----------|---------|---------|--------|
| 政策法规 | `#policy` | `admin_modules/policy.html` | `admin_modules/policy.js` | 政策法规增删改查 |
| 新闻资讯 | `#news` | `admin_modules/news.html` | `admin_modules/news.js` | 新闻发布与管理 |
| 安全隐患 | `#safety` | `admin_modules/safety.html` | `admin_modules/safety.js` | 安全隐患预警管理 |
| 旅游目的地 | `#destination` | `admin_modules/destination.html` | `admin_modules/destination.js` | 目的地维护与推荐 |
| 统计数据 | `#statistics` | `admin_modules/statistics.html` | `admin_modules/statistics.js` | 数据统计录入 |
| 留言管理 | `#message` | `admin_modules/message.html` | `admin_modules/message.js` | 用户留言回复 |
| 用户管理 | `#user` | `admin_modules/user.html` | `admin_modules/user.js` | 用户信息管理 |

**技术实现：**

```javascript
// 模块加载流程
AdminApp.loadModule('policy')
  ↓
1. 显示加载动画
  ↓
2. AJAX请求: GET /api/admin/module/policy/
  ↓
3. 插入HTML到容器
  ↓
4. 更新URL: window.history.pushState({}, '', '#policy')
  ↓
5. 调用模块初始化: AdminApp.Modules.Policy.init()
  ↓
6. 绑定事件、加载数据、初始化编辑器
```

---

### 🔟 AI智能助手模块

接口：

```
POST    /api/ai/chat/                    # AI对话
POST    /api/ai/clear_history/           # 清空对话历史
```

功能：

* 多轮对话支持
* 数据库智能查询（自然语言转SQL）
* 深度思考模式
* 对话历史管理
* 多种模型切换（Plus/Turbo/Max）
* 系统提示词定制
* 工具调用能力（数据库查询、数据分析等）

---

## 六、数据库设计

### 主要数据模型

| 模型名称         | 说明         | 表名             |
| -------------- | ---------- | -------------- |
| User           | 用户信息       | users          |
| ChinaCity      | 中国城市经纬度    | china_cities   |
| Destination    | 旅游目的地      | destinations   |
| Policy         | 政策法规       | policies       |
| News           | 新闻资讯       | news           |
| SafetyAlert    | 安全隐患       | safety_alerts  |
| Message        | 留言反馈       | messages       |
| MessageComment | 留言评论       | message_comments |
| MessageLike    | 留言点赞       | message_likes  |
| MediaFile      | 媒体文件管理     | media_files    |
| Statistic      | 统计数据       | statistics     |

### 核心字段说明

#### User（用户模型）
```python
username = CharField(max_length=150, unique=True)
nickname = CharField(max_length=50, blank=True, null=True)
email = EmailField(blank=True, null=True)
phone = CharField(max_length=11, blank=True, null=True)
avatar = URLField(blank=True, null=True)
bio = TextField(blank=True, null=True)
country = CharField(max_length=100, default='中国')
province = CharField(max_length=100, blank=True, null=True)
city = CharField(max_length=100, blank=True, null=True)
latitude = FloatField(blank=True, null=True)
longitude = FloatField(blank=True, null=True)
last_login_ip = CharField(max_length=45, blank=True, null=True)
username_change_count = IntegerField(default=0)
last_username_change_at = DateTimeField(blank=True, null=True)
created_at = DateTimeField(auto_now_add=True)
```

#### Destination（旅游目的地）
```python
name = CharField(max_length=200)
city = CharField(max_length=100)
location = CharField(max_length=200)
state = CharField(max_length=100, blank=True, null=True)
country = CharField(max_length=100, default='中国')
is_domestic = BooleanField(default=True)
description = TextField()
cover_image = ImageField(upload_to='destination/', blank=True, null=True)
gallery_image_1~4 = ImageField(...)  # 4张展示图片
category = CharField(max_length=100)
price_range = CharField(max_length=100)
duration = CharField(max_length=100)
best_season = CharField(max_length=100)
features = JSONField(default=list)
rating = FloatField(default=5.0)
views = IntegerField(default=0)
is_hot = BooleanField(default=False)
is_featured = BooleanField(default=False)
recommendation_type = JSONField(default=list)  # ['default', 'nearby', 'managed', 'selected']
sort_order = PositiveIntegerField(default=0)
publish_date = DateTimeField(null=True, blank=True)
created_at = DateTimeField(auto_now_add=True)
updated_at = DateTimeField(auto_now=True)
```

#### MediaFile（媒体文件管理 - 哈希去重）
```python
file_hash = CharField(max_length=64, unique=True)  # SHA256
file_path = CharField(max_length=500)
file_name = CharField(max_length=255)
file_size = IntegerField()
mime_type = CharField(max_length=100, blank=True, null=True)
reference_count = IntegerField(default=0)  # 引用计数
is_deleted = BooleanField(default=False)
created_at = DateTimeField(auto_now_add=True)
updated_at = DateTimeField(auto_now=True)
```

### 数据库特性

* **自定义用户模型**：继承AbstractUser，扩展位置信息和用户名修改追踪
* **JSONField支持**：用于存储标签、特色亮点、推荐类型等多值字段
* **外键关联**：Message-User, MessageComment-Message, MessageLike-Message
* **唯一约束**：MediaFile.file_hash, MessageLike(message, user), Statistic(region, year)
* **索引优化**：city, state, file_hash等常用查询字段建立索引
* **信号处理**：Destination删除时自动释放MediaFile引用计数

---

## 七、项目文件结构

```bash
tourism_system/
│
├── manage.py                          # Django管理脚本
├── db.sqlite3                         # SQLite数据库文件
├── start.bat                          # Windows启动脚本
├── README.md                          # 项目说明文档
│
├── tourism_system/                    # 项目配置目录
│   ├── __init__.py
│   ├── settings.py                    # 项目配置（数据库、中间件、REST Framework等）
│   ├── urls.py                        # 主URL路由
│   ├── views.py                       # 视图函数
│   ├── asgi.py                        # ASGI配置
│   └── wsgi.py                        # WSGI配置
│
├── api/                               # 核心应用
│   ├── migrations/                    # 数据库迁移文件
│   │   ├── 0001_initial.py
│   │   ├── 0002_mediafile.py
│   │   ├── 0003_user_username_tracking.py
│   │   └── 0004_destination_publish_date.py
│   ├── management/
│   │   └── commands/
│   │       └── cleanup_orphaned_files.py  # 清理孤立文件命令
│   ├── __init__.py
│   ├── admin.py                       # Django Admin配置
│   ├── apps.py                        # 应用配置
│   ├── models.py                      # 数据模型定义（11个模型）
│   ├── serializers.py                 # DRF序列化器
│   ├── views.py                       # API视图（约1654行）
│   ├── urls.py                        # API路由配置
│   ├── fetchers.py                    # 数据获取工具
│   ├── utils.py                       # 通用工具函数（IP解析等）
│   ├── media_manager.py               # 媒体文件管理器（哈希去重）
│   └── tests.py                       # 测试文件
│
├── ai/                                # AI智能助手模块
│   ├── __init__.py
│   ├── ai.py                          # AI核心逻辑（约17KB）
│   ├── ai_tools.py                    # AI工具函数（约14KB）
│   ├── config.py                      # AI配置（阿里云API密钥、模型参数）
│   ├── db_tools.py                    # 数据库查询工具（约13KB）
│   ├── display_handler.py             # 显示处理器
│   └── system_prompt.txt              # 系统提示词
│
├── templates/                         # HTML模板
│   ├── index.html                     # 首页
│   ├── destinations.html              # 目的地列表
│   ├── destination-detail.html        # 目的地详情
│   ├── policies.html                  # 政策法规
│   ├── policy-detail.html             # 政策详情
│   ├── news.html                      # 新闻资讯
│   ├── news-detail.html               # 新闻详情
│   ├── safety.html                    # 安全隐患
│   ├── community.html                 # 互动社区
│   ├── statistics.html                # 数据统计
│   ├── profile.html                   # 个人主页
│   ├── auth.html                      # 登录注册
│   ├── admin.html                     # 管理后台主容器（解耦架构）
│   ├── admin_login.html               # 管理员登录
│   └── admin_modules/                 # 管理后台模块（动态加载）
│       ├── policy.html                # 政策法规模块
│       ├── news.html                  # 新闻资讯模块
│       ├── safety.html                # 安全隐患模块
│       ├── destination.html           # 旅游目的地模块
│       ├── statistics.html            # 统计数据模块
│       ├── message.html               # 留言管理模块
│       └── user.html                  # 用户管理模块
│
├── static/                            # 静态文件
│   ├── css/
│   │   └── style.css                  # 全局样式
│   ├── js/
│   │   ├── main.js                    # 主JavaScript文件
│   │   ├── api.js                     # API请求封装
│   │   ├── auth.js                    # 认证相关
│   │   ├── auth-modal.js              # 认证模态框
│   │   ├── home-new.js                # 首页逻辑
│   │   ├── destinations.js            # 目的地页面
│   │   ├── destination-detail.js      # 目的地详情
│   │   ├── news.js                    # 新闻页面
│   │   ├── news-detail.js             # 新闻详情
│   │   ├── policies.js                # 政策页面
│   │   ├── policy-detail.js           # 政策详情
│   │   ├── safety.js                  # 安全页面
│   │   ├── community.js               # 社区页面
│   │   ├── statistics.js              # 统计页面
│   │   ├── profile.js                 # 个人主页
│   │   ├── admin.js                   # 管理后台核心控制器（模块化架构）
│   │   ├── ai-chat.js                 # AI聊天界面
│   │   ├── utils.js                   # 工具函数
│   │   ├── fetchers.js                # 数据获取
│   │   ├── wangeditor-init.js         # WangEditor初始化
│   │   ├── ckeditor-*.js              # CKEditor相关文件
│   │   └── admin_modules/             # 管理后台功能模块（解耦设计）
│   │       ├── policy.js              # 政策法规模块逻辑
│   │       ├── news.js                # 新闻资讯模块逻辑
│   │       ├── safety.js              # 安全隐患模块逻辑
│   │       ├── destination.js         # 旅游目的地模块逻辑
│   │       ├── statistics.js          # 统计数据模块逻辑
│   │       ├── message.js             # 留言管理模块逻辑
│   │       └── user.js                # 用户管理模块逻辑
│   └── images/                        # 图片资源
│       ├── AI-icon.png
│       ├── favicon.ico
│       └── ...                        # 其他图标文件
│
├── media/                             # 媒体文件上传目录
│   ├── avatar/                        # 用户头像
│   ├── destination/                   # 目的地图片
│   ├── destination/             # 目的地展示图片
│   ├── news/                          # 新闻图片
│   ├── policy/                        # 政策图片
│   ├── safety/                        # 安全图片
│   └── temp/                          # 临时文件
│
└── sql/                               # SQL文件
    └── low_altitude_tourism.sql       # 数据库导出文件
```

---

## 八、管理后台模块化架构

### 8.1 架构设计理念

管理后台采用**前后端分离 + 模块化加载**的设计模式，彻底解耦各个功能模块：

#### 核心优势

1. **低耦合度**：每个模块独立开发、测试和维护
2. **高内聚性**：模块内部逻辑集中，职责明确
3. **按需加载**：减少首屏加载时间，提升性能
4. **易于扩展**：新增模块只需添加JS+HTML文件
5. **状态管理**：Hash路由支持浏览器历史记录
6. **容错性强**：单个模块失败不影响其他模块

### 8.2 技术实现

#### 后端视图函数

```python
# tourism_system/views.py
def admin_module_loader(request, module_name):
    """动态加载管理后台模块HTML片段"""
    module_templates = {
        'policy': 'admin_modules/policy.html',
        'news': 'admin_modules/news.html',
        'safety': 'admin_modules/safety.html',
        'destination': 'admin_modules/destination.html',
        'statistics': 'admin_modules/statistics.html',
        'message': 'admin_modules/message.html',
        'user': 'admin_modules/user.html',
    }
    template_path = module_templates.get(module_name)
    return render(request, template_path)
```

#### 前端模块加载器

```javascript
// static/js/admin.js
const AdminApp = {
    // 加载模块
    async loadModule(moduleName) {
        // 1. 显示加载动画
        // 2. AJAX获取模块HTML
        const response = await fetch(`/api/admin/module/${moduleName}/`);
        const html = await response.text();
        
        // 3. 插入HTML到容器
        container.innerHTML = html;
        
        // 4. 更新URL Hash（支持浏览器返回）
        window.history.pushState({ module: moduleName }, '', `#${moduleName}`);
        
        // 5. 调用模块初始化函数
        await this.initModule(moduleName);
    }
}
```

### 8.3 模块规范

#### 模块文件结构

每个模块包含两个文件：
- **模板文件**：`templates/admin_modules/{module}.html`
- **脚本文件**：`static/js/admin_modules/{module}.js`

#### 模块初始化规范

所有模块必须实现统一的`init()`方法：

```javascript
AdminApp.Modules.Policy = {
    async init() {
        // 1. 绑定事件监听器
        this.bindEvents();
        
        // 2. 加载初始数据
        await this.loadData();
        
        // 3. 初始化富文本编辑器（如需要）
        await this.initEditor();
        
        // 4. 恢复缓存数据（如需要）
        this.restoreCache();
    }
}
```

### 8.4 Hash路由机制

#### URL状态管理

- **模块选择器页面**：`/admin-page/`（无hash）
- **政策法规模块**：`/admin-page/#policy`
- **新闻资讯模块**：`/admin-page/#news`
- **安全隐患模块**：`/admin-page/#safety`
- **旅游目的地模块**：`/admin-page/#destination`
- **统计数据模块**：`/admin-page/#statistics`
- **留言管理模块**：`/admin-page/#message`
- **用户管理模块**：`/admin-page/#user`

#### 浏览器导航支持

```javascript
// 监听浏览器前进/后退按钮
window.addEventListener('popstate', (event) => {
    const hash = window.location.hash.replace('#', '');
    if (hash && AdminApp.modules[hash]) {
        AdminApp.loadModule(hash);  // 加载对应模块
    } else {
        AdminApp.showModuleSelector();  // 显示模块选择器
    }
});
```

### 8.5 缓存管理策略

#### 缓存类型

1. **表单数据缓存**：localStorage保存未提交的表单内容
2. **编辑器状态缓存**：富文本编辑器内容和图片上传状态
3. **列表数据缓存**：已加载的数据列表（可选）

#### 缓存操作

```javascript
// 保存到缓存
AdminApp.saveToCache('policy-form', formData);

// 读取缓存
const cachedData = AdminApp.loadFromCache('policy-form');

// 清除模块缓存
AdminApp.clearModuleCache('policy');

// 清除所有缓存
AdminApp.clearAllCache();
```

### 8.6 模块间通信

#### 全局命名空间

```javascript
// 主应用对象
AdminApp.currentModule        // 当前加载的模块名称
AdminApp.modules              // 模块配置信息
AdminApp.Modules.Policy       # 政策法规模块
AdminApp.Modules.News         # 新闻资讯模块
AdminApp.Modules.Safety       # 安全隐患模块
// ... 其他模块
```

#### 通用工具方法

```javascript
// 模态框管理
const replyModal = new Modal('reply-modal');
replyModal.open();
replyModal.close();

// 通知提示
showNotification('操作成功', 'success');
showNotification('操作失败', 'error');

// 认证检查
auth.isAuthenticated();
auth.getUser();
auth.getCurrentUser();
```

---

## 九、系统运行环境

### 开发环境

* Windows 11 / macOS / Linux
* PyCharm / VS Code
* Python 3.10+
* Django 6.0

### 依赖安装

```bash
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 安装依赖
pip install django djangorestframework django-cors-headers requests pillow
```

### 运行步骤

```bash
# 1. 数据库迁移
python manage.py makemigrations
python manage.py migrate

# 2. 创建超级用户（可选）
python manage.py createsuperuser

# 3. 启动开发服务器
python manage.py runserver
```

访问：

```
http://127.0.0.1:8000/
```

### 环境变量配置

在 `ai/config.py` 中配置阿里云API密钥：

```python
QIANWEN_API_KEY = "your-api-key-here"
QIANWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
```

在 `settings.py` 中配置数据库（如需使用MySQL）：

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'low_altitude_tourism',
        'USER': 'root',
        'PASSWORD': 'your-password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### 高德地图API配置

在 `api/views.py` 的 `nearby_by_ip` 方法中配置高德地图API密钥：

```python
amap_key = 'your-amap-api-key'
```

---

## 十、AI智能助手功能

### 核心特性

* **多轮对话支持**：保持上下文记忆，提供连贯的对话体验
* **自然语言查询数据库**：用户可以用自然语言提问，AI自动转换为SQL查询
* **多模型协同**：
  - qwen3.5-plus：默认助手，负责日常对话和问题理解
  - qwen-turbo：数据库查询专用，速度最快
  - qwen3-max：深度思考模式，用于复杂分析
* **工具调用能力**：
  - 数据库查询工具（db_tools.py）
  - 数据分析工具
  - 信息检索工具
* **智能回答生成**：结合查询结果和上下文生成自然语言回答
* **对话历史管理**：支持清空历史记录

### 使用场景

1. **信息查询**："帮我查询北京的旅游目的地有哪些？"
2. **数据分析**："统计一下各省份的旅游收入情况"
3. **政策咨询**："最新的低空旅游政策是什么？"
4. **安全建议**："低空飞行需要注意哪些安全问题？"
5. **行程规划**："推荐一个适合周末的低空旅游线路"

### 技术实现

* 基于阿里云百炼平台的OpenAI兼容API
* 系统提示词定制（system_prompt.txt）
* 函数调用（Function Calling）机制
* 流式响应支持
* 错误处理与重试机制

---

## 十一、项目创新点

* **前后端分离架构**：RESTful API标准化设计，便于扩展和维护
* **管理后台完全解耦**：模块化设计，动态加载，Hash路由，低耦合高内聚
* **AI智能助手集成**：接入阿里云通义千问，支持自然语言数据库查询
* **智能推荐算法**：基于综合评分+时间衰减的目的地推荐系统
* **地理位置服务**：
  - IP自动定位（高德地图API）
  - 基于位置的周边推荐
  - Haversine公式本地距离计算
  - 城市经纬度数据库缓存
* **媒体文件哈希去重**：SHA256哈希+引用计数，节省存储空间
* **模块化开发结构**：清晰的代码组织，易于维护和扩展
* **Django ORM自动迁移管理**：数据库版本控制
* **数据可视化统计**：ECharts图表展示
* **安全隐患风险分级设计**：高/中/低三级风险管理
* **用户名修改限制**：60天内最多修改2次，防止滥用
* **Session位置缓存**：未登录用户也能享受位置服务，24小时有效期
* **多认证方式支持**：用户名/邮箱/手机号登录
* **点赞评论系统**：完整的社交互动功能
* **懒加载优化**：富文本编辑器按需初始化，提升性能
* **缓存防丢失**：localStorage自动保存表单数据，防止意外刷新丢失

---

## 十二、系统不足与优化方向

### 当前不足

* 前端仍使用传统HTML+JS，交互体验有待提升
* 未部署到云服务器，仅限本地运行
* 图片压缩和CDN加速未实现
* 搜索引擎优化（SEO）不足
* 缺少移动端适配优化
* 单元测试覆盖率较低

### 优化方向

* **前端重构**：引入Vue 3或React框架，提升用户体验
* **云端部署**：部署到阿里云/腾讯云，配置域名和HTTPS
* **性能优化**：
  - 实现Redis缓存
  - 数据库查询优化（索引、分页）
  - 图片压缩和懒加载
  - CDN加速静态资源
* **SEO优化**：服务端渲染（SSR）或预渲染
* **移动端适配**：响应式设计优化，开发原生App
* **测试完善**：编写单元测试、集成测试
* **功能扩展**：
  - 在线预订功能
  - 支付系统集成
  - 实时消息推送
  - 多语言支持
  - 更多AI应用场景

---

## 十三、数据库导出与导入

### SQLite导出与导入

```bash
# 导出为SQL文件（需要安装sqlite3工具）
sqlite3 db.sqlite3 .dump > backup.sql

# 导入SQL文件
sqlite3 db.sqlite3 < backup.sql
```

### MySQL导出与导入

```bash
# 导出
mysqldump -u root -p low_altitude_tourism > low_altitude_tourism.sql

# 导入
mysql -u root -p low_altitude_tourism < low_altitude_tourism.sql
```

### Django Fixture方式

```bash
# 导出所有数据
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > fixture.json

# 导入数据
python manage.py loaddata fixture.json
```

---

## 十四、总结

本系统完整实现了低空旅游安全信息管理功能，并创新性地集成了AI智能助手和管理后台模块化架构。

通过本项目掌握：

* Django项目结构与最佳实践
* RESTful API设计规范与实现
* 前后端数据交互机制（Fetch API + Token认证）
* 数据库建模方法与ORM使用
* Web系统完整开发流程
* AI大模型集成与应用（阿里云通义千问）
* 地理位置服务开发（高德地图API + Haversine公式）
* 媒体文件管理与哈希去重技术
* 智能推荐算法设计与实现
* 用户认证与权限管理
* 数据可视化展示（ECharts）
* **模块化前端架构设计**：动态加载、Hash路由、命名空间隔离
* **高内聚低耦合开发理念**：模块独立、职责清晰、易于维护
* **懒加载与缓存优化**：提升性能、改善用户体验

系统具有较强扩展性与实践应用价值，为低空旅游行业提供了完整的信息管理解决方案。
