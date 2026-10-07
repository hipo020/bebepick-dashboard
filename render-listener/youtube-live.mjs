// Public YouTube channel live-page probe. No YouTube account or API key required.
// Intentionally strict: scheduled streams and recommendations are not LIVE.
export function extractLiveFromHtml(html, finalUrl, expectedChannelId = null, expectedName = "") {
  const m = html.match(/(?:var\s+)?ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!m) return { live: false, videoId: null, reason: "no-player" };

  let player;
  try { player = JSON.parse(m[1]); }
  catch { return { live: false, videoId: null, reason: "invalid-player" }; }

  const details = player.videoDetails || {};
  const broadcast = player.microformat?.playerMicroformatRenderer?.liveBroadcastDetails || {};
  const videoId = String(details.videoId || "");
  const channelId = String(details.channelId || "");
  const author = String(details.author || "");

  // Reject any video outside the intended channel.
  if (expectedChannelId && channelId && channelId !== expectedChannelId) {
    return { live: false, videoId: null, reason: "wrong-channel" };
  }
  const channelName = author.replace(/\s+/g, "").toLowerCase();
  const expected = expectedName.replace(/\s+/g, "").toLowerCase();
  if (expected && channelName && channelName !== expected) {
    return { live: false, videoId: null, reason: "wrong-author" };
  }

  const realLive = broadcast.isLiveNow === true || details.isLive === true;
  if (!realLive || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { live: false, videoId: null, reason: "not-live" };
  }

  return { live: true, videoId, url: finalUrl, reason: "active-live" };
}

export const YOUTUBE_CHANNELS = [
  {
    slug: "bebepick",
    url: "https://www.youtube.com/@%EB%B2%A0%EB%B2%A0%ED%94%BD/live",
    channelId: null,
    expectedName: "베베픽"
  },
  {
    slug: "bebepick_plus",
    url: "https://www.youtube.com/channel/UCaj_w5UAMzh_rgd6ioI83xA/live",
    channelId: "UCaj_w5UAMzh_rgd6ioI83xA",
    expectedName: "베베픽플러스"
  }
];

export async function probeYoutubeLive(channel) {
  const res = await fetch(channel.url, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      "cache-control": "no-cache"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error("YouTube HTTP " + res.status);
  const html = await res.text();
  return extractLiveFromHtml(
    html,
    res.url,
    channel.channelId,
    channel.expectedName
  );
}
