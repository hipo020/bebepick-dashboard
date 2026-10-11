# YouTube background monitoring: paused 2026-10-11

Goal: use the official YouTube Android LIVE push notification as the primary
trigger, while leaving on-demand checks for ambiguous notifications enabled.

## Disabled

1. Supabase pg_cron job 2: all-day Youtube watcher (once per minute, not 30
seconds). Disabled in live DB with SQL:
    SELECT cron.alter_job(job_id := 2, active := false);
2. Render homepage-ON-triggered focused YouTube watcher: 20-second checks for
up to 8 minutes. Disabled by default in render-listener/index.mjs unless
YOUTUBE_FOCUS_ENABLED=true is explicitly set.

Supabase job 1 (stock/queue) and job 3 (Render keepalive) remain enabled.
Realtime notifications, inventory changes and orders continue working.

## Remain enabled

- YouTube Android push LIVE format alert -> one-shot Kakao order.
- Ambiguous YouTube alerts -> on-demand /verify checks only.
- Inventory, price, broadcast queue and realtime notifications.
- New-item millisecond schedule and deduplication.

The /verify endpoint can still access YouTube pages. Disabling always-on
polling trades away a fallback when phone notifications are delayed/missed.

## Re-enable ONLY after user approval

- Supabase: first inspect cron.job, then
    SELECT cron.alter_job(job_id := 2, active := true);
- Render: set YOUTUBE_FOCUS_ENABLED=true on bebepick-realtime-listener and
confirm youtube_focus_enabled:true in the health response after redeploy.

These are reversible controls, NOT an automatic reactivation request.
