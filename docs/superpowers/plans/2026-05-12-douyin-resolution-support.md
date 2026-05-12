# Douyin Resolution Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Bilibili auto-highest-resolution Chrome extension to also auto-select the highest available quality on Douyin video pages (`www.douyin.com`) and Douyin live rooms (`live.douyin.com/<room>`), with per-platform on/off toggles in the popup.

**Architecture:** Refactor the single-file `content.js` into an **adapter pattern**: each supported site has its own adapter file under `adapters/`, sharing helpers from `common/`. The manifest declares one `content_scripts` entry per platform, each loading only its adapter + the entry point `content.js`. The entry point reads `window.__resolutionAdapter` (set by the adapter file at load time) and runs it. Popup gains two sections: a Bilibili group (with the existing VIP sub-toggle nested under the Bilibili toggle) and a Douyin group (two toggles for video and live).

**Tech Stack:** Plain JavaScript (no bundler, no transpiler), Chrome Extension Manifest V3, `chrome.storage.sync`, `chrome.i18n`, MutationObserver. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-12-douyin-resolution-support-design.md`

**Verification model:** Chrome extensions have no unit test framework configured in this project. Each task that changes runtime behavior ends with a manual verification step in Chrome (load unpacked, open target site, check console + UI). Steps describe exactly what to look for.

---

## Pre-flight

- [ ] **Step 0.1: Confirm clean tree on the worktree branch**

Run: `git status`
Expected: `nothing to commit, working tree clean` on branch `claude/unruffled-gagarin-abe60e`.

- [ ] **Step 0.2: Confirm spec is present**

Run: `ls docs/superpowers/specs/2026-05-12-douyin-resolution-support-design.md`
Expected: the file exists. If not, stop and re-run the brainstorming flow.

---

## Task 1: Add i18n messages (zh_CN + en)

**Why first:** All later UI and console-log strings reference these keys. Adding them first means no downstream code references a missing key.

**Files:**
- Modify: `_locales/zh_CN/messages.json`
- Modify: `_locales/en/messages.json`

- [ ] **Step 1.1: Append new keys to `_locales/zh_CN/messages.json`**

Open the file. The current closing `}` is on the last line. Replace the final `}` so the file ends with the new keys appended before the close brace. Add the following block immediately before the closing `}` (and add a comma to the line above):

```json
  "platformBilibili": {
    "message": "B站",
    "description": "Platform name: Bilibili"
  },
  "platformDouyinVideo": {
    "message": "抖音视频",
    "description": "Platform name: Douyin Video"
  },
  "platformDouyinLive": {
    "message": "抖音直播",
    "description": "Platform name: Douyin Live"
  },
  "groupBilibili": {
    "message": "B 站",
    "description": "Popup section header for Bilibili"
  },
  "groupDouyin": {
    "message": "抖音",
    "description": "Popup section header for Douyin"
  },
  "enableBilibiliLabel": {
    "message": "在 B 站启用",
    "description": "Label for the Bilibili platform toggle"
  },
  "enableDouyinVideoLabel": {
    "message": "在抖音视频启用",
    "description": "Label for the Douyin video platform toggle"
  },
  "enableDouyinLiveLabel": {
    "message": "在抖音直播启用",
    "description": "Label for the Douyin live platform toggle"
  },
  "statusEnabledOn": {
    "message": "已启用 · $1",
    "description": "Status text when an adapter is enabled on the current site; $1 is the platform name",
    "placeholders": {
      "platform": { "content": "$1", "example": "B站" }
    }
  },
  "statusDisabledOn": {
    "message": "已禁用 · $1",
    "description": "Status text when an adapter is disabled on the current site; $1 is the platform name",
    "placeholders": {
      "platform": { "content": "$1", "example": "B站" }
    }
  },
  "notOnSupportedSite": {
    "message": "非支持的站点",
    "description": "Status text when the current tab is not a supported site"
  },
  "footerAutoRunAll": {
    "message": "在已启用的支持站点自动运行",
    "description": "Footer text describing auto-run on enabled supported sites"
  },
  "switchedToQualityDouyinVideo": {
    "message": "已切换抖音视频清晰度",
    "description": "Console message when Douyin video quality is switched"
  },
  "switchedToQualityDouyinLive": {
    "message": "已切换抖音直播清晰度",
    "description": "Console message when Douyin live quality is switched"
  },
  "noSuitableQualityDouyin": {
    "message": "未找到合适的抖音清晰度",
    "description": "Console message when no suitable Douyin quality is found"
  },
  "douyinPlayerNotReady": {
    "message": "抖音播放器未就绪",
    "description": "Console message when the Douyin video player isn't ready yet"
  },
  "douyinLiveNotReady": {
    "message": "抖音直播间未就绪",
    "description": "Console message when the Douyin live room isn't ready yet"
  },
  "douyinPluginLoaded": {
    "message": "抖音清晰度适配器已加载",
    "description": "Console message when the Douyin adapter is loaded"
  }
