// content.js
// B站自动最高清晰度选择器

console.log(chrome.i18n.getMessage('pluginLoaded'));

// 配置默认值
let config = {
  enableVipQuality: false, // 是否选择会员清晰度
  autoRetry: true,         // 失败后自动重试
  maxRetries: 10,          // 最大重试次数
  retryInterval: 1000      // 重试间隔（毫秒）
};

// 从存储中加载配置
chrome.storage.sync.get(['enableVipQuality'], (result) => {
  if (result.enableVipQuality !== undefined) {
    config.enableVipQuality = result.enableVipQuality;
  }
  console.log(chrome.i18n.getMessage('configLoaded') + ':', config);
  startObserving();
});

// 选择最高清晰度
function selectHighestQuality() {
  const qualityBtn = document.querySelector('.bpx-player-ctrl-quality');
  if (!qualityBtn) {
    console.log(chrome.i18n.getMessage('qualityBtnNotFound'));
    return false;
  }

  const qualityMenu = document.querySelector('.bpx-player-ctrl-quality-menu');
  if (!qualityMenu) {
    console.log(chrome.i18n.getMessage('qualityMenuNotFound'));
    return false;
  }

  const menuItems = qualityMenu.querySelectorAll('.bpx-player-ctrl-quality-menu-item');
  if (menuItems.length === 0) {
    console.log(chrome.i18n.getMessage('qualityOptionsNotFound'));
    return false;
  }

  // 获取当前选中的清晰度
  const activeItem = qualityMenu.querySelector('.bpx-state-active');
  const currentValue = activeItem ? parseInt(activeItem.getAttribute('data-value')) : 0;
  
  // 根据配置选择目标清晰度
  let targetItem = null;
  let highestValue = -1;
  
  for (let item of menuItems) {
    const value = parseInt(item.getAttribute('data-value'));
    const hasVipBadge = item.querySelector('.bpx-player-ctrl-quality-badge-bigvip');
    
    // 跳过自动选项
    if (value === 0) continue;
    
    // 如果不选择会员清晰度，跳过会员选项
    if (!config.enableVipQuality && hasVipBadge) {
      continue;
    }
    
    // 找到最高的清晰度值
    if (value > highestValue) {
      highestValue = value;
      targetItem = item;
    }
  }
  
  if (!targetItem) {
    console.log(chrome.i18n.getMessage('noSuitableQuality'));
    return false;
  }

  // 如果目标清晰度已经是当前清晰度，则不需要切换
  if (highestValue === currentValue) {
    console.log(chrome.i18n.getMessage('alreadyHighestQuality') + ':', targetItem.querySelector('.bpx-player-ctrl-quality-text').innerText);
    return true;
  }
  
  // 模拟鼠标悬停打开菜单
  const mouseEnterEvent = new MouseEvent('mouseenter', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  qualityBtn.dispatchEvent(mouseEnterEvent);
  
  // 延迟后点击目标清晰度
  setTimeout(() => {
    targetItem.click();
    console.log(chrome.i18n.getMessage('switchedToQuality') + ':', targetItem.querySelector('.bpx-player-ctrl-quality-text').innerText);

    // 关闭菜单
    const mouseLeaveEvent = new MouseEvent('mouseleave', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    qualityBtn.dispatchEvent(mouseLeaveEvent);
  }, 100);

  return true;
}

// 等待播放器加载完成并执行选择
function waitAndSelectQuality(retryCount = 0) {
  // 检查播放器是否加载完成
  const player = document.querySelector('.bpx-player-container');
  const qualityBtn = document.querySelector('.bpx-player-ctrl-quality');
  const qualityMenu = document.querySelector('.bpx-player-ctrl-quality-menu');
  
  if (player && qualityBtn && qualityMenu) {
    // 延迟执行，确保播放器完全初始化
    setTimeout(() => {
      const success = selectHighestQuality();
      if (!success && config.autoRetry && retryCount < config.maxRetries) {
        console.log(chrome.i18n.getMessage('selectFailedRetry', [config.retryInterval.toString(), (retryCount + 1).toString(), config.maxRetries.toString()]));
        setTimeout(() => waitAndSelectQuality(retryCount + 1), config.retryInterval);
      }
    }, 1000);
  } else if (config.autoRetry && retryCount < config.maxRetries) {
    console.log(chrome.i18n.getMessage('playerNotReadyRetry', [config.retryInterval.toString(), (retryCount + 1).toString(), config.maxRetries.toString()]));
    setTimeout(() => waitAndSelectQuality(retryCount + 1), config.retryInterval);
  } else {
    console.log(chrome.i18n.getMessage('playerLoadTimeout'));
  }
}

// 监听页面变化
function startObserving() {
  // 立即尝试一次
  waitAndSelectQuality();
  
  // 监听DOM变化，处理动态加载的内容
  const observer = new MutationObserver((mutations) => {
    // 检查是否有播放器相关的元素被添加
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList &&
                (node.classList.contains('bpx-player-container') ||
                 node.querySelector && node.querySelector('.bpx-player-container'))) {
              console.log(chrome.i18n.getMessage('playerDetected'));
              setTimeout(() => waitAndSelectQuality(), 1000);
              return;
            }
          }
        }
      }
    }
  });

  // 开始监听
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 监听配置更新
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enableVipQuality) {
      config.enableVipQuality = changes.enableVipQuality.newValue;
      console.log(chrome.i18n.getMessage('configUpdated') + ':', config);
      // 配置更新后重新选择清晰度
      waitAndSelectQuality();
    }
  });

  // 处理视频切换（在同一页面内切换视频）
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log(chrome.i18n.getMessage('videoSwitchDetected'));
      setTimeout(() => waitAndSelectQuality(), 2000);
    }
  });
  
  urlObserver.observe(document.querySelector('head title'), {
    childList: true,
    characterData: true,
    subtree: true
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectQuality') {
    waitAndSelectQuality();
    sendResponse({ status: 'started' });
  }
  return true;
});
