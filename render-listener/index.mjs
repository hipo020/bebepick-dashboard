import http from "node:http";
import { createClient } from "@supabase/supabase-js";

const BEBEPICK_URL =
  process.env.BEBEPICK_URL || "https://kswhgzweesuwacgqruok.supabase.co";
const BEBEPICK_KEY =
  process.env.BEBEPICK_KEY ||
  "sb_publishable_XSYCZ48RRSxjI24XoR9CUg_-D5ae3KV";
const WATCH_URL =
  process.env.WATCH_URL ||
  "https://fergbabqmwnbkkxjvgkj.supabase.co/functions/v1/bebepick-watch";
const WATCH_KEY = process.env.WATCH_KEY || "";
const YOUTUBE_WATCH_URL = process.env.YOUTUBE_WATCH_URL ||
  WATCH_URL.replace(/\/bebepick-watch$/, "/bebepick-youtube-watch");
const FOCUS_DURATION_MS = 8 * 60_000;
const FOCUS_INTERVAL_MS = 20_000;
const PORT = Number(process.env.PORT || 10000);

if (!WATCH_KEY) throw new Error("WATCH_KEY missing");

const sb = createClient(BEBEPICK_URL, BEBEPICK_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

let realtimeStatus = "STARTING";
let lastRealtimeEventAt = null;
let lastTriggerAt = null;
let lastTriggerReason = null;
let lastTriggerResult = null;
let lastTriggerError = null;
let triggerTimer = null;
let running = false;
let rerun = false;
const pendingReasons = new Set();

// A homepage ON is a scheduling hint only; it must never send a Kakao order.
// The existing 30-second YouTube cron remains independent of homepage events.
const focusUntil = new Map();
const focusTimers = new Map();

function startYoutubeFocus(slug) {
  if (slug !== "bebepick" && slug !== "bebepick_plus") return;
  focusUntil.set(slug, Date.now() + FOCUS_DURATION_MS);
  if (focusTimers.has(slug)) return;

  const tick = async () => {
    if (Date.now() >= (focusUntil.get(slug) || 0)) {
      focusTimers.delete(slug);
      focusUntil.delete(slug);
      console.log("[youtube-focus-ended]", slug, now());
      return;
    }
    try {
      const res = await fetch(YOUTUBE_WATCH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-bebepick-watch": WATCH_KEY
        },
        body: JSON.stringify({ mode: "active", channel_slug: slug }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error("youtube focus HTTP " + res.status);
      const data = await res.json();
      const observation = (data.results || []).find((item) => item.slug === slug);
      console.log("[youtube-focus]", slug, observation?.reason || "no-observation",
        "live=" + Boolean(observation?.live), now());
      if (observation?.live === true) {
        focusUntil.delete(slug);
        focusTimers.delete(slug);
        // This does not send a phone order. Only the YouTube watcher can
        // issue a verified, deduplicated LIVE ntfy through bebepick-watch.
        return;
      }
    } catch (error) {
      console.warn("[youtube-focus-error]", slug,
        error instanceof Error ? error.message : String(error));
    }
    focusTimers.set(slug, setTimeout(tick, FOCUS_INTERVAL_MS));
  };
  focusTimers.set(slug, setTimeout(tick, 100));
}

function now() {
  return new Date().toISOString();
}

async function runWatcher() {
  clearTimeout(triggerTimer);
  triggerTimer = null;

  if (running) {
    rerun = true;
    return;
  }

  running = true;
  const reasons = [...pendingReasons];
  pendingReasons.clear();
  lastTriggerAt = now();
  lastTriggerReason = reasons.join(",") || "unknown";

  try {
    const res = await fetch(WATCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bebepick-watch": WATCH_KEY
      },
      body: JSON.stringify({ source: "render-realtime", reasons }),
      signal: AbortSignal.timeout(20000)
    });

    const text = await res.text();
    lastTriggerResult = { status: res.status, body: text.slice(0, 1000) };
    if (!res.ok) throw new Error("watcher HTTP " + res.status);
    lastTriggerError = null;
    console.log("[watcher]", res.status, lastTriggerReason, text.slice(0, 500));

    // Only a newly detected same-day homepage ON starts faster YouTube checks.
    // Stock changes and old pre-opened broadcasts do not start focus mode.
    const data = JSON.parse(text);
    for (const slug of data?.events?.home_on_channels || []) {
      startYoutubeFocus(slug);
    }
  } catch (error) {
    lastTriggerError = error instanceof Error ? error.message : String(error);
    console.error("[watcher-error]", lastTriggerReason, lastTriggerError);
    rerun = true;
  } finally {
    running = false;
    if (rerun || pendingReasons.size) {
      rerun = false;
      triggerTimer = setTimeout(runWatcher, 800);
    }
  }
}

function schedule(reason) {
  pendingReasons.add(reason);
  lastRealtimeEventAt = now();

  if (running) {
    rerun = true;
    return;
  }

  if (!triggerTimer) {
    triggerTimer = setTimeout(runWatcher, 350);
  }
}

function onChange(table) {
  return (payload) => {
    const eventType = String(payload?.eventType || "change");
    console.log("[realtime]", table, eventType, now());
    schedule(table + ":" + eventType);
  };
}

const channel = sb
  .channel("bebepick-render-listener")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "dolls" },
    onChange("dolls")
  )
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "shop_products" },
    onChange("shop_products")
  )
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "broadcast_queue" },
    onChange("broadcast_queue")
  )
  .subscribe((status) => {
    realtimeStatus = status;
    console.log("[realtime-status]", status, now());
    if (status === "SUBSCRIBED") schedule("realtime:subscribed");
  });

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function proxyNtfy(req, res) {
  if (req.headers["x-bebepick-watch"] !== WATCH_KEY) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const topic = String(payload?.topic || "");
    if (!topic.startsWith("bebepick-hipo020-")) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "invalid topic" }));
      return;
    }

    const upstream = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    const body = await upstream.text();

    res.writeHead(upstream.status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(body || JSON.stringify({ ok: upstream.ok }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notify-proxy-error]", message);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/notify") {
    await proxyNtfy(req, res);
    return;
  }

  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify({
    ok: true,
    realtime_status: realtimeStatus,
    last_realtime_event_at: lastRealtimeEventAt,
    last_trigger_at: lastTriggerAt,
    last_trigger_reason: lastTriggerReason,
    last_trigger_result: lastTriggerResult,
    last_trigger_error: lastTriggerError,
    youtube_focus_channels: [...focusUntil.keys()]
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("[http] listening", PORT);
});

async function shutdown(signal) {
  console.log("[shutdown]", signal);
  for (const timer of focusTimers.values()) clearTimeout(timer);
  focusTimers.clear();
  try { await sb.removeChannel(channel); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
