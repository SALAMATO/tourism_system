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
* [八、系统运行环境](#八系统运行环境)
* [九、项目创新点](#九项目创新点)
* [十、系统不足与优化方向](#十系统不足与优化方向)
* [十一、数据库导出与导入](#十一数据库导出与导入)
* [十二、总结](#十二总结)

---

## 一、项目简介

本项目基于 **Python + Django + Django REST Framework** 开发，实现了一个低空旅游安全信息管理系统。

系统包含：

* 政策法规管理
* 新闻资讯发布
* 安全隐患预警
* 互动交流
* 数据统计分析

采用 **前后端分离架构**：

* 前端：HTML + Tailwind CSS + JavaScript
* 后端：Django REST Framework
* 数据库：MySQL

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

---

## 四、技术栈

### 后端技术

* Python 3.x
* Django 6.0
* Django REST Framework
* MySQL
* Django ORM

### 前端技术

* HTML5
* JavaScript (ES6)
* Fetch API
* ECharts
* React
* Tailwind CSS 4.2

---

## 五、系统功能模块

### 1️⃣ 首页模块

* 系统功能导航
* 最新信息展示
* 数据概览统计

---

### 2️⃣ 政策法规管理模块

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

---

### 3️⃣ 新闻资讯管理模块

接口：

```
GET     /api/news/
POST    /api/news/
GET     /api/news/{id}/
```

功能：

* 新闻发布
* 分类筛选
* 详情页展示

---

### 4️⃣ 安全隐患预警模块

接口：

```
GET     /api/safety-alerts/
POST    /api/safety-alerts/
```

功能：

* 隐患上报
* 风险等级管理
* 状态更新
* 分类筛选

---

### 5️⃣ 互动交流模块

接口：

```
GET     /api/messages/
POST    /api/messages/
```

功能：

* 用户留言提交
* 留言回复
* 状态管理

---

### 6️⃣ 数据统计模块

* 信息数量统计
* 分类统计
* 图表可视化

---

## 六、数据库设计

### 主要数据模型

| 模型名称        | 说明   |
| ----------- | ---- |
| Policy      | 政策法规 |
| News        | 新闻资讯 |
| SafetyAlert | 安全隐患 |
| Message     | 留言反馈 |
| Statistic   | 统计数据 |

示例字段：

```python
title = models.CharField(max_length=200)
content = models.TextField()
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
```

---

## 七、项目文件结构

```bash
tourism_system/
│
├── manage.py
│
├── tourism_system/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── api/
│   ├── migrations/
│   ├── admin.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│
├── templates/
│
├── static/
│
├── db.sqlite3
└── README.md
```

---

## 八、系统运行环境

### 开发环境

* Windows 10
* PyCharm
* Python 3.x

### 运行步骤

```bash
python -m venv .venv
.venv\Scripts\activate
pip install django djangorestframework
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

访问：

```
http://127.0.0.1:8000/
```

---

## 九、项目创新点

* 前后端分离架构
* RESTful API 标准化设计
* 模块化开发结构
* Django ORM 自动迁移管理
* 数据可视化统计
* 安全隐患风险分级设计

---

## 十、系统不足与优化方向

* 增加 JWT 用户认证
* 权限分级控制
* 云服务器部署
* 引入 Vue / React 优化前端

---

## 十一、数据库导出与导入

### 导出

```bash
mysqldump -u root -p tourism_system_db > db_dump.sql
```

### 导入

```bash
mysql -u root -p low_altitude_tourism < db_dump.sql
```

---

## 十二、总结

本系统完整实现了低空旅游安全信息管理功能。

通过本项目掌握：

* Django 项目结构
* RESTful API 设计规范
* 前后端数据交互机制
* 数据库建模方法
* Web 系统开发流程
具有较强扩展性与实践应用价值。


