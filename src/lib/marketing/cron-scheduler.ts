import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { runMarketingSync } from "@/lib/marketing/sync/sync-daily-stats";

let started = false;
let running = false;

async function runTick() {
  if (running) {
    console.warn("[marketing-cron] atlandı, önceki tur bitmedi");
    return;
  }
  running = true;
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      console.error("[marketing-cron] SUPABASE_SERVICE_ROLE_KEY yok");
      return;
    }
    console.info("[marketing-cron] başladı");
    const result = await runMarketingSync(supabase, { mode: "cron" });
    console.info("[marketing-cron] bitti", {
      range: result.range,
      backfill: result.backfill,
      stats: result.stats.map((row) => ({
        platform: row.platform,
        rows: row.rows,
        error: row.error,
      })),
    });
  } catch (err) {
    console.error("[marketing-cron]", err);
  } finally {
    running = false;
  }
}

/** 02:00 İstanbul = 23:00 UTC (Türkiye DST yok) */
function msUntilNextUtcHours(hours: number[]): number {
  const now = Date.now();
  let soonest = Number.POSITIVE_INFINITY;
  for (const hour of hours) {
    const next = new Date();
    next.setUTCHours(hour, 0, 0, 0);
    if (next.getTime() <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    soonest = Math.min(soonest, next.getTime() - now);
  }
  return soonest;
}

function scheduleNext() {
  const wait = msUntilNextUtcHours([23]);
  console.info(
    "[marketing-cron] sonraki tur",
    Math.round(wait / 60_000),
    "dk sonra",
  );
  setTimeout(() => {
    void runTick().finally(() => {
      scheduleNext();
    });
  }, wait);
}

/** Dokploy / Docker: süreç içinde cron. Vercel json cron kullanılmıyor. */
export function startMarketingCronScheduler() {
  if (started) return;
  started = true;
  console.info("[marketing-cron] zamanlayıcı açık — günde bir, 02:00 İstanbul");
  scheduleNext();
}
