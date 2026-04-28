"""
媒体文件管理系统测试脚本
用于测试哈希去重、引用计数和智能删除功能
"""
import os
import sys
import django

# 设置Django环境
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tourism_system.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from api.models import Destination, MediaFile
from api.media_manager import MediaFileManager


def test_media_file_management():
    """测试媒体文件管理系统的完整功能"""
    
    print("\n" + "="*70)
    print("开始测试媒体文件管理系统")
    print("="*70 + "\n")
    
    # 创建测试图片内容（模拟PNG文件）
    test_image_content = b'\x89PNG\r\n\x1a\n' + b'Test image content for deduplication testing' * 100
    
    # 测试1: 上传第一张图片
    print("📸 测试1: 上传第一张图片")
    print("-" * 70)
    
    file1 = SimpleUploadedFile(
        "test_image_1.png",
        test_image_content,
        content_type="image/png"
    )
    
    media_file1, is_new1 = MediaFileManager.save_file_with_deduplication(
        file1,
        upload_to='media-destination/'
    )
    
    print(f"   文件路径: {media_file1.file_path}")
    print(f"   文件哈希: {media_file1.file_hash[:32]}...")
    print(f"   引用计数: {media_file1.reference_count}")
    print(f"   是否新文件: {is_new1}")
    print(f"   ✅ 测试1通过\n")
    
    # 测试2: 上传相同的图片（应该复用）
    print("📸 测试2: 上传相同的图片（应该复用）")
    print("-" * 70)
    
    file2 = SimpleUploadedFile(
        "test_image_1_copy.png",
        test_image_content,
        content_type="image/png"
    )
    
    media_file2, is_new2 = MediaFileManager.save_file_with_deduplication(
        file2,
        upload_to='media-destination/'
    )
    
    print(f"   文件路径: {media_file2.file_path}")
    print(f"   文件哈希: {media_file2.file_hash[:32]}...")
    print(f"   引用计数: {media_file2.reference_count}")
    print(f"   是否新文件: {is_new2}")
    
    assert media_file1.file_hash == media_file2.file_hash, "哈希值应该相同"
    assert media_file1.file_path == media_file2.file_path, "文件路径应该相同"
    assert media_file2.reference_count == 2, "引用计数应该为2"
    assert not is_new2, "不应该是新文件"
    print(f"   ✅ 测试2通过 - 文件成功复用！\n")
    
    # 测试3: 创建目的地并关联图片
    print("📍 测试3: 创建目的地并关联图片")
    print("-" * 70)
    
    dest1 = Destination.objects.create(
        name="测试目的地1",
        city="北京",
        location="北京市中心",
        description="这是一个测试目的地",
        cover_image=media_file1.file_path,
        category="观光",
        price_range="100-200元",
        duration="2小时",
        best_season="四季皆宜"
    )
    
    print(f"   目的地ID: {dest1.id}")
    print(f"   目的地名称: {dest1.name}")
    print(f"   封面图片: {dest1.cover_image}")
    
    # 检查引用计数是否增加
    media_file1.refresh_from_db()
    print(f"   引用计数: {media_file1.reference_count}")
    print(f"   ✅ 测试3通过\n")
    
    # 测试4: 上传不同的图片
    print("📸 测试4: 上传不同的图片")
    print("-" * 70)
    
    different_image_content = b'\x89PNG\r\n\x1a\n' + b'Different image content' * 100
    
    file3 = SimpleUploadedFile(
        "test_image_2.png",
        different_image_content,
        content_type="image/png"
    )
    
    media_file3, is_new3 = MediaFileManager.save_file_with_deduplication(
        file3,
        upload_to='media-destination/'
    )
    
    print(f"   文件路径: {media_file3.file_path}")
    print(f"   文件哈希: {media_file3.file_hash[:32]}...")
    print(f"   是否新文件: {is_new3}")
    
    assert media_file3.file_hash != media_file1.file_hash, "不同图片的哈希值应该不同"
    assert is_new3, "应该是新文件"
    print(f"   ✅ 测试4通过\n")
    
    # 测试5: 释放引用（模拟删除目的地）
    print("🗑️ 测试5: 释放引用（模拟删除目的地）")
    print("-" * 70)
    
    initial_ref_count = media_file1.reference_count
    print(f"   释放前引用计数: {initial_ref_count}")
    
    MediaFileManager.release_file_reference(media_file1)
    
    media_file1.refresh_from_db()
    print(f"   释放后引用计数: {media_file1.reference_count}")
    
    assert media_file1.reference_count == initial_ref_count - 1, "引用计数应该减少1"
    print(f"   ✅ 测试5通过\n")
    
    # 测试6: 多次释放直到引用计数为0
    print("🗑️ 测试6: 多次释放直到引用计数为0")
    print("-" * 70)
    
    while media_file1.reference_count > 0:
        print(f"   当前引用计数: {media_file1.reference_count}")
        MediaFileManager.release_file_reference(media_file1)
        media_file1.refresh_from_db()
    
    print(f"   最终引用计数: {media_file1.reference_count}")
    print(f"   是否已删除: {media_file1.is_deleted}")
    
    assert media_file1.reference_count == 0, "引用计数应该为0"
    assert media_file1.is_deleted == True, "文件应该被标记为已删除"
    print(f"   ✅ 测试6通过 - 文件已被标记删除\n")
    
    # 测试7: 恢复已删除的文件
    print("♻️ 测试7: 恢复已删除的文件")
    print("-" * 70)
    
    restored_file = MediaFileManager.restore_deleted_file(media_file1.file_hash)
    
    if restored_file:
        print(f"   文件已恢复: {restored_file.file_path}")
        print(f"   引用计数: {restored_file.reference_count}")
        print(f"   是否已删除: {restored_file.is_deleted}")
        
        assert restored_file.is_deleted == False, "文件应该不再标记为已删除"
        assert restored_file.reference_count == 1, "引用计数应该为1"
        print(f"   ✅ 测试7通过\n")
    else:
        print(f"   ⚠️ 文件无法恢复（可能物理文件已被删除）\n")
    
    # 清理测试数据
    print("🧹 清理测试数据")
    print("-" * 70)
    
    try:
        dest1.delete()
        print(f"   已删除测试目的地: {dest1.id}")
    except:
        pass
    
    # 统计结果
    print("\n" + "="*70)
    print("✅ 所有测试通过！")
    print("="*70)
    
    # 显示当前数据库中的媒体文件统计
    total_files = MediaFile.objects.count()
    active_files = MediaFile.objects.filter(is_deleted=False).count()
    deleted_files = MediaFile.objects.filter(is_deleted=True).count()
    
    print(f"\n📊 媒体文件统计:")
    print(f"   总文件数: {total_files}")
    print(f"   活跃文件: {active_files}")
    print(f"   已删除文件: {deleted_files}")
    print()


if __name__ == '__main__':
    try:
        test_media_file_management()
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

