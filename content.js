// content.js
// Generic entry point for all site adapters.
// One adapter registers itself on window.__resolutionAdapter via the
// adapters/<site>.js file that the manifest's content_scripts entry
// loads alongside this file. This file is platform-agnostic.

(function () {
  const adapter = window.__resolutionAdapter;
  if (!adapter) {
    console.warn('[resolution] no adapter registered for this page');
    return;
  }
  if (!adapter.matches(location)) {
    // Manifest matched the URL but adapter rejects it (e.g. live.douyin.com/ root).
    return;
  }

  console.log(chrome.i18n.getMessage('pluginLoaded'), '[' + adapter.id + ']');

  let isRunning = false;

  function start() {
    chrome.storage.sync.get(null, (result) => {
      const platformEnabled = result[adapter.toggleKey] !== false; // default true
      if (!platformEnabled) {
        console.log('[resolution] adapter disabled by user:', adapter.id);
        return;
      }
      isRunning = true;
      adapter.init({
        enableVipQuality: !!result.enableVipQuality,
        autoRetry: true,
        maxRetries: 10,
        retryInterval: 1000
      });
    });
  }

  start();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'selectQuality') {
      if (isRunning) {
        adapter.selectHighest();
        sendResponse({ status: 'started' });
      } else {
        sendResponse({ status: 'disabled' });
      }
    }
    return true;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    // VIP toggle only affects Bilibili adapter — let it react via onConfigChange.
    if (changes.enableVipQuality && isRunning && typeof adapter.onConfigChange === 'function') {
      adapter.onConfigChange({ enableVipQuality: changes.enableVipQuality.newValue });
    }
    // Platform toggle changes take effect on next page load — we don't
    // hot-detach observers because that risks leaving partial listeners.
  });
})();
