/* Queue position and ETA math. No private information or network calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BebepickQueueMath = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function validDateMs(iso) {
    const value = Date.parse(iso || "");
    return Number.isFinite(value) ? value : null;
  }

  // Positions on this page are always one-based. Raw current_idx is zero-based.
  function estimate(queue, target, nowMs) {
    const current = Number(queue?.current_position);
    const total = Number(queue?.queue_length);
    const t = Number(target);
    if (!Number.isSafeInteger(t) || t < 1) return { kind: "missing" };
    if (t > total) return { kind: "out_of_range", total };
    if (!Number.isSafeInteger(current) || current < 1) return { kind: "not_started" };
    if (t < current) return { kind: "passed" };
    if (t === current) return { kind: "your_turn" };
    const observed = validDateMs(queue?.observed_at);
    const age = observed === null ? Infinity : Math.max(0, nowMs - observed);
    // Observations are change-only. A healthy watcher can confirm that the
    // same position persists without inserting a new observation row.
    if (age > 10 * 60 * 1000 && !queue?.monitoring_recent) {
      return { kind: "stale", minutesAgo: Math.round(age / 60000) };
    }
    const median = Number(queue?.median_seconds);
    const low = Number(queue?.p25_seconds);
    const high = Number(queue?.p75_seconds);
    const sampleCount = Number(queue?.duration_sample_count);
    if (sampleCount < 3 || !Number.isFinite(median) || median <= 0 ||
        !Number.isFinite(low) || !Number.isFinite(high)) {
      return { kind: "insufficient", sampleCount: sampleCount || 0 };
    }
    const transitions = Array.isArray(queue?.transitions) ? queue.transitions : [];
    const lastTransition = transitions[transitions.length - 1];
    const currentStarted = lastTransition?.position === current
      ? validDateMs(lastTransition?.observed_at) : null;
    const currentElapsed = currentStarted === null
      ? 0 : Math.max(0, (nowMs - currentStarted) / 1000);
    const ahead = t - current;
    const nextAfterCurrent = Math.max(0, ahead - 1);
    // Current slot may already exceed the median. Avoid treating it as certainly done.
    const currentRemaining = Math.max(60, median - currentElapsed);
    const currentLow = Math.max(0, low - currentElapsed);
    const currentHigh = Math.max(60, Math.max(high - currentElapsed, high * 0.5));
    const estimatedSec = currentRemaining + nextAfterCurrent * median;
    const minSec = currentLow + nextAfterCurrent * Math.max(60, low);
    const maxSec = currentHigh + nextAfterCurrent * Math.max(120, high * 1.5);
    return {
      kind: "estimated",
      ahead,
      currentElapsedSeconds: Math.round(currentElapsed),
      sampleCount,
      minutes: Math.max(1, Math.round(estimatedSec / 60)),
      fromMinutes: Math.max(0, Math.floor(minSec / 60)),
      toMinutes: Math.max(1, Math.ceil(maxSec / 60)),
      fromAt: new Date(nowMs + minSec * 1000).toISOString(),
      toAt: new Date(nowMs + maxSec * 1000).toISOString(),
    };
  }

  function prettyDuration(seconds) {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s < 0) return "—";
    const m = Math.floor(s / 60), sec = Math.round(s % 60);
    if (m >= 60) return Math.floor(m / 60) + "시간 " + String(m % 60).padStart(2,"0") + "분";
    return m > 0 ? m + "분 " + String(sec).padStart(2,"0") + "초" : sec + "초";
  }

  return {estimate, prettyDuration, validDateMs};
});
