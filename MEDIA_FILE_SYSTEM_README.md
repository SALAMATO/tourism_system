# 媒体文件管理系统使用说明

## 功能概述

本系统实现了基于哈希去重的媒体文件管理，主要功能包括：

1. **哈希去重**：上传相同图片时自动检测并复用，节省存储空间
2. **引用计数**：记录每张图片被多少个目的地引用
3. **智能删除**：只有当引用计数为0时才真正删除物理文件
4. **随机命名**：所有上传的文件使用UUID随机命名，避免文件名冲突
5. **恢复机制**：重新上传已删除的相同文件时可以恢复记录

## 数据库表结构

### MediaFile 表

| 字段 | 类型 | 说明 |
|------|------|------|
| file_hash | CharField(64) | 文件的SHA256哈希值（唯一索引） |
| file_path | CharField(500) | 文件存储路径 |
| file_name | CharField(255) | 原始文件名 |
| file_size | IntegerField | 文件大小（字节） |
| mime_type | CharField(100) | MIME类型 |
| reference_count | IntegerField | 引用次数 |
| is_deleted | BooleanField | 是否已删除 |
| created_at | DateTimeField | 创建时间 |
| updated_at | DateTimeField | 更新时间 |

## 使用方法

### 1. 执行数据库迁移

```bash
python manage.py migrate
```

这将创建 `media_files` 表。

### 2. 上传图片（自动处理）

在创建或更新 Destination 时，系统会自动处理图片上传：

```python
# 通过API上传时，序列化器会自动调用MediaFileManager
# 无需手动调用
```

### 3. 清理孤儿文件

定期运行以下命令清理异常情况下产生的孤儿文件：

```bash
python manage.py cleanup_orphaned_files
```

### 4. 运行测试

验证系统功能是否正常：

```bash
python test_media_manager.py
```

## 工作原理

### 上传流程

1. 计算上传文件的SHA256哈希值
2. 查询数据库中是否存在相同哈希值的文件
3. 如果存在：
   - 增加引用计数
   - 返回已有文件的路径
4. 如果不存在：
   - 生成UUID随机文件名
   - 保存文件到存储系统
   - 创建MediaFile记录，引用计数设为1

### 删除流程

1. 当Destination被删除时，触发post_delete信号
2. 信号处理器找到关联的MediaFile记录
3. 减少引用计数
4. 如果引用计数 <= 0：
   - 标记is_deleted = True
   - 删除物理文件
5. 如果引用计数 > 0：
   - 只减少计数，保留文件

### 恢复流程

1. 重新上传相同哈希值的文件
2. 检测到该文件已被标记删除
3. 恢复记录：is_deleted = False, reference_count = 1
4. 如果物理文件不存在，则重新上传

## API集成

系统已完全集成到DestinationSerializer中：

- **create()**: 创建新目的地时自动处理图片
- **update()**: 更新目的地时处理新旧图片的引用计数
- **delete()**: 删除目的地时通过信号自动释放引用

## 优势

1. **节省存储空间**：相同图片只存储一次
2. **提高性能**：避免重复上传和存储
3. **数据安全**：引用计数确保不会误删正在使用的文件
4. **易于维护**：自动化管理，无需手动干预
5. **可追溯**：记录每个文件的引用情况

## 注意事项

1. 首次使用时，现有的图片不会自动加入MediaFile表
2. 建议定期运行 `cleanup_orphaned_files` 命令
3. 如果需要迁移现有图片，可以编写数据迁移脚本
4. 文件哈希计算采用SHA256，碰撞概率极低

## 故障排查

### 问题：图片上传失败

检查：
1. MEDIA_ROOT 目录是否有写权限
2. 数据库连接是否正常
3. 查看日志中的错误信息

### 问题：引用计数不正确

解决：
1. 检查是否有手动删除Destination的情况
2. 运行 `cleanup_orphaned_files` 清理异常数据
3. 检查代码中是否正确使用了MediaFileManager

### 问题：磁盘空间不足

解决：
1. 运行 `cleanup_orphaned_files` 清理孤儿文件
2. 检查是否有大量is_deleted=True的记录
3. 考虑增加磁盘空间或清理不需要的文件

## 扩展建议

1. 可以添加定时任务定期清理孤儿文件
2. 可以添加管理后台界面查看和管理媒体文件
3. 可以添加图片压缩功能进一步节省空间
4. 可以集成CDN加速图片访问
