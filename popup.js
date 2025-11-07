// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const enableVipQuality = document.getElementById('enableVipQuality');
  const manualSelectBtn = document.getElementById('manualSelect');
  const statusElement = document.getElementById('status');
  
  // 加载保存的设置
  chrome.storage.sync.get(['enableVipQuality'], function(result) {
    if (result.enableVipQuality !== undefined) {
      enableVipQuality.checked = result.enableVipQuality;
    }
  });
  
  // 保存设置变更
  enableVipQuality.addEventListener('change', function() {
    const isEnabled = enableVipQuality.checked;
    chrome.storage.sync.set({ enableVipQuality: isEnabled }, function() {
      console.log('设置已保存: enableVipQuality =', isEnabled);
      showToast(isEnabled ? '已开启会员清晰度' : '已关闭会员清晰度');
    });
  });
  
  // 手动触发选择最高清晰度
  manualSelectBtn.addEventListener('click', async function() {
    // 禁用按钮避免重复点击
    manualSelectBtn.disabled = true;
    manualSelectBtn.textContent = '正在执行...';
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否在B站视频页面
      if (!tab.url || !tab.url.includes('bilibili.com/video/')) {
        showToast('请在B站视频页面使用');
        statusElement.textContent = '不在B站视频页面';
        statusElement.style.color = '#ff4d4f';
        return;
      }
      
      // 向content script发送消息
      chrome.tabs.sendMessage(tab.id, { action: 'selectQuality' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送消息失败:', chrome.runtime.lastError);
          showToast('执行失败，请刷新页面后重试');
          statusElement.textContent = '执行失败';
          statusElement.style.color = '#ff4d4f';
        } else {
          showToast('正在选择最高清晰度...');
          statusElement.textContent = '正在执行';
          statusElement.style.color = '#faad14';
          
          // 3秒后恢复状态
          setTimeout(() => {
            statusElement.textContent = '插件已启用';
            statusElement.style.color = '#52c41a';
          }, 3000);
        }
      });
    } catch (error) {
      console.error('执行失败:', error);
      showToast('执行失败');
      statusElement.textContent = '执行失败';
      statusElement.style.color = '#ff4d4f';
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        manualSelectBtn.disabled = false;
        manualSelectBtn.textContent = '立即选择最高清晰度';
      }, 2000);
    }
  });
  
  // 检查当前页面状态
  checkCurrentPage();
});

// 检查当前页面是否为B站视频页面
async function checkCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const statusElement = document.getElementById('status');
    const manualSelectBtn = document.getElementById('manualSelect');
    
    if (tab.url && tab.url.includes('bilibili.com/video/')) {
      statusElement.textContent = '插件已启用';
      statusElement.style.color = '#52c41a';
      manualSelectBtn.disabled = false;
    } else {
      statusElement.textContent = '不在B站视频页面';
      statusElement.style.color = '#ff4d4f';
      manualSelectBtn.disabled = true;
    }
  } catch (error) {
    console.error('检查页面状态失败:', error);
  }
}

// 显示临时提示消息
function showToast(message) {
  // 移除已存在的toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 创建新的toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 显示动画
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // 3秒后消失
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}
