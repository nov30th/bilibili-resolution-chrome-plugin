// popup.js
// Manages per-platform toggle state, platform-aware status indicator,
// and routes the manual-trigger button to the active tab's adapter.

// Platform detection (mirrors adapters/<site>.js `matches()` logic).
function detectPlatform(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.host === 'www.bilibili.com' && u.pathname.startsWith('/video/')) {
      return { id: 'bilibili', toggleKey: 'enableBilibili', labelKey: 'platformBilibili' };
    }
    if (u.host === 'live.douyin.com' && u.pathname.length > 1) {
      return { id: 'douyinLive', toggleKey: 'enableDouyinLive', labelKey: 'platformDouyinLive' };
    }
    if (u.host === 'www.douyin.com') {
      return { id: 'douyinVideo', toggleKey: 'enableDouyinVideo', labelKey: 'platformDouyinVideo' };
    }
  } catch (_) { /* ignore */ }
  return null;
}

function initializeI18n() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (!message) return;
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = message;
    } else {
      element.textContent = message;
    }
  });
}

const TOGGLE_KEYS = ['enableBilibili', 'enableVipQuality', 'enableDouyinVideo', 'enableDouyinLive'];
const TOGGLE_DEFAULTS = {
  enableBilibili: true,
  enableVipQuality: false,
  enableDouyinVideo: true,
  enableDouyinLive: true
};

document.addEventListener('DOMContentLoaded', function () {
  initializeI18n();

  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent =
    chrome.i18n.getMessage('footerVersionLabel') + ' ' + manifest.version;

  const inputs = {
    enableBilibili: document.getElementById('enableBilibili'),
    enableVipQuality: document.getElementById('enableVipQuality'),
    enableDouyinVideo: document.getElementById('enableDouyinVideo'),
    enableDouyinLive: document.getElementById('enableDouyinLive')
  };
  const vipRow = document.getElementById('vipQualityRow');
  const manualBtn = document.getElementById('manualSelect');
  const statusEl = document.getElementById('status');

  // Load saved toggles (default-true for the three new ones, default-false for VIP).
  chrome.storage.sync.get(TOGGLE_KEYS, function (result) {
    for (const key of TOGGLE_KEYS) {
      const val = result[key] === undefined ? TOGGLE_DEFAULTS[key] : result[key];
      inputs[key].checked = !!val;
    }
    updateVipRowEnabled(inputs.enableBilibili.checked);
  });

  function updateVipRowEnabled(bilibiliOn) {
    if (bilibiliOn) {
      vipRow.classList.remove('disabled');
      inputs.enableVipQuality.disabled = false;
    } else {
      vipRow.classList.add('disabled');
      inputs.enableVipQuality.disabled = true;
    }
  }

  // Persist each toggle on change.
  for (const key of TOGGLE_KEYS) {
    inputs[key].addEventListener('change', () => {
      const val = inputs[key].checked;
      chrome.storage.sync.set({ [key]: val }, () => {
        if (key === 'enableVipQuality') {
          showToast(val
            ? chrome.i18n.getMessage('vipQualityEnabled')
            : chrome.i18n.getMessage('vipQualityDisabled'));
        } else {
          showToast(chrome.i18n.getMessage('settingSaved'));
        }
      });
      if (key === 'enableBilibili') {
        updateVipRowEnabled(val);
      }
    });
  }

  // Manual trigger — route to whichever platform the active tab is on.
  manualBtn.addEventListener('click', async () => {
    manualBtn.disabled = true;
    manualBtn.textContent = chrome.i18n.getMessage('executing');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const platform = detectPlatform(tab?.url);
      if (!platform) {
        showToast(chrome.i18n.getMessage('notOnSupportedSite'));
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'selectQuality' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.i18n.getMessage('sendMessageFailed'), chrome.runtime.lastError);
          showToast(chrome.i18n.getMessage('executionFailed'));
          statusEl.textContent = chrome.i18n.getMessage('executionFailedShort');
          statusEl.style.color = '#ff4d4f';
          return;
        }
        if (response?.status === 'disabled') {
          showToast(chrome.i18n.getMessage('statusDisabledOn', [chrome.i18n.getMessage(platform.labelKey)]));
          return;
        }
        showToast(chrome.i18n.getMessage('selectingQuality'));
        statusEl.textContent = chrome.i18n.getMessage('executionInProgress');
        statusEl.style.color = '#faad14';
        setTimeout(() => refreshStatus(), 3000);
      });
    } finally {
      setTimeout(() => {
        manualBtn.disabled = false;
        manualBtn.textContent = chrome.i18n.getMessage('btnManualSelect');
      }, 2000);
    }
  });

  async function refreshStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const platform = detectPlatform(tab?.url);
    if (!platform) {
      statusEl.textContent = chrome.i18n.getMessage('notOnSupportedSite');
      statusEl.style.color = '#ff4d4f';
      manualBtn.disabled = true;
      return;
    }
    chrome.storage.sync.get([platform.toggleKey], (result) => {
      const stored = result[platform.toggleKey];
      const isEnabled = stored === undefined ? TOGGLE_DEFAULTS[platform.toggleKey] : stored;
      const platformLabel = chrome.i18n.getMessage(platform.labelKey);
      if (isEnabled) {
        statusEl.textContent = chrome.i18n.getMessage('statusEnabledOn', [platformLabel]);
        statusEl.style.color = '#52c41a';
        manualBtn.disabled = false;
      } else {
        statusEl.textContent = chrome.i18n.getMessage('statusDisabledOn', [platformLabel]);
        statusEl.style.color = '#faad14';
        manualBtn.disabled = true;
      }
    });
  }

  refreshStatus();
});

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