```

- [ ] **Step 1.2: Append matching keys to `_locales/en/messages.json`**

```json
  "platformBilibili": {
    "message": "Bilibili",
    "description": "Platform name: Bilibili"
  },
  "platformDouyinVideo": {
    "message": "Douyin Video",
    "description": "Platform name: Douyin Video"
  },
  "platformDouyinLive": {
    "message": "Douyin Live",
    "description": "Platform name: Douyin Live"
  },
  "groupBilibili": {
    "message": "Bilibili",
    "description": "Popup section header for Bilibili"
  },
  "groupDouyin": {
    "message": "Douyin",
    "description": "Popup section header for Douyin"
  },
  "enableBilibiliLabel": {
    "message": "Enable on Bilibili",
    "description": "Label for the Bilibili platform toggle"
  },
  "enableDouyinVideoLabel": {
    "message": "Enable on Douyin videos",
    "description": "Label for the Douyin video platform toggle"
  },
  "enableDouyinLiveLabel": {
    "message": "Enable on Douyin live",
    "description": "Label for the Douyin live platform toggle"
  },
  "statusEnabledOn": {
    "message": "Enabled · $1",
    "description": "Status text when an adapter is enabled on the current site; $1 is the platform name",
    "placeholders": {
      "platform": { "content": "$1", "example": "Bilibili" }
    }
  },
  "statusDisabledOn": {
    "message": "Disabled · $1",
    "description": "Status text when an adapter is disabled on the current site; $1 is the platform name",
    "placeholders": {
      "platform": { "content": "$1", "example": "Bilibili" }
    }
  },
  "notOnSupportedSite": {
    "message": "Not on a supported site",
    "description": "Status text when the current tab is not a supported site"
  },
  "footerAutoRunAll": {
    "message": "Runs automatically on enabled supported sites",
    "description": "Footer text describing auto-run on enabled supported sites"
  },
  "switchedToQualityDouyinVideo": {
    "message": "Switched Douyin video quality",
    "description": "Console message when Douyin video quality is switched"
  },
  "switchedToQualityDouyinLive": {
    "message": "Switched Douyin live quality",
    "description": "Console message when Douyin live quality is switched"
  },
  "noSuitableQualityDouyin": {
    "message": "No suitable Douyin quality found",
    "description": "Console message when no suitable Douyin quality is found"
  },
  "douyinPlayerNotReady": {
    "message": "Douyin player not ready",
    "description": "Console message when the Douyin video player isn't ready yet"
  },
  "douyinLiveNotReady": {
    "message": "Douyin live room not ready",
    "description": "Console message when the Douyin live room isn't ready yet"
  },
  "douyinPluginLoaded": {
    "message": "Douyin resolution adapter loaded",
    "description": "Console message when the Douyin adapter is loaded"
  }
