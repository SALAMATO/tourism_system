基于 Django 的低空旅游安全信息管理系统
Graduation Project – Low-altitude Tourism Safety Information Management System

一、项目简介
本项目基于 Python + Django + Django REST Framework 开发，实现了一个低空旅游安全信息管理系统。
系统围绕低空旅游行业发展需求，构建了政策法规管理、新闻资讯发布、安全隐患预警、互动交流及数据统计分析等功能模块。
项目采用 前后端分离架构，前端使用 HTML + CSS + JavaScript 实现页面展示与交互，后端使用 Django 提供 RESTful API，实现数据的统一管理与持久化存储。
本项目使用了Tailwind CSS以及Apple的配色方案，使用极简风格设计，加入毛玻璃、动态阴影等效果，网站显得十分简洁大气
具体的配色方案参考如以下网站：
https://developer.apple.com/cn/design/human-interface-guidelines/color


二、项目背景与研究意义

随着低空经济的快速发展，低空旅游逐渐成为新兴旅游形态。
然而在实际发展过程中存在：
政策信息分散
安全隐患管理不足
数据统计不直观
信息交互效率低
本系统旨在构建一个集信息管理、数据统计、安全预警与互动交流于一体的综合平台，提高低空旅游安全信息管理效率。

三、系统总体架构
技术架构图
浏览器（前端页面）
Tailwind CSS+HTML
    │
    │ Fetch API（JSON）
    ↓
Django REST Framework（后端API）
    │
    ↓
MySQL 数据库

四、技术栈
后端技术
Python 3.x
Django 6.0
Django REST Framework
MySQL 数据库
Django ORM
前端技术
HTML5
JavaScript (ES6)
Fetch API
ECharts 数据可视化
React
Tailwind CSS4.2

五、系统功能模块
1️⃣ 首页模块
系统功能导航
最新信息展示
数据概览统计

2️⃣ 政策法规管理模块
政策新增 / 修改 / 删除
分类展示
搜索功能
详情查看

接口示例：
GET     /api/policies/
POST    /api/policies/
PUT     /api/policies/{id}/
DELETE  /api/policies/{id}/

3️⃣ 新闻资讯管理模块
新闻发布
新闻列表展示
分类筛选
新闻详情页

接口示例：
GET     /api/news/
POST    /api/news/
GET     /api/news/{id}/

4️⃣ 安全隐患预警模块
隐患上报
风险等级管理
状态更新
分类筛选

接口示例：
GET     /api/safety-alerts/
POST    /api/safety-alerts/

5️⃣ 互动交流模块
用户留言提交
留言回复
状态管理

接口示例：
GET     /api/messages/
POST    /api/messages/

6️⃣ 数据统计模块
信息数量统计
分类统计
可视化图表展示

六、数据库设计

主要数据模型：
模型名称	说明
Policy	政策法规
News	新闻资讯
SafetyAlert	安全隐患
Message	留言反馈
Statistic	统计数据

示例字段：
title = models.CharField(max_length=200)
content = models.TextField()
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)

数据库采用 Django ORM 自动迁移管理。

七、项目文件结构
tourism_system/
│
├── manage.py
│
├── tourism_system/                # 主项目配置
│   ├── __init__.py
│   ├── settings.py                # 项目配置
│   ├── urls.py                    # 主路由
│   ├── asgi.py
│   └── wsgi.py
│
├── api/                           # 核心业务应用
│   ├── migrations/
│   ├── __init__.py
│   ├── admin.py                   # 后台注册
│   ├── apps.py
│   ├── models.py                  # 数据模型
│   ├── serializers.py             # 序列化器
│   ├── views.py                   # API视图
│   ├── urls.py                    # API路由
│   └── tests.py
│
├── templates/                     # 前端页面
│   ├── index.html
│   ├── policies.html
│   ├── news.html
│   ├── news-detail.html
│   ├── safety.html
│   ├── community.html
│   ├── statistics.html
│   └── admin.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       ├── policies.js
│       ├── news.js
│       ├── safety.js
│       ├── community.js
│       ├── statistics.js
│       └── admin.js
│
├── db.sqlite3
└── README.md


八、系统运行环境
开发环境
Windows 10
PyCharm
Python 3.x

运行步骤
python -m venv .venv
.venv\Scripts\activate
pip install django djangorestframework
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
访问地址：
http://127.0.0.1:8000/

或者直接运行run.bat文件

九、项目创新点
采用前后端分离架构
RESTful API 标准设计
模块化开发结构
Django ORM 自动数据库管理
数据可视化统计分析
安全隐患风险分级设计

十、系统不足与优化方向

增加用户登录认证（JWT）
增加权限分级控制
部署至云服务器
引入 Vue/React 优化前端体验

十一、总结

本系统完整实现了低空旅游安全信息的管理与展示功能。
通过本项目开发，掌握了：
Django 项目结构
RESTful API 设计规范
前后端数据交互机制
数据库建模方法
Web 系统整体开发流程
该系统具有较强的扩展性和实践应用价值。