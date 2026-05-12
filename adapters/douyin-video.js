// adapters/douyin-video.js
// Site adapter for Douyin video pages (www.douyin.com).
// Lenient mode: applies to every xgplayer instance found on the page.

(function () {
  const ID = 'douyinVideo';
  const TOGGLE_KEY = 'enableDouyinVideo';
  const PLATFORM_MSG_KEY = 'platformDouyinVideo';
  const { runWithRetry, alive, t, defer, guard } = window.__resolutionRetry;

  function matches(loc) {
    return loc.host === 'www.douyin.com';
  }

  function selectForOne(settingEl) {
    // Douyin's xgplayer renders quality items in priority order — highest
    // tier first, "智能" (auto) last. So we just take the first .item that
    // isn't an auto entry.
    const items = settingEl.querySelectorAll('.item');
    if (!items.length) return false;

    let target = null;
    for (const item of items) {
      const text = (item.textContent || '').trim();
      if (!text || text.includes('智能') || text.includes('自动')) continue;
      target = item;
      break;
    }
    if (!target) return false;
    // Already at this tier — do nothing.
    if (target.classList.contains('selected')) return false;

    settingEl.dispatchEvent(new MouseEvent('mouseover', { view: window, bubbles: true }));
    settingEl.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));
    defer(() => {
      target.click();
      console.log(
        t('switchedToQualityDouyinVideo') + ':',
        (target.textContent || '').trim()
      );
      settingEl.dispatchEvent(new MouseEvent('mouseleave', { view: window, bubbles: true }));
    }, 150);
    return true;
  }

  function selectAll() {
    const settings = document.querySelectorAll('.xgplayer-playclarity-setting');
    if (!settings.length) {
      console.log(t('douyinPlayerNotReady'));
      return false;
    }
    let anyChanged = false;
    settings.forEach((s) => {
      if (selectForOne(s)) anyChanged = true;
    });
    if (!anyChanged) {
      console.log(t('noSuitableQualityDouyin'));
    }
    return true; // we tried — stop the retry loop
  }

  function waitAndSelect() {
    runWithRetry(() => {
      if (!document.querySelector('.xgplayer-playclarity-setting')) return false;
      // Settle to let the menu populate.
      defer(() => selectAll(), 500);
      return true;
    }, {
      intervalMs: 1000,
      maxRetries: 10,
      onRetry: (n, max, ms) => console.log(
        t('playerNotReadyRetry', [String(ms), String(n), String(max)])
      ),
      onTimeout: () => console.log(t('douyinPlayerNotReady'))
    });
  }

  function init(config) {
    console.log(t('douyinPluginLoaded'));
    waitAndSelect();

    // New cards/players added (feed scrolling, modal open) → re-apply.
    const observer = new MutationObserver(guard((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const hasPlayer = node.matches?.('.xgplayer-playclarity-setting')
            || node.querySelector?.('.xgplayer-playclarity-setting');
          if (hasPlayer) {
            defer(() => selectAll(), 1500);
            return;
          }
        }
      }
    }));
    observer.observe(document.body, { childList: true, subtree: true });

    // SPA URL change (modal_id swap, route change) → re-apply.
    let lastUrl = location.href;
    const titleEl = document.querySelector('head title');
    if (titleEl) {
      const urlObserver = new MutationObserver(guard(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log(t('videoSwitchDetected'));
          defer(() => waitAndSelect(), 2000);
        }
      }));
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