```

- [ ] **Step 1.3: Validate both files are valid JSON**

Run (PowerShell):
```powershell
Get-Content _locales\zh_CN\messages.json -Raw | ConvertFrom-Json | Out-Null
Get-Content _locales\en\messages.json -Raw | ConvertFrom-Json | Out-Null
```
Expected: no output. Any parse error means a missing/extra comma. Fix and re-run.

- [ ] **Step 1.4: Commit**

```bash
git add _locales/zh_CN/messages.json _locales/en/messages.json
git commit -m "i18n: add zh/en message keys for Douyin adapters and per-platform toggles"
```

---

## Task 2: Create shared retry helper

**Why:** Both the existing Bilibili logic and the new Douyin adapters need the same "wait for selector, retry N times with interval" pattern. Extracting it keeps each adapter focused on its own DOM logic.

**Files:**
- Create: `common/retry.js`

- [ ] **Step 2.1: Create directory**

Run (PowerShell): `New-Item -ItemType Directory -Path common -Force | Out-Null`

- [ ] **Step 2.2: Write `common/retry.js`**

```javascript
// common/retry.js
// Shared retry helper used by all site adapters.
// Exposed on `window.__resolutionRetry` because MV3 content scripts
// don't support ES modules across files in the same content_scripts entry.

(function () {
  // Run `attempt()` immediately, then re-run after `intervalMs` if it returns
  // false-y, up to `maxRetries` times. `attempt` may return true (done) or
  // false (not yet — retry). On success, `onSuccess(attemptIndex)` fires once.
  // On final failure, `onTimeout()` fires once.
  function runWithRetry(attempt, options) {
    const intervalMs = options?.intervalMs ?? 1000;
    const maxRetries = options?.maxRetries ?? 10;
    const onSuccess = options?.onSuccess || (() => {});
    const onRetry = options?.onRetry || (() => {});
    const onTimeout = options?.onTimeout || (() => {});

    let count = 0;
    const tick = () => {
      let ok = false;
      try {
        ok = attempt(count);
      } catch (e) {
        console.error('[resolution] attempt threw:', e);
      }
      if (ok) {
        onSuccess(count);
        return;
      }
      if (count >= maxRetries) {
        onTimeout();
        return;
      }
      count++;
      onRetry(count, maxRetries, intervalMs);
      setTimeout(tick, intervalMs);
    };
    tick();
  }

  window.__resolutionRetry = { runWithRetry };
})();
```

- [ ] **Step 2.3: Commit**

```bash
git add common/retry.js
git commit -m "feat: add shared retry helper for site adapters"
```

---

## Task 3: Create Bilibili adapter

**Why:** Move the existing logic out of `content.js` into a self-contained adapter that implements the standard contract. Behavior unchanged.

**Files:**
- Create: `adapters/bilibili.js`

- [ ] **Step 3.1: Create directory**

Run (PowerShell): `New-Item -ItemType Directory -Path adapters -Force | Out-Null`

- [ ] **Step 3.2: Write `adapters/bilibili.js`**

```javascript
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
```

- [ ] **Step 3.3: Commit**

```bash
git add adapters/bilibili.js
git commit -m "feat: extract Bilibili logic into a site adapter"
```

---

## Task 4: Refactor `content.js` into the adapter dispatcher

**Why:** Replace the inline Bilibili code with a generic dispatcher that runs whichever adapter has registered itself for this page. After this task, Bilibili behavior is unchanged but the architecture is in place.

**Files:**
- Modify: `content.js` (full rewrite)
- Modify: `manifest.json` (point the existing content_scripts entry at the new file order)

- [ ] **Step 4.1: Replace `content.js` contents**

Overwrite the whole file with:

```javascript
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
```

- [ ] **Step 4.2: Update `manifest.json` content_scripts entry**

Open `manifest.json`. Replace the existing `content_scripts` array so it reads:

```json
"content_scripts": [
  {
    "matches": ["https://www.bilibili.com/video/*"],
    "js": ["common/retry.js", "adapters/bilibili.js", "content.js"],
    "run_at": "document_idle"
  }
]
```

- [ ] **Step 4.3: Manual verification — Bilibili regression**

Run in the worktree:
```bash
git status
```
Expected: clean (or only the staged changes from this task).

Then in Chrome:

1. Open `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" and select the worktree directory `C:\Doc\GitHub\bilibili-resolution-chrome-plugin\.claude\worktrees\unruffled-gagarin-abe60e`
3. If a previous load of this extension is present, click its refresh icon instead
4. Open `https://www.bilibili.com/video/<any-video>` — pick any video you know plays
5. Open DevTools console (F12)
6. Expect to see: `B站自动最高清晰度插件已加载 [bilibili]` (or English equivalent) and `配置已加载` log
7. Confirm the player picks the highest non-VIP quality automatically
8. Open the popup, click the manual button — expect quality to re-apply

