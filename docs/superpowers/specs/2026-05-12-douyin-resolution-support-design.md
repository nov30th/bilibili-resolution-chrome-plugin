# Douyin Resolution Support — Design

Date: 2026-05-12
Status: Approved (pending spec review)

## 1. Goal

Extend the existing Bilibili auto-highest-resolution Chrome extension to also support Douyin video pages and Douyin live rooms. The extension should automatically switch to the highest available quality on each supported platform, and provide per-platform on/off toggles in the popup UI.

## 2. Scope

In scope:

- Bilibili video pages (existing behavior, preserved as-is)
- Douyin short/long video playback on `www.douyin.com` — any page where the xgplayer instance with a quality menu is present (lenient mode, including feed-modal videos and feed inline videos)
- Douyin live rooms on `live.douyin.com/<roomId>`
- Per-platform enable toggles in popup
- Bilingual (zh_CN / en) i18n strings for all new UI

Out of scope (explicit non-goals):

- The Bilibili "VIP quality" toggle is preserved Bilibili-only behavior
- Douyin live "auto"/"智能/自动" tier is intentionally skipped
- Douyin video "智能" tier is intentionally skipped
- No new permissions beyond what is required for the two Douyin host patterns
- No telemetry, no remote config, no analytics

## 3. Architecture

Today everything lives in a single `content.js` that contains Bilibili-specific selectors, retry loop, MutationObserver, and message handlers. To add two more platforms without entangling them, we introduce an **adapter pattern**.

### 3.1 File layout

```
content.js                ← entry point, picks adapter by hostname/URL
adapters/
  bilibili.js             ← existing logic moved here, unchanged in behavior
  douyin-video.js         ← new
  douyin-live.js          ← new
common/
  retry.js                ← shared retry/wait helpers (waitFor + retry loop)
```

Manifest V3 content scripts cannot use ES `import` — files are listed in `content_scripts.js` as plain scripts loaded in order. Each adapter file assigns itself onto a global `window.__resolutionAdapters` namespace, and `content.js` reads from it. No bundler is introduced.

### 3.2 Adapter contract

Each adapter exports a single object on the global namespace:

```js
window.__resolutionAdapters.douyinVideo = {
  id: 'douyinVideo',              // matches storage key suffix
  matches(location) { ... },      // boolean — should this adapter run on this URL?
  init(config) { ... },           // called once; sets up observers + initial run
  selectHighest() { ... }         // idempotent manual trigger from popup
};
```

`content.js` does:

1. Read config from `chrome.storage.sync`
2. Find the first adapter whose `matches(location)` returns true AND whose platform toggle is enabled
3. Call `adapter.init(config)`
4. Listen for `chrome.runtime.onMessage` and route `selectQuality` to `adapter.selectHighest()`

Only one adapter is active per tab. If hostname does not match any adapter, `content.js` does nothing.

### 3.3 Why adapters, not if/else

Each platform has different DOM, different selectors, different quality enumeration logic, different SPA navigation patterns. Putting it in one file would make a future fourth platform painful and would entangle the bilibili-stable codepath with experimental douyin code. The adapter file is also a natural unit for someone reading the codebase to understand "what does this extension do on Douyin live."

## 4. Per-adapter strategy

### 4.1 Bilibili adapter (unchanged)

Selectors and logic are lifted verbatim from current `content.js`:

- Quality button: `.bpx-player-ctrl-quality`
- Menu: `.bpx-player-ctrl-quality-menu`
- Items: `.bpx-player-ctrl-quality-menu-item` with `data-value` attribute (higher = better)
- Active item: `.bpx-state-active`
- VIP items: presence of `.bpx-player-ctrl-quality-badge-bigvip`
- Skip items with `data-value === 0` (auto)
- Skip VIP items unless `enableVipQuality === true`

### 4.2 Douyin video adapter

URL matching: `host === 'www.douyin.com'` (lenient — operates anywhere on the main domain).

Strategy:

