"""
媒体文件管理工具类
实现基于哈希的文件去重、引用计数管理和智能删除功能
"""
import hashlib
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import MediaFile


class MediaFileManager:
    """媒体文件管理器 - 处理文件上传、哈希去重、引用计数"""

    @staticmethod
    def calculate_file_hash(file_obj):
        """
        计算文件的SHA256哈希值
        
        Args:
            file_obj: Django UploadedFile对象或文件路径
            
        Returns:
            str: SHA256哈希值（64位十六进制字符串）
        """
        sha256_hash = hashlib.sha256()
        
        # 如果是文件对象，需要读取内容
        if hasattr(file_obj, 'read'):
            # 保存当前位置
            current_position = file_obj.tell()
            # 移动到文件开头
            file_obj.seek(0)
            
            # 分块读取文件，避免大文件占用过多内存
            for chunk in file_obj.chunks():
                sha256_hash.update(chunk)
            
            # 恢复到原来的位置
            file_obj.seek(current_position)
        elif isinstance(file_obj, str):
            # 如果是文件路径
            with open(file_obj, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()

    @staticmethod
    def generate_random_filename(original_filename):
        """
        生成随机文件名，保留原始扩展名
        
        Args:
            original_filename: 原始文件名
            
        Returns:
            str: 随机生成的文件名（UUID格式）
        """
        # 获取文件扩展名
        _, ext = os.path.splitext(original_filename)
        # 生成UUID作为文件名
        random_name = f"{uuid.uuid4().hex}{ext}"
        return random_name

    @staticmethod
    def find_existing_file(file_hash):
        """
        查找是否已存在相同哈希值的文件
        
        Args:
            file_hash: 文件哈希值
            
        Returns:
            MediaFile对象或None
        """
        try:
            return MediaFile.objects.get(file_hash=file_hash, is_deleted=False)
        except MediaFile.DoesNotExist:
            return None

    @staticmethod
    def save_file_with_deduplication(uploaded_file, upload_to='destination/'):
        """
        保存文件并进行哈希去重
        
        Args:
            uploaded_file: Django UploadedFile对象
            upload_to: 上传目录路径
            
        Returns:
            tuple: (MediaFile对象, 是否为新文件)
        """
        # 1. 计算文件哈希值
        file_hash = MediaFileManager.calculate_file_hash(uploaded_file)
        
        # 2. 检查是否已存在相同文件
        existing_file = MediaFileManager.find_existing_file(file_hash)
        
        if existing_file:
            # 文件已存在，增加引用计数
            existing_file.reference_count += 1
            existing_file.save(update_fields=['reference_count', 'updated_at'])
            print(f"✅ 文件已存在，复用: {existing_file.file_path} (引用次数: {existing_file.reference_count})")
            return existing_file, False
        
        # 3. 文件不存在，创建新文件
        # 生成随机文件名
        random_filename = MediaFileManager.generate_random_filename(uploaded_file.name)
        
        # 构建完整路径
        file_path = os.path.join(upload_to, random_filename)
        
        # 保存文件到存储系统
        saved_path = default_storage.save(file_path, ContentFile(uploaded_file.read()))
        
        # 获取文件大小
        file_size = uploaded_file.size
        
        # 获取MIME类型
        mime_type = uploaded_file.content_type if hasattr(uploaded_file, 'content_type') else None
        
        # 4. 创建数据库记录
        media_file = MediaFile.objects.create(
            file_hash=file_hash,
            file_path=saved_path,
            file_name=uploaded_file.name,
            file_size=file_size,
            mime_type=mime_type,
            reference_count=1  # 首次创建，引用计数为1
        )
        
        print(f"✅ 新文件已保存: {saved_path} (哈希: {file_hash[:16]}...)")
        return media_file, True

    @staticmethod
    def release_file_reference(media_file_or_hash):
        """
        释放文件引用（当删除关联记录时调用）
        
        Args:
            media_file_or_hash: MediaFile对象或文件哈希值
            
        Returns:
            bool: 是否成功释放
        """
        # 如果传入的是哈希值，先查询MediaFile对象
        if isinstance(media_file_or_hash, str):
            try:
                media_file = MediaFile.objects.get(file_hash=media_file_or_hash, is_deleted=False)
            except MediaFile.DoesNotExist:
                print(f"⚠️ 未找到文件记录: {media_file_or_hash}")
                return False
        else:
            media_file = media_file_or_hash
        
        # 减少引用计数
        media_file.reference_count -= 1
        
        # 如果引用计数 <= 0，标记为已删除并删除物理文件
        if media_file.reference_count <= 0:
            media_file.reference_count = 0
            media_file.is_deleted = True
            media_file.save(update_fields=['reference_count', 'is_deleted', 'updated_at'])
            
            # 删除物理文件
            try:
                if default_storage.exists(media_file.file_path):
                    default_storage.delete(media_file.file_path)
                    print(f"🗑️ 文件已删除: {media_file.file_path}")
            except Exception as e:
                print(f"❌ 删除物理文件失败: {str(e)}")
        else:
            media_file.save(update_fields=['reference_count', 'updated_at'])
            print(f"✅ 引用计数减少: {media_file.file_path} (剩余引用: {media_file.reference_count})")
        
        return True

    @staticmethod
    def get_file_url(media_file):
        """
        获取文件的URL地址
        
        Args:
            media_file: MediaFile对象
            
        Returns:
            str: 文件的完整URL
        """
        if not media_file or media_file.is_deleted:
            return ''
        
        try:
            return default_storage.url(media_file.file_path)
        except Exception as e:
            print(f"❌ 获取文件URL失败: {str(e)}")
            return ''

    @staticmethod
    def cleanup_orphaned_files():
        """
        清理孤儿文件（数据库中不存在但物理文件存在的文件）
        这个方法可以定期运行以清理异常情况下产生的孤儿文件
        """
        import glob
        
        # 获取所有上传目录中的文件
        upload_dirs = [
            os.path.join(settings.MEDIA_ROOT, 'destination'),
        ]
        
        cleaned_count = 0
        
        for upload_dir in upload_dirs:
            if not os.path.exists(upload_dir):
                continue
            
            # 遍历目录中的所有文件
            for file_path in glob.glob(os.path.join(upload_dir, '*')):
                if not os.path.isfile(file_path):
                    continue
                
                # 计算文件哈希
                file_hash = MediaFileManager.calculate_file_hash(file_path)
                
                # 检查数据库中是否存在
                try:
                    media_file = MediaFile.objects.get(file_hash=file_hash, is_deleted=False)
                    # 文件在数据库中存在，跳过
                except MediaFile.DoesNotExist:
                    # 文件在数据库中不存在，是孤儿文件
                    try:
                        os.remove(file_path)
                        print(f"🗑️ 清理孤儿文件: {file_path}")
                        cleaned_count += 1
                    except Exception as e:
                        print(f"❌ 清理孤儿文件失败 {file_path}: {str(e)}")
        
        print(f"✅ 清理完成，共删除 {cleaned_count} 个孤儿文件")
        return cleaned_count

    @staticmethod
    def restore_deleted_file(file_hash, original_file=None):
        """
        恢复之前删除的文件（如果重新上传相同的文件）
        
        Args:
            file_hash: 文件哈希值
            original_file: 原始文件对象（可选，如果提供则验证哈希）
            
        Returns:
            MediaFile对象或None
        """
        try:
            # 查找已删除的记录
            media_file = MediaFile.objects.get(file_hash=file_hash, is_deleted=True)
            
            # 如果提供了原始文件，验证哈希是否匹配
            if original_file:
                calculated_hash = MediaFileManager.calculate_file_hash(original_file)
                if calculated_hash != file_hash:
                    print(f"❌ 哈希值不匹配")
                    return None
            
            # 恢复记录
            media_file.is_deleted = False
            media_file.reference_count = 1
            media_file.save(update_fields=['is_deleted', 'reference_count', 'updated_at'])
            
            print(f"✅ 文件已恢复: {media_file.file_path}")
            return media_file
            
        except MediaFile.DoesNotExist:
            # 记录不存在，需要重新上传
            return None

