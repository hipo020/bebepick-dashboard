# YouTube background monitoring: historical status as of 2026-10-11

> ⚠️ **이 문서는 2026년 10월 11일의 과거 상태를 설명해.**
> 2026년 10월 20일 실제 Supabase 운영 DB 조회에서 `bebepick-youtube-live-fast` (당시 `jobid=2`)가 **30 seconds, active=true**로 재활성화된 것을 확인했어.
> 이 문서의 `Disabled` 섹션을 현재 운영 상태로 사용하지 말고, [최신 LIVE 신호·중지·복구 운영 인수인계](https://github.com/hipo020/bebepick-watcher/blob/main/docs/LIVE_SIGNAL_MONITORS_RUNBOOK_2026-10-20.md)를 우선 확인해.

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
