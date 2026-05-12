// adapters/douyin-live.js
// Site adapter for Douyin live rooms (live.douyin.com/<roomId>).

(function () {
  const ID = 'douyinLive';
  const TOGGLE_KEY = 'enableDouyinLive';
  const PLATFORM_MSG_KEY = 'platformDouyinLive';
  const { runWithRetry, alive, t, defer, guard } = window.__resolutionRetry;

  function matches(loc) {
    if (loc.host !== 'live.douyin.com') return false;
    // Root `/` is the landing/list page, no player.
    return loc.pathname.length > 1;
  }

  function collectMenuItems(container) {
    // The tier menu lives inside the trigger container at
    // [data-e2e="quality-selector"]. Its direct children are the tier <div>s
    // in DOM order (highest first per Douyin's layout). Class names like
    // .J1oLRAwo / .Igg37jeS are obfuscated and change across builds — we
    // anchor on the stable data-e2e attribute instead.
    const selector = container.querySelector('[data-e2e="quality-selector"]');
    if (!selector) return [];
    const matched = [];
    for (const item of selector.children) {
      const text = (item.textContent || '').trim();
      if (!text) continue;
      if (text.includes('智能') || text.includes('自动')) continue;
      matched.push({ el: item, text });
    }
    return matched;
  }

  function selectHighestLiveTier() {
    const container = document.querySelector('.QualitySwitchNewPlugin');
    if (!container) {
      console.log(t('douyinLiveNotReady'));
      return false;
    }

    // [data-e2e="quality"] shows the currently active tier label.
    const currentEl = container.querySelector('[data-e2e="quality"]');
    const current = (currentEl?.textContent || '').trim();

    // Open the dropdown so the click target is interactable.
    container.dispatchEvent(new MouseEvent('mouseover', { view: window, bubbles: true }));
    container.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));

    defer(() => {
      const items = collectMenuItems(container);
      // First item in DOM order = highest tier on Douyin's UI.
      const target = items[0];
      if (!target) {
        console.log(t('noSuitableQualityDouyin'));
      } else if (target.text === current) {
        // Already at the top — do nothing.
      } else {
        target.el.click();
        console.log(t('switchedToQualityDouyinLive') + ':', target.text);
      }
      container.dispatchEvent(new MouseEvent('mouseleave', { view: window, bubbles: true }));
    }, 400);

    return true;
  }

  function waitAndSelect() {
    runWithRetry(() => {
      const container = document.querySelector('.QualitySwitchNewPlugin');
      if (!container) return false;
      // Wait until the dropdown's children have been rendered into the DOM.
      const selector = container.querySelector('[data-e2e="quality-selector"]');
      if (!selector || selector.children.length === 0) return false;
      defer(() => selectHighestLiveTier(), 500);
      return true;
    }, {
      intervalMs: 1000,
      maxRetries: 10,
      onRetry: (n, max, ms) => console.log(
        t('playerNotReadyRetry', [String(ms), String(n), String(max)])
      ),
      onTimeout: () => console.log(t('douyinLiveNotReady'))
    });
  }

  function init(config) {
    console.log(t('douyinPluginLoaded'));
    waitAndSelect();

    // SPA: switching rooms via in-page navigation.
    let lastUrl = location.href;
    const titleEl = document.querySelector('head title');
    if (titleEl) {
      const urlObserver = new MutationObserver(guard(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log(t('videoSwitchDetected'));
          defer(() => waitAndSelect(), 2500);
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
