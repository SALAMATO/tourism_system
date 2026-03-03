// 新闻识别功能
async function fetchNewsFromUrl() {
  const urlInput = document.getElementById('news-url-input');
  const statusDiv = document.getElementById('fetch-news-status');
  const fetchBtn = document.getElementById('fetch-news-btn');
  
  const url = urlInput.value.trim();
  
  if (!url) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入新闻URL</span>';
    return;
  }
  
  try {
    new URL(url);
  } catch (e) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">URL格式不正确</span>';
    return;
  }
  
  statusDiv.innerHTML = '<span style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> 正在识别新闻...</span>';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/news/fetch_from_url/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '识别失败');
    }
    
    const data = await response.json();
    
    document.getElementById('news-title').value = data.title || '';
    document.getElementById('news-author').value = data.author || '';
    
    // 使用超级编辑器设置内容
    if (window.CKEditorSuperHelper && data.content) {
      window.CKEditorSuperHelper.setContent('news-content', data.content);
    } else {
      document.getElementById('news-content').value = data.content || '';
    }
    
    // 如果有发布日期，填充它
    if (data.publish_date) {
      const dateInput = document.getElementById('news-date');
      if (dateInput) {
        dateInput.value = data.publish_date;
      }
    }
    
    statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充标题、作者和内容</span>';
    showNotification('新闻识别成功', 'success');
    
    urlInput.value = '';
    
  } catch (error) {
    console.error('新闻识别失败:', error);
    statusDiv.innerHTML = '<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> ' + error.message + '</span>';
    showNotification('新闻识别失败: ' + error.message, 'error');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别新闻';
  }
}

// 政策识别功能
async function fetchPolicyFromUrl() {
  const urlInput = document.getElementById('policy-url-input');
  const statusDiv = document.getElementById('fetch-policy-status');
  const fetchBtn = document.getElementById('fetch-policy-btn');
  
  const url = urlInput.value.trim();
  
  if (!url) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">请输入政策URL</span>';
    return;
  }
  
  try {
    new URL(url);
  } catch (e) {
    statusDiv.innerHTML = '<span style="color: var(--danger-color);">URL格式不正确</span>';
    return;
  }
  
  statusDiv.innerHTML = '<span style="color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> 正在识别政策...</span>';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/policies/fetch_from_url/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '识别失败');
    }
    
    const data = await response.json();
    
    document.getElementById('policy-title').value = data.title || '';
    document.getElementById('policy-department').value = data.department || '';
    document.getElementById('policy-date').value = data.publish_date || '';
    document.getElementById('policy-url').value = data.url || '';
    
    // 使用超级编辑器设置内容
    if (window.CKEditorSuperHelper && data.content) {
      window.CKEditorSuperHelper.setContent('policy-content', data.content);
    } else {
      document.getElementById('policy-content').value = data.content || '';
    }
    
    statusDiv.innerHTML = '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 识别成功！已自动填充标题、发布部门、发布日期和内容</span>';
    showNotification('政策识别成功', 'success');
    
    urlInput.value = '';
    
  } catch (error) {
    console.error('政策识别失败:', error);
    statusDiv.innerHTML = '<span style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> ' + error.message + '</span>';
    showNotification('政策识别失败: ' + error.message, 'error');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i class="fas fa-download"></i> 识别原文';
  }
}

// 初始化识别按钮
document.addEventListener('DOMContentLoaded', function() {
  const fetchNewsBtn = document.getElementById('fetch-news-btn');
  if (fetchNewsBtn) {
    fetchNewsBtn.addEventListener('click', async () => {
      await fetchNewsFromUrl();
    });
  }
  
  const fetchPolicyBtn = document.getElementById('fetch-policy-btn');
  if (fetchPolicyBtn) {
    fetchPolicyBtn.addEventListener('click', async () => {
      await fetchPolicyFromUrl();
    });
  }
});
