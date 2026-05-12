// common/retry.js
// Shared retry helper used by all site adapters.
// Exposed on `window.__resolutionRetry` because MV3 content scripts
// don't support ES modules across files in the same content_scripts entry.

(function () {
  // True iff the extension context is still attached. After the extension
  // reloads/updates, content scripts injected into the old page become
  // orphans — any `chrome.*` access throws "Extension context invalidated".
  function alive() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); }
    catch (_) { return false; }
  }

  // Safe wrapper for chrome.i18n.getMessage. Returns the key as a fallback
  // when the extension context has been invalidated.
  function t(key, subs) {
    try { return chrome.i18n.getMessage(key, subs); }
    catch (_) { return key; }
  }

  // True iff the thrown value is the orphan-content-script error. We never
  // want to surface this — it just means the extension was reloaded.
  function isOrphanError(e) {
    const msg = String(e && (e.message || e) || '');
    return msg.includes('Extension context invalidated');
  }

  // Schedule `fn` after `delay` ms. Bails out silently if the extension has
  // been reloaded (alive() check) or if `fn` throws the orphan-context error
  // mid-execution. Any other error rethrows.
  function defer(fn, delay) {
    return setTimeout(() => {
      if (!alive()) return;
      try { fn(); }
      catch (e) { if (!isOrphanError(e)) throw e; }
    }, delay);
  }

  // Wrap a callback (e.g. MutationObserver) so orphan errors are swallowed
  // and execution stops once the extension context is gone.
  function guard(fn) {
    return function (...args) {
      if (!alive()) return;
      try { return fn.apply(this, args); }
      catch (e) { if (!isOrphanError(e)) throw e; }
    };
  }

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
      if (!alive()) return; // orphaned content script — stop quietly
      let ok = false;
      try {
        ok = attempt(count);
      } catch (e) {
        if (isOrphanError(e)) return;
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

  window.__resolutionRetry = { runWithRetry, alive, t, defer, guard };
})();