- Find **all** `.xgplayer-playclarity-setting` instances on the page (feed pages may have multiple cards each with its own player)
- For each instance:
  1. Find sibling/descendant items: `.item` inside the same setting container
  2. For each item, read `innerText`
  3. Skip items whose text contains "智能" or whose class contains "selected" (already current)
  4. Parse the largest number followed by `P` from the text (e.g. "高清 1080P" → 1080); fall back to text-based priority `蓝光 > 超清 > 高清 > 标清 > 流畅` if no numeric tier found
  5. Hover (mouseover + mouseenter) the setting to open the menu
  6. Click the target item
  7. Send mouseleave to close the menu

Items already at the highest available tier are skipped silently.

### 4.3 Douyin live adapter

URL matching: `host === 'live.douyin.com'` AND path is not `/` (must be a room).

Strategy:

- Quality button container: `.QualitySwitchNewPlugin` (stable across stream changes)
- Hover the container to open the dropdown menu
- Within the now-visible menu, enumerate all elements whose `textContent` (trimmed) is exactly one of: `原画`, `蓝光`, `超清`, `高清`, `标清`, `流畅` — and which are leaf-ish (≤1 child) and have non-zero bounding box
- Priority order (descending): `原画 > 蓝光 > 超清 > 高清 > 标清 > 流畅`. `自动` / `智能` are always skipped.
- Pick the highest-priority option that is **not** the currently-selected one. The currently-selected option is reflected in `.QualitySwitchNewPlugin`'s own text content.
- Click the chosen menu item
- Mouseleave the container

### 4.4 Common: SPA navigation handling

Both Douyin platforms are SPAs with URL changes that do not trigger a full page load. We reuse the existing pattern from the Bilibili adapter: a MutationObserver on `<title>` plus a stored `lastUrl` snapshot. When URL changes, re-run `selectHighest()` after a short debounce.

For Douyin video feed (multiple players), the player MutationObserver watches `document.body` for new `.xgplayer-playclarity-setting` nodes and applies highest-quality to each new one.

### 4.5 Common: retry behavior

Lifted from the current Bilibili logic: up to 10 retries at 1s interval, abort once player + quality menu are both confirmed present, otherwise final timeout log. This logic moves into `common/retry.js` so adapters share it.

## 5. UI / popup changes

### 5.1 Layout

The popup grows three toggles (one per platform) plus the existing VIP toggle. To keep this readable:

```
[ Header ]

┌─ Bilibili ─────────────────────┐
│ [✓] Enable on Bilibili         │
│   [ ] VIP quality (sub-toggle) │
└────────────────────────────────┘

┌─ Douyin ───────────────────────┐
│ [✓] Enable on Douyin videos    │
│ [✓] Enable on Douyin live      │
└────────────────────────────────┘

[ Manual trigger button ]

[ Status indicator ]
[ Footer ]
```

Implementation: two `<fieldset>`-style grouped sections (just a `<div class="platform-group">` with a small header). The VIP toggle indents under the Bilibili toggle and is disabled (greyed) when Bilibili is off.

### 5.2 Status indicator

Currently shows "已启用" / "非B站页面". Updated logic:

- If current tab matches a supported adapter AND that platform's toggle is on → "已启用 · <platform>"
- If matches but toggle is off → "已禁用 · <platform>"
- If no adapter matches → "非支持的站点"

### 5.3 Manual trigger button

Currently sends `{action: 'selectQuality'}` to the active tab. New behavior: identical message dispatch, but `content.js` routes to whichever adapter is currently active. Popup-side logic only checks "is this tab a supported site?" (any adapter matches), no longer hard-coded to Bilibili.

If no adapter is active (toggle off, or unsupported site), the button is disabled and the status indicator explains why.

## 6. Storage schema

### 6.1 Sync storage keys

```js
{
  enableVipQuality: false,    // existing — kept verbatim, Bilibili-only
  enableBilibili: true,       // new — defaults true on first install
  enableDouyinVideo: true,    // new — defaults true
  enableDouyinLive: true      // new — defaults true
}
```

### 6.2 Backward compatibility

Existing users only have `enableVipQuality` stored. On extension upgrade:

- The three new keys are absent → treated as `true` by default everywhere (`result.enableX !== false`)
- `enableVipQuality` value is preserved untouched

