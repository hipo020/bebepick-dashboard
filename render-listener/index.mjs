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
    lastTriggerError = null;
    console.log("[watcher]", res.status, lastTriggerReason, text.slice(0, 500));
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

const server = http.createServer((req, res) => {
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
    last_trigger_error: lastTriggerError
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("[http] listening", PORT);
});

async function shutdown(signal) {
  console.log("[shutdown]", signal);
  try { await sb.removeChannel(channel); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
