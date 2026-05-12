// adapters/douyin-live.js
// Site adapter for Douyin live rooms (live.douyin.com/<roomId>).

(function () {
  const ID = 'douyinLive';
  const TOGGLE_KEY = 'enableDouyinLive';
  const PLATFORM_MSG_KEY = 'platformDouyinLive';

  // Known Douyin live tier labels. Used as an allowlist when scanning the
  // dropdown — class names inside the menu are obfuscated and unstable, so
  // we filter by exact text content. Add new names here if Douyin ships a
  // tier label that isn't on this list. Order in this list does NOT matter:
  // the menu itself is rendered in priority order and we pick by DOM order.
  const TIER_NAMES = new Set(['原画', '蓝光', '超清', '高清', '标清', '流畅']);

  function matches(loc) {
    if (loc.host !== 'live.douyin.com') return false;
    // Root `/` is the landing/list page, no player.
    return loc.pathname.length > 1;
  }

  function collectMenuItems(container) {
    // Inside the open dropdown, find leaf-ish elements whose text exactly
    // matches one of the known tier labels. Returns items in DOM order —
    // first entry is the highest tier per Douyin's layout.
    const all = container.querySelectorAll('*');
    const seen = new Set();
    const matched = [];
    for (const el of all) {
      const text = (el.textContent || '').trim();
      if (!TIER_NAMES.has(text)) continue;
      if (el.children.length > 1) continue;
      if (seen.has(text)) continue; // dedup nested wrappers with same text
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.width > 200) continue; // skip suspiciously wide containers
      seen.add(text);
      matched.push({ el, text });
    }
    return matched;
  }

  function selectHighestLiveTier() {
    const container = document.querySelector('.QualitySwitchNewPlugin');
    if (!container) {
      console.log(chrome.i18n.getMessage('douyinLiveNotReady'));
      return false;
    }

    const current = (container.textContent || '').trim();

    container.dispatchEvent(new MouseEvent('mouseover', { view: window, bubbles: true }));
    container.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));

    setTimeout(() => {
      const items = collectMenuItems(container.parentElement || container);
      // First item in DOM order = highest tier on Douyin's UI.
      const target = items[0];
      if (!target) {
        console.log(chrome.i18n.getMessage('noSuitableQualityDouyin'));
      } else if (target.text === current) {
        // Already at the top — do nothing.
      } else {
        target.el.click();
        console.log(chrome.i18n.getMessage('switchedToQualityDouyinLive') + ':', target.text);
      }
      container.dispatchEvent(new MouseEvent('mouseleave', { view: window, bubbles: true }));
    }, 400);

    return true;
  }

  function waitAndSelect() {
    const { runWithRetry } = window.__resolutionRetry;
    runWithRetry(() => {
      const container = document.querySelector('.QualitySwitchNewPlugin');
      if (!container) return false;
      // Container present and current tier text non-empty means menu is ready.
      const cur = (container.textContent || '').trim();
      if (!cur) return false;
      setTimeout(() => selectHighestLiveTier(), 500);
      return true;
    }, {
      intervalMs: 1000,
      maxRetries: 10,
      onRetry: (n, max, ms) => console.log(
        chrome.i18n.getMessage('playerNotReadyRetry', [String(ms), String(n), String(max)])
      ),
      onTimeout: () => console.log(chrome.i18n.getMessage('douyinLiveNotReady'))
    });
  }

  function init(config) {
    console.log(chrome.i18n.getMessage('douyinPluginLoaded'));
    waitAndSelect();

    // SPA: switching rooms via in-page navigation.
    let lastUrl = location.href;
    const titleEl = document.querySelector('head title');
    if (titleEl) {
      const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log(chrome.i18n.getMessage('videoSwitchDetected'));
          setTimeout(() => waitAndSelect(), 2500);
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
