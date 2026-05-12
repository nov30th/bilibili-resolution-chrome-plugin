// adapters/douyin-live.js
// Site adapter for Douyin live rooms (live.douyin.com/<roomId>).

(function () {
  const ID = 'douyinLive';
  const TOGGLE_KEY = 'enableDouyinLive';
  const PLATFORM_MSG_KEY = 'platformDouyinLive';

  // Priority order: highest first. Auto (自动/智能) is intentionally absent.
  const TIER_PRIORITY = ['原画', '蓝光', '超清', '高清', '标清', '流畅'];

  function matches(loc) {
    if (loc.host !== 'live.douyin.com') return false;
    // Root `/` is the landing/list page, no player.
    return loc.pathname.length > 1;
  }

  function getCurrentTierText(container) {
    return (container.textContent || '').trim();
  }

  function collectMenuItems(container) {
    // Inside the now-open dropdown, find leaf-ish elements whose text
    // exactly matches one of the known tier names and that look interactive.
    const all = container.querySelectorAll('*');
    const matched = [];
    for (const el of all) {
      const text = (el.textContent || '').trim();
      if (!TIER_PRIORITY.includes(text)) continue;
      if (el.children.length > 1) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.width > 200) continue; // skip suspiciously wide containers
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

    const current = getCurrentTierText(container);

    // Open the dropdown.
    container.dispatchEvent(new MouseEvent('mouseover', { view: window, bubbles: true }));
    container.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));

    setTimeout(() => {
      const items = collectMenuItems(container.parentElement || container);
      // Pick the highest-priority tier that isn't the current one.
      let target = null;
      for (const tierName of TIER_PRIORITY) {
        const hit = items.find(i => i.text === tierName);
        if (!hit) continue;
        if (tierName === current) {
          // Already at this tier — and nothing higher exists in the menu
          // (because we iterate priority top-down and this is the first match).
          break;
        }
        target = hit;
        break;
      }

      if (!target) {
        console.log(chrome.i18n.getMessage('noSuitableQualityDouyin'));
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