If verification fails: do not proceed. Inspect the console error, fix, re-run.

- [ ] **Step 4.4: Commit**

```bash
git add content.js manifest.json
git commit -m "refactor: turn content.js into a generic adapter dispatcher"
```

---

## Task 5: Create Douyin video adapter

**Why:** Implement the per-video quality switcher for `www.douyin.com`. Lenient mode — operates on every `.xgplayer-playclarity-setting` present on the page, including feed inline players.

**Files:**
- Create: `adapters/douyin-video.js`

- [ ] **Step 5.1: Write `adapters/douyin-video.js`**

```javascript
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
```

- [ ] **Step 5.2: Commit**

```bash
git add adapters/douyin-video.js
git commit -m "feat: add Douyin video site adapter"
```

---

## Task 6: Wire Douyin video into manifest

**Files:**
- Modify: `manifest.json`

- [ ] **Step 6.1: Add `www.douyin.com` to host_permissions and a new content_scripts entry**

Edit `manifest.json` so `host_permissions` and `content_scripts` read:

```json
"host_permissions": [
  "https://www.bilibili.com/*",
  "https://www.douyin.com/*"
],
"content_scripts": [
  {
    "matches": ["https://www.bilibili.com/video/*"],
    "js": ["common/retry.js", "adapters/bilibili.js", "content.js"],
    "run_at": "document_idle"
  },
  {
    "matches": ["https://www.douyin.com/*"],
    "js": ["common/retry.js", "adapters/douyin-video.js", "content.js"],
    "run_at": "document_idle"
  }
]
```

- [ ] **Step 6.2: Validate manifest is valid JSON**

Run (PowerShell): `Get-Content manifest.json -Raw | ConvertFrom-Json | Out-Null`
Expected: no output.

- [ ] **Step 6.3: Manual verification — Douyin video**

1. Reload the extension on `chrome://extensions`
2. Open `https://www.douyin.com/` — wait for a feed page to load
3. Click into any video (this changes URL to `?modal_id=...`)
4. Open DevTools console, expect: `抖音清晰度适配器已加载` then within ~2s `已切换抖音视频清晰度: 高清 1080P` (or whatever the highest available tier is)
5. The clarity button in the bottom-right of the player should now read the new tier (not "智能")
6. Open the popup and click "立即选择最高清晰度" — re-trigger should produce the same console line

If the video doesn't switch: check the console log. `未找到合适的抖音清晰度` means no non-智能/non-selected item was found (acceptable if the video only has 智能). Move on.

- [ ] **Step 6.4: Commit**

```bash
git add manifest.json
git commit -m "feat: wire Douyin video adapter into manifest"
```

---

## Task 7: Create Douyin live adapter

**Files:**
- Create: `adapters/douyin-live.js`

- [ ] **Step 7.1: Write `adapters/douyin-live.js`**

```javascript
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
```

- [ ] **Step 7.2: Commit**

```bash
git add adapters/douyin-live.js
git commit -m "feat: add Douyin live site adapter"
```

---

## Task 8: Wire Douyin live into manifest

**Files:**
- Modify: `manifest.json`

- [ ] **Step 8.1: Add `live.douyin.com` to host_permissions and add third content_scripts entry**

Edit `manifest.json` so `host_permissions` and `content_scripts` read:

```json
"host_permissions": [
  "https://www.bilibili.com/*",
  "https://www.douyin.com/*",
  "https://live.douyin.com/*"
],
"content_scripts": [
  {
    "matches": ["https://www.bilibili.com/video/*"],
    "js": ["common/retry.js", "adapters/bilibili.js", "content.js"],
    "run_at": "document_idle"
  },
  {
    "matches": ["https://www.douyin.com/*"],
    "js": ["common/retry.js", "adapters/douyin-video.js", "content.js"],
    "run_at": "document_idle"
  },
  {
    "matches": ["https://live.douyin.com/*"],
    "js": ["common/retry.js", "adapters/douyin-live.js", "content.js"],
    "run_at": "document_idle"
  }
]
```

- [ ] **Step 8.2: Validate manifest JSON**

Run (PowerShell): `Get-Content manifest.json -Raw | ConvertFrom-Json | Out-Null`
Expected: no output.

- [ ] **Step 8.3: Manual verification — Douyin live**

1. Reload the extension on `chrome://extensions`
2. Open `https://live.douyin.com/` — wait for the room list. Click any live room thumbnail to enter `live.douyin.com/<id>`
3. Open DevTools console, expect: `抖音清晰度适配器已加载`, then within ~3s `已切换抖音直播清晰度: 原画` (or whatever the highest non-自动 tier is)
4. The clarity indicator bottom-right of the live player should show the new tier
5. Click into a different live room — expect re-apply on URL change

- [ ] **Step 8.4: Commit**

```bash
git add manifest.json
git commit -m "feat: wire Douyin live adapter into manifest"
```

---

## Task 9: Popup UI — HTML + CSS

**Why:** Add the two-platform layout with grouped sections, nested VIP sub-toggle, and updated copy. CSS handles indenting and the disabled state for nested toggle.

**Files:**
- Modify: `popup.html`
- Modify: `popup.css`

- [ ] **Step 9.1: Rewrite `popup.html` body**

Replace the existing `<div class="container">...</div>` block (lines 10–49 of the current file) with this. Keep the header `<h1>` block unchanged — only modify the content between it and the `</div>` of `.container`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-i18n="extName"></title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#00a1d6">
        <path d="M9.5 9.325v1.175q0 .575-.525.875H7.525Q7 11.1 7 10.5V8H5.4q-.375 0-.562-.312-.188-.313.037-.638l3.6-5.1q.15-.2.4-.2t.4.2l3.6 5.1q.225.325.037.638Q12.725 8 12.35 8h-1.6v2.5q0 .6-.525.875H9.5Z"/>
        <path d="M17 14v-2q0-.425.288-.712Q17.575 11 18 11t.712.288q.288.287.288.712v2h2q.425 0 .712.288.288.287.288.712t-.288.712Q21.425 16 21 16h-2v2q0 .425-.288.712Q18.425 19 18 19t-.712-.288Q17 18.425 17 18v-2h-2q-.425 0-.712-.288Q14 15.425 14 15t.288-.712Q14.575 14 15 14Zm-8.25 5 .45-.05q.225-.025.388-.187.162-.163.187-.388l.175-1.35q.125-.05.263-.125l1.15.775q.15.1.35.075.2-.025.35-.175l.35-.375q.125-.15.125-.337 0-.188-.125-.338l-.85-.95q.05-.125.05-.275 0-.15-.05-.275l.85-.95q.125-.15.125-.338 0-.187-.125-.337l-.35-.375q-.15-.15-.35-.175-.2-.025-.35.075l-1.15.775q-.125-.075-.263-.125l-.175-1.35q-.025-.225-.187-.388Q9.925 12.05 9.7 12l-.45-.05q-.25 0-.425.15t-.2.375l-.175 1.35q-.125.075-.25.125L7.05 13.2q-.175-.1-.35-.088-.175.013-.325.163l-.35.375q-.125.15-.125.337 0 .188.125.338l.85.95Q6.825 15.4 6.825 15.55q0 .15.05.275l-.85.95q-.125.15-.125.338 0 .187.125.337l.35.375q.15.15.325.163.175.012.35-.088l1.15.75q.1.05.25.125l.175 1.35q.025.225.2.375t.425.15q.05.025.425.025Zm0-2.5q-.525 0-.887-.363-.363-.362-.363-.887t.363-.887q.362-.363.887-.363t.888.363q.362.362.362.887t-.362.887q-.363.363-.888.363Z"/>
      </svg>
      <span data-i18n="extName"></span>
    </h1>

    <div class="platform-group">
      <div class="platform-group-header" data-i18n="groupBilibili"></div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="enableBilibili">
          <span class="slider"></span>
        </label>
        <span class="label-text" data-i18n="enableBilibiliLabel"></span>
      </div>
      <div class="setting-item nested" id="vipQualityRow">
        <label class="switch">
          <input type="checkbox" id="enableVipQuality">
          <span class="slider"></span>
        </label>
        <span class="label-text" data-i18n="enableVipQualityLabel"></span>
      </div>
    </div>

    <div class="platform-group">
      <div class="platform-group-header" data-i18n="groupDouyin"></div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="enableDouyinVideo">
          <span class="slider"></span>
        </label>
        <span class="label-text" data-i18n="enableDouyinVideoLabel"></span>
      </div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="enableDouyinLive">
          <span class="slider"></span>
        </label>
        <span class="label-text" data-i18n="enableDouyinLiveLabel"></span>
      </div>
    </div>

    <div class="info">
      <div class="info-item">
        <span class="dot"></span>
        <span id="status" data-i18n="statusEnabled"></span>
      </div>
      <p class="description">
        <span data-i18n="descriptionOn"></span><br>
        <span data-i18n="descriptionOff"></span>
      </p>
    </div>

    <button id="manualSelect" class="btn-primary" data-i18n="btnManualSelect"></button>

    <div class="footer">
      <p data-i18n="footerAutoRunAll"></p>
      <p class="version" id="version"></p>
      <div class="footer-links">
        <a href="https://github.com/nov30th/bilibili-resolution-chrome-plugin/issues" target="_blank" class="footer-link" data-i18n="footerFeedback"></a>
        <span class="separator">|</span>
        <a href="https://developer.chrome.com/docs/webstore/program-policies/policies" target="_blank" class="footer-link" data-i18n="footerPolicy"></a>
      </div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 9.2: Append CSS for platform groups and nested rows**

