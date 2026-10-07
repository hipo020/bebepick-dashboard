// Probe the public LIVE player without YouTube Data API search quota.
// This is best-effort monitoring: never interpret errors as offline or send on uncertain identity.

export const YOUTUBE_CHANNELS = [
  {
    slug: "bebepick",
    url: "https://www.youtube.com/@베베픽/live",
    expectedName: "베베픽"
  },
  {
    slug: "bebepick_plus",
    url: "https://www.youtube.com/@베베픽플러스/live",
    expectedName: "베베픽플러스"
  }
];

function embeddedJSON(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const begin = html.indexOf("{", start + marker.length);
  if (begin < 0 || begin - start > 128) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = begin; i < html.length && i < begin + 800000; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(begin, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

export function extractLiveFromHtml(html, expectedName = "") {
  const player = embeddedJSON(html, "ytInitialPlayerResponse");
  if (!player) return { live: false, videoId: null, reason: "player-unavailable", trustworthy: false };
  const video = player.videoDetails || {};
  const broadcast = player.microformat?.playerMicroformatRenderer?.liveBroadcastDetails || {};
  const author = String(video.author || "").replace(/\s/g, "").toLowerCase();
  const expected = expectedName.replace(/\s/g, "").toLowerCase();
  if (!author || (expected && author !== expected)) {
    return { live: false, videoId: null, reason: "channel-not-verified", trustworthy: false };
  }

  const id = String(video.videoId || "");
  if (broadcast.isLiveNow !== true || !/^[\w-]{11}$/.test(id)) {
    return { live: false, videoId: null, reason: "not-live", trustworthy: true };
  }

  const started = Date.parse(String(broadcast.startTimestamp || ""));
  return {
    live: true, videoId: id, reason: "live-now", trustworthy: true,
    startedAt: Number.isFinite(started) ? new Date(started).toISOString() : null
  };
}

export async function probeYoutubeLive(channel) {
  const response = await fetch(channel.url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      "cache-control": "no-cache"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8500)
  });
  if (!response.ok) throw new Error("youtube HTTP " + response.status);
  const html = await response.text();
  return {
    ...extractLiveFromHtml(html, channel.expectedName),
    checkedUrl: response.url
  };
}
