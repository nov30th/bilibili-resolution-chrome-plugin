// adapters/douyin-video.js
// Site adapter for Douyin video pages (www.douyin.com).
// Lenient mode: applies to every xgplayer instance found on the page.

(function () {
  const ID = 'douyinVideo';
  const TOGGLE_KEY = 'enableDouyinVideo';
  const PLATFORM_MSG_KEY = 'platformDouyinVideo';

  function matches(loc) {
    return loc.host === 'www.douyin.com';
  }

  // Parse the largest "<num>P" found in the item's text.
  // Returns -1 if none — caller will skip those.
  function parseTier(text) {
    const t = (text || '').trim();
    if (t.includes('智能')) return -2; // explicit auto, skip
    const m = t.match(/(\d{3,4})\s*P/i);
    if (m) return parseInt(m[1], 10);
    return -1;
  }

  function selectForOne(settingEl) {
    // Find items inside this setting's dropdown.
    const items = settingEl.querySelectorAll('.item');
    if (!items.length) return false;

    let target = null;
    let bestTier = -1;
    for (const item of items) {
      const tier = parseTier(item.textContent);
      if (tier < 0) continue; // skip 智能 / unparseable
      if (item.classList.contains('selected')) continue;
      if (tier > bestTier) {
        bestTier = tier;
        target = item;
      }
    }

    if (!target) return false;

    // Open the dropdown via hover, then click.
    settingEl.dispatchEvent(new MouseEvent('mouseover', { view: window, bubbles: true }));
    settingEl.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));
    setTimeout(() => {
      target.click();
      console.log(
        chrome.i18n.getMessage('switchedToQualityDouyinVideo') + ':',
        (target.textContent || '').trim()
      );
      settingEl.dispatchEvent(new MouseEvent('mouseleave', { view: window, bubbles: true }));
    }, 150);
    return true;
  }

  function selectAll() {
    const settings = document.querySelectorAll('.xgplayer-playclarity-setting');
    if (!settings.length) {
      console.log(chrome.i18n.getMessage('douyinPlayerNotReady'));
      return false;
    }
    let anyChanged = false;
    settings.forEach((s) => {
      if (selectForOne(s)) anyChanged = true;
    });
    if (!anyChanged) {
      console.log(chrome.i18n.getMessage('noSuitableQualityDouyin'));
    }
    return true; // we tried — stop the retry loop
  }

  function waitAndSelect() {
    const { runWithRetry } = window.__resolutionRetry;
    runWithRetry(() => {
      if (!document.querySelector('.xgplayer-playclarity-setting')) return false;
      // Settle to let the menu populate.
      setTimeout(() => selectAll(), 500);
      return true;
    }, {
      intervalMs: 1000,
      maxRetries: 10,
      onRetry: (n, max, ms) => console.log(
        chrome.i18n.getMessage('playerNotReadyRetry', [String(ms), String(n), String(max)])
      ),
      onTimeout: () => console.log(chrome.i18n.getMessage('douyinPlayerNotReady'))
    });
  }

  function init(config) {
    console.log(chrome.i18n.getMessage('douyinPluginLoaded'));
    waitAndSelect();

    // New cards/players added (feed scrolling, modal open) → re-apply.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const hasPlayer = node.matches?.('.xgplayer-playclarity-setting')
            || node.querySelector?.('.xgplayer-playclarity-setting');
          if (hasPlayer) {
            setTimeout(() => selectAll(), 1500);
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // SPA URL change (modal_id swap, route change) → re-apply.
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

  function selectHighest() {
    waitAndSelect();
  }

  window.__resolutionAdapter = {
    id: ID,
    toggleKey: TOGGLE_KEY,
    platformMessageKey: PLATFORM_MSG_KEY,
    matches,
    init,
    selectHighest
  };
})();