Add to the **end** of `popup.css`:

```css
/* 平台分组 */
.platform-group {
  margin-bottom: 12px;
}

.platform-group-header {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding-left: 4px;
}

.platform-group .setting-item {
  margin-bottom: 6px;
}

.platform-group .setting-item:last-child {
  margin-bottom: 0;
}

/* 嵌套子开关（B 站 VIP） */
.setting-item.nested {
  margin-left: 28px;
  background: #fafafa;
}

.setting-item.nested.disabled {
  opacity: 0.45;
  pointer-events: none;
}
```

- [ ] **Step 9.3: Commit**

```bash
git add popup.html popup.css
git commit -m "feat: popup UI for per-platform toggles with nested VIP sub-toggle"
```

---

## Task 10: Popup JS — per-platform toggles, platform-aware status, manual trigger routing

**Files:**
- Modify: `popup.js` (full rewrite)

- [ ] **Step 10.1: Rewrite `popup.js`**

Replace the whole file with:

```javascript
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
```

- [ ] **Step 10.2: Manual verification — popup UI and toggles**

1. Reload extension on `chrome://extensions`
2. Open the popup on a non-supported tab (e.g. `chrome://newtab/`):
   - Status reads "非支持的站点" / "Not on a supported site"
   - Manual button is disabled
3. Open `bilibili.com/video/<any>`, click extension icon:
   - Status reads "已启用 · B站" / "Enabled · Bilibili"
   - All four toggles render with correct saved states