No migration code needed. The defaults-true semantics mean upgrades are silent and behavior-preserving (Bilibili still works automatically).

### 6.3 Live reconfiguration

`chrome.storage.onChanged` listener already exists for `enableVipQuality`. Extend it to handle the three new keys: on toggle change, if the current adapter is the affected one, re-run `selectHighest()` (or stop, if toggled off).

## 7. Manifest changes

```jsonc
{
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
}
```

Three separate content_script entries, each loading only the adapter it needs. The shared `content.js` entry runs last and dispatches based on the single adapter registered for that page.

## 8. i18n

New message keys added to both `_locales/zh_CN/messages.json` and `_locales/en/messages.json`:

| Key | zh_CN | en |
|---|---|---|
| `platformBilibili` | B站 | Bilibili |
| `platformDouyin` | 抖音 | Douyin |
| `platformDouyinVideo` | 抖音视频 | Douyin Video |
| `platformDouyinLive` | 抖音直播 | Douyin Live |
| `enableBilibiliLabel` | 在 B 站启用 | Enable on Bilibili |
| `enableDouyinVideoLabel` | 在抖音视频启用 | Enable on Douyin videos |
| `enableDouyinLiveLabel` | 在抖音直播启用 | Enable on Douyin live |
| `statusEnabledOn` | 已启用 · $1 | Enabled · $1 |
| `statusDisabledOn` | 已禁用 · $1 | Disabled · $1 |
| `notOnSupportedSite` | 非支持的站点 | Not on a supported site |
| `switchedToQualityDouyin` | 已切换抖音清晰度 | Douyin quality switched |
| `noSuitableQualityDouyin` | 未找到合适的抖音清晰度 | No suitable Douyin quality |
| `douyinPlayerNotReady` | 抖音播放器未就绪 | Douyin player not ready |
| `douyinLiveNotReady` | 抖音直播间未就绪 | Douyin live room not ready |

The existing `statusEnabled` / `notOnBilibiliPage` keys are kept for backward compatibility but no longer used by the new UI (the new keys take their place).

## 9. Manual testing checklist

Manual verification (extension is small enough that automated unit tests are not justified for this change):

- [ ] Bilibili video page: highest non-VIP quality auto-selected (existing behavior preserved)
- [ ] Bilibili VIP toggle on: VIP tiers selected when available
- [ ] Bilibili toggle off: nothing happens on Bilibili
- [ ] Douyin `/jingxuan?modal_id=X`: video plays at highest non-智能 tier
- [ ] Douyin `/video/<id>`: same
- [ ] Douyin feed page (multiple cards): each card's player gets highest tier
- [ ] Douyin live room: room opens at highest tier above 标清 if available, otherwise 标清
- [ ] Douyin toggle off: clicked into a video, default tier is kept (no menu interaction)
- [ ] SPA navigation: clicking next video on Bilibili re-applies; clicking next live room re-applies
- [ ] Manual trigger button: works on all three platforms based on current tab
- [ ] Popup status indicator: correctly shows platform name and enabled/disabled state
- [ ] Both zh_CN and en locales render all strings (no `__MSG_...__` leaking)

## 10. Open questions / known limitations

- **Feed lenient mode**: per user decision, Douyin video adapter operates on any page with a player, including feed pages. If this causes noticeable extra bandwidth (each scrolled-past video gets bumped to 1080P), revisit and add a "feed mode" gate. Tracked here, not in v1.2 spec.
- **Live tier set may evolve**: Douyin live tiers `原画/蓝光/超清/高清/标清/流畅` are based on current observation. If Douyin adds a new tier name, the adapter will fall through (none of the known names matches) and do nothing — safe degradation.
- **xgplayer class drift**: `.xgplayer-playclarity-setting` is part of an open-source player library (xgplayer), so reasonably stable. `.QualitySwitchNewPlugin` is Douyin-proprietary and could be renamed in a future Douyin update — at which point this adapter breaks silently. Acceptable for a free extension.

## 11. Version bump

`manifest.json` version: `1.1.2` → `1.2.0` (minor — feature addition, no breaking changes for existing Bilibili users).
