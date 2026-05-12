// adapters/bilibili.js
// Site adapter for Bilibili video pages.
// Registers itself on window.__resolutionAdapter (singleton — only one
// content_scripts entry matches per page, so there's no conflict).

(function () {
  const ID = 'bilibili';
  const TOGGLE_KEY = 'enableBilibili';
  const PLATFORM_MSG_KEY = 'platformBilibili';

  function matches(loc) {
    return loc.host === 'www.bilibili.com'
      && loc.pathname.startsWith('/video/');
  }

  function selectHighestQuality(config) {
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

    const activeItem = qualityMenu.querySelector('.bpx-state-active');
    const currentValue = activeItem ? parseInt(activeItem.getAttribute('data-value')) : 0;

    let targetItem = null;
    let highestValue = -1;
    for (const item of menuItems) {
      const value = parseInt(item.getAttribute('data-value'));
      const hasVipBadge = item.querySelector('.bpx-player-ctrl-quality-badge-bigvip');
      if (value === 0) continue;
      if (!config.enableVipQuality && hasVipBadge) continue;
      if (value > highestValue) {
        highestValue = value;
        targetItem = item;
      }
    }

    if (!targetItem) {
      console.log(chrome.i18n.getMessage('noSuitableQuality'));
      return false;
    }

    if (highestValue === currentValue) {
      const txt = targetItem.querySelector('.bpx-player-ctrl-quality-text');
      console.log(chrome.i18n.getMessage('alreadyHighestQuality') + ':', txt?.innerText);
      return true;
    }

    qualityBtn.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true, cancelable: true }));
    setTimeout(() => {
      targetItem.click();
      const txt = targetItem.querySelector('.bpx-player-ctrl-quality-text');
      console.log(chrome.i18n.getMessage('switchedToQuality') + ':', txt?.innerText);
      qualityBtn.dispatchEvent(new MouseEvent('mouseleave', { view: window, bubbles: true, cancelable: true }));
    }, 100);
    return true;
  }

  let currentConfig = null;

  function waitAndSelect() {
    const { runWithRetry } = window.__resolutionRetry;
    runWithRetry(() => {
      const player = document.querySelector('.bpx-player-container');
      const qualityBtn = document.querySelector('.bpx-player-ctrl-quality');
      const qualityMenu = document.querySelector('.bpx-player-ctrl-quality-menu');
      if (!(player && qualityBtn && qualityMenu)) return false;
      // Player present — do a short settle, then attempt selection.
      setTimeout(() => selectHighestQuality(currentConfig), 1000);
      return true;
    }, {
      intervalMs: 1000,
      maxRetries: 10,
      onRetry: (n, max, ms) => console.log(
        chrome.i18n.getMessage('playerNotReadyRetry', [String(ms), String(n), String(max)])
      ),
      onTimeout: () => console.log(chrome.i18n.getMessage('playerLoadTimeout'))
    });
  }

  function init(config) {
    currentConfig = config;
    console.log(chrome.i18n.getMessage('configLoaded') + ':', config);

    waitAndSelect();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.classList && (
            node.classList.contains('bpx-player-container')
            || (node.querySelector && node.querySelector('.bpx-player-container'))
          )) {
            console.log(chrome.i18n.getMessage('playerDetected'));
            setTimeout(() => waitAndSelect(), 1000);
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    const titleEl = document.querySelector('head title');
    if (titleEl) {
      const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log(chrome.i18n.getMessage('videoSwitchDetected'));
          setTimeout(() => waitAndSelect(), 2000);
        }
      });
      urlObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }

  function onConfigChange(newConfig) {
    currentConfig = { ...currentConfig, ...newConfig };
    console.log(chrome.i18n.getMessage('configUpdated') + ':', currentConfig);
    waitAndSelect();
  }

  function selectHighest() {
    waitAndSelect();
  }

  window.__resolutionAdapter = {
    id: ID,
    toggleKey: TOGGLE_KEY,
    platformMessageKey: PLATFORM_MSG_KEY,
    matches,
    init,
    selectHighest,
    onConfigChange
  };
})();