4. Toggle Bilibili off → VIP row greys out (disabled visual state, can't click)
5. Toggle Bilibili back on → VIP row re-enabled
6. Open `www.douyin.com/jingxuan?modal_id=...`, click extension icon:
   - Status reads "已启用 · 抖音视频"
7. Open `live.douyin.com/<roomId>`, click extension icon:
   - Status reads "已启用 · 抖音直播"
8. Toggle "Enable on Douyin live" off → reload that tab → expect console log `[resolution] adapter disabled by user: douyinLive` and no quality switch
9. Toggle it back on, reload tab → adapter runs again

- [ ] **Step 10.3: Commit**

```bash
git add popup.js
git commit -m "feat: popup logic for per-platform toggles and platform-aware status"
```

---

## Task 11: Bump version to 1.2.0

**Files:**
- Modify: `manifest.json`

- [ ] **Step 11.1: Edit `manifest.json`**

Change `"version": "1.1.2"` to `"version": "1.2.0"`.

- [ ] **Step 11.2: Commit**

```bash
git add manifest.json
git commit -m "chore: bump version to 1.2.0"
```

---

## Task 12: Full manual regression — spec section 9 checklist

**Why:** Confirm the spec's acceptance criteria are met end-to-end before declaring the feature complete. No commit at this step — this is verification only.

- [ ] **Step 12.1: Reload extension and run through each item**

Reload at `chrome://extensions`. For each row below, perform the action and confirm the expected outcome. Note any failures inline (do not check the box if it fails).

- [ ] **B1.** Bilibili video page → highest non-VIP quality auto-selected (no VIP badge accidentally clicked).
- [ ] **B2.** Bilibili VIP toggle on → VIP tier selected when available (test on a video with 4K/8K options).
- [ ] **B3.** Bilibili toggle off → reload a Bilibili video page → no quality switch happens; console shows `[resolution] adapter disabled by user: bilibili`.
- [ ] **D1.** `douyin.com/?modal_id=X` (feed modal) → video plays at highest non-智能 tier.
- [ ] **D2.** `douyin.com/video/<id>` (direct page) → same.
- [ ] **D3.** Douyin feed page (multiple cards visible) → each visible card's player gets bumped to highest tier (verify by hovering each player to see its clarity indicator).
- [ ] **D4.** Douyin video toggle off → reload a Douyin tab → no console adapter log.
- [ ] **L1.** Douyin live room (`live.douyin.com/<id>`) → switches to 原画 (or highest available tier above 标清).
- [ ] **L2.** Switch to a different live room via in-page navigation → re-applies.
- [ ] **L3.** Douyin live toggle off → no switch happens.
- [ ] **N1.** Bilibili SPA: click "下一集" or another video link on the same page → re-applies highest quality.
- [ ] **M1.** Manual trigger button on each platform: works and shows correct toast.
- [ ] **U1.** Popup status indicator correctly cycles through `已启用 · X` / `已禁用 · X` / `非支持的站点` for the three states.
- [ ] **I1.** Switch Chrome UI language to English: popup renders English strings, no `__MSG_...__` leaks. (Optional if you don't want to switch language — confirm by inspecting `_locales/en/messages.json` parses and all `data-i18n` keys exist in both locales.)
- [ ] **C1.** Upgrade path: in `chrome://extensions` developer mode, set storage to only `{enableVipQuality: true}` (via DevTools → Application → Storage → Extensions), reload extension → all three new toggles default to on, VIP stays on.

- [ ] **Step 12.2: Final status**

If all rows passed, the feature is complete. If any failed, file the issue inline (extra task in this plan or new commit) and re-verify. Do NOT mark Task 12 complete with failing rows.

---

## File summary

| Path | Status | Notes |
|---|---|---|
| `_locales/zh_CN/messages.json` | Modified | +18 keys |
| `_locales/en/messages.json` | Modified | +18 keys |
| `common/retry.js` | Created | Shared retry helper |
| `adapters/bilibili.js` | Created | Existing logic extracted |
| `adapters/douyin-video.js` | Created | New |
| `adapters/douyin-live.js` | Created | New |
| `content.js` | Rewritten | Generic dispatcher |
| `popup.html` | Modified | Two platform groups + nested VIP row |
| `popup.css` | Modified | `.platform-group`, `.nested` rules |
| `popup.js` | Rewritten | Platform detection + per-platform toggles |
| `manifest.json` | Modified | host_permissions + 3 content_scripts + version 1.2.0 |
