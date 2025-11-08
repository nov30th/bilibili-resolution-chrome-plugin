// popup.js

// Initialize i18n
function initializeI18n() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = message;
      } else {
        element.textContent = message;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize i18n translations
  initializeI18n();

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
      console.log(chrome.i18n.getMessage('settingSaved') + ': enableVipQuality =', isEnabled);
      showToast(isEnabled ? chrome.i18n.getMessage('vipQualityEnabled') : chrome.i18n.getMessage('vipQualityDisabled'));
    });
  });
  
  // 手动触发选择最高清晰度
  manualSelectBtn.addEventListener('click', async function() {
    // 禁用按钮避免重复点击
    manualSelectBtn.disabled = true;
    manualSelectBtn.textContent = chrome.i18n.getMessage('executing');

    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 检查是否在B站视频页面
      if (!tab.url || !tab.url.includes('bilibili.com/video/')) {
        showToast(chrome.i18n.getMessage('notBilibiliPage'));
        statusElement.textContent = chrome.i18n.getMessage('notOnBilibiliPage');
        statusElement.style.color = '#ff4d4f';
        return;
      }

      // 向content script发送消息
      chrome.tabs.sendMessage(tab.id, { action: 'selectQuality' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.i18n.getMessage('sendMessageFailed') + ':', chrome.runtime.lastError);
          showToast(chrome.i18n.getMessage('executionFailed'));
          statusElement.textContent = chrome.i18n.getMessage('executionFailedShort');
          statusElement.style.color = '#ff4d4f';
        } else {
          showToast(chrome.i18n.getMessage('selectingQuality'));
          statusElement.textContent = chrome.i18n.getMessage('executionInProgress');
          statusElement.style.color = '#faad14';

          // 3秒后恢复状态
          setTimeout(() => {
            statusElement.textContent = chrome.i18n.getMessage('statusEnabled');
            statusElement.style.color = '#52c41a';
          }, 3000);
        }
      });
    } catch (error) {
      console.error(chrome.i18n.getMessage('executionFailedShort') + ':', error);
      showToast(chrome.i18n.getMessage('executionFailedShort'));
      statusElement.textContent = chrome.i18n.getMessage('executionFailedShort');
      statusElement.style.color = '#ff4d4f';
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        manualSelectBtn.disabled = false;
        manualSelectBtn.textContent = chrome.i18n.getMessage('btnManualSelect');
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
      statusElement.textContent = chrome.i18n.getMessage('statusEnabled');
      statusElement.style.color = '#52c41a';
      manualSelectBtn.disabled = false;
    } else {
      statusElement.textContent = chrome.i18n.getMessage('notOnBilibiliPage');
      statusElement.style.color = '#ff4d4f';
      manualSelectBtn.disabled = true;
    }
  } catch (error) {
    console.error(chrome.i18n.getMessage('executionFailedShort') + ':', error);
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
