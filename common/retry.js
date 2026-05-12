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
