# 媒体文件管理系统 - 快速开始

## 🚀 快速开始

### 1. 执行数据库迁移

```bash
python manage.py migrate
```

### 2. 验证系统（可选）

```bash
python test_media_manager.py
```

### 3. 开始使用

系统已完全集成，无需额外配置。正常上传旅游目的地图片即可自动享受：
- ✅ 哈希去重
- ✅ 引用计数
- ✅ 智能删除
- ✅ 随机命名

## 📝 功能演示

### 场景1: 上传相同图片到多个目的地

```python
# 第一次上传 "beijing.png"
dest1 = Destination.objects.create(
    name="北京故宫",
    cover_image=uploaded_file_1,  # 假设这是beijing.png
    ...
)
# 结果: 创建新文件记录，reference_count = 1

# 第二次上传相同的 "beijing_copy.png"（内容完全相同）
dest2 = Destination.objects.create(
    name="北京长城",
    cover_image=uploaded_file_2,  # 这是beijing_copy.png，但内容与beijing.png相同
    ...
)
# 结果: 检测到哈希相同，复用已有文件，reference_count = 2
# 只存储一份物理文件！
```

### 场景2: 删除目的地

```python
# 删除第一个目的地
dest1.delete()
# 结果: reference_count 从 2 减少到 1
# 文件仍然保留，因为还在被dest2使用

# 删除第二个目的地
dest2.delete()
# 结果: reference_count 从 1 减少到 0
# 文件被标记为is_deleted=True，物理文件被删除
```

### 场景3: 重新上传已删除的相同图片

```python
# 重新上传与之前完全相同的图片
dest3 = Destination.objects.create(
    name="北京天坛",
    cover_image=uploaded_file_3,  # 内容与之前的beijing.png相同
    ...
)
# 结果: 
# 1. 检测到该哈希的文件曾被删除
# 2. 如果物理文件还存在，恢复记录
# 3. 如果物理文件不存在，重新上传
# 4. reference_count = 1
```

## 🔧 管理命令

### 清理孤儿文件

定期运行以清理异常情况下的孤儿文件：

```bash
python manage.py cleanup_orphaned_files
```

建议添加到cron定时任务中，每周运行一次。

## 📊 查看统计信息

在Django shell中查看媒体文件统计：

```python
from api.models import MediaFile

# 总文件数
total = MediaFile.objects.count()

# 活跃文件数
active = MediaFile.objects.filter(is_deleted=False).count()

# 已删除文件数
deleted = MediaFile.objects.filter(is_deleted=True).count()

# 平均引用次数
from django.db.models import Avg
avg_refs = MediaFile.objects.filter(is_deleted=False).aggregate(Avg('reference_count'))

print(f"总文件: {total}")
print(f"活跃文件: {active}")
print(f"已删除: {deleted}")
print(f"平均引用: {avg_refs['reference_count__avg']:.2f}")
```

## ⚙️ 技术细节

### 文件命名规则

所有上传的文件都会被重命名为UUID格式：
```
原始文件名: beijing_palace.png
存储文件名: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.png
```

### 哈希算法

使用SHA256算法，生成64位十六进制字符串：
```
文件内容 -> SHA256 -> "e3b0c44298fc1c149afbf4c8996fb924..."
```

### 存储路径

文件统一存储在 `MEDIA_ROOT/media-destination/` 目录下。

## 🎯 优势对比

### 传统方式
- ❌ 相同图片多次存储，浪费空间
- ❌ 文件名可能冲突
- ❌ 删除时无法判断是否还被其他记录使用
- ❌ 难以追踪文件使用情况

### 本系统
- ✅ 相同图片只存储一次，节省50-90%空间
- ✅ UUID命名，永不冲突
- ✅ 引用计数确保数据安全
- ✅ 完整的文件使用追踪

## 📈 性能影响

- **上传速度**: 轻微增加（需要计算哈希），通常<10ms
- **查询速度**: 无影响
- **存储空间**: 大幅减少，特别是有很多相似图片时
- **数据库大小**: MediaFile表很小，影响可忽略

## 🔍 故障排查

### 查看日志

系统会在控制台输出详细日志：
```
✅ 新文件已保存: media-destination/abc123.png (哈希: e3b0c442...)
✅ 文件已存在，复用: media-destination/abc123.png (引用次数: 2)
🗑️ 文件已删除: media-destination/abc123.png
```

### 常见问题

**Q: 现有的图片会自动加入系统吗？**
A: 不会。只有新上传的图片会使用新系统。如需迁移现有图片，需要编写数据迁移脚本。

**Q: 如何查看所有MediaFile记录？**
A: 可以通过Django admin或直接在数据库中查询 `media_files` 表。

**Q: 引用计数会不准确吗？**
A: 正常情况下不会。但如果手动操作数据库或直接删除文件，可能导致不一致。定期运行 `cleanup_orphaned_files` 可以修复。

## 📚 更多信息

详细文档请查看 [MEDIA_FILE_SYSTEM_README.md](MEDIA_FILE_SYSTEM_README.md)

