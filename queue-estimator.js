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

  // The most recent eight COMPLETED one-step turns are used for both the
  // headline mean and the existing historical spread. An incomplete/current
  // turn and jumped/missing indices are not counted as zero-duration turns.
  function recentDurationStats(queue) {
    const transitions = Array.isArray(queue?.transitions) ? queue.transitions : [];
    const samples = transitions
      .map(turn => turn?.duration_seconds)
      .filter(seconds => typeof seconds === "number" &&
        Number.isFinite(seconds) && seconds >= 10 && seconds <= 4 * 3600)
      .slice(-8);
    const count = samples.length;
    return {
      count,
      averageSeconds: count >= 3
        ? samples.reduce((total, seconds) => total + seconds, 0) / count
        : null
    };
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
    if (age > 6 * 60 * 60 * 1000 ||
        (age > 10 * 60 * 1000 && !queue?.monitoring_recent)) {
      return { kind: "stale", minutesAgo: Math.round(age / 60000) };
    }
    const stats = recentDurationStats(queue);
    const average = stats.averageSeconds;
    const low = Number(queue?.p25_seconds);
    const high = Number(queue?.p75_seconds);
    const sampleCount = stats.count;
    if (sampleCount < 3 || average === null || !Number.isFinite(average) ||
        !Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) {
      return { kind: "insufficient", sampleCount };
    }
    const transitions = Array.isArray(queue?.transitions) ? queue.transitions : [];
    const lastTransition = transitions[transitions.length - 1];
    const currentStarted = lastTransition?.position === current
      ? validDateMs(lastTransition?.observed_at) : null;
    const currentElapsed = currentStarted === null
      ? 0 : Math.max(0, (nowMs - currentStarted) / 1000);
    const ahead = t - current;
    const nextAfterCurrent = Math.max(0, ahead - 1);
    // This is a rough mean-based estimate, not a promised wait time.
    // Subtract elapsed time from the CURRENT turn only, and never claim that
    // an overlong current turn has certainly finished.
    const currentRemaining = Math.max(60, average - currentElapsed);
    const currentLow = Math.max(0, low - currentElapsed);
    const currentHigh = Math.max(60, Math.max(high - currentElapsed, high * 0.5));
    const estimatedSec = currentRemaining + nextAfterCurrent * average;
    // The historic interquartile spread is illustrative, not a confidence
    // interval. Guarantee that the displayed range contains the mean.
    const minSec = Math.min(
      estimatedSec, currentLow + nextAfterCurrent * Math.max(60, low)
    );
    const maxSec = Math.max(
      estimatedSec, currentHigh + nextAfterCurrent * Math.max(120, high * 1.5)
    );
    return {
      kind: "estimated",
      ahead,
      currentElapsedSeconds: Math.round(currentElapsed),
      sampleCount,
      averageSeconds: Math.round(average),
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

  return {estimate, recentDurationStats, prettyDuration, validDateMs};
});
