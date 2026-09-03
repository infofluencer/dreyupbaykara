import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { marketingSyncDays } from "@/lib/marketing/config";
import { runMarketingSync } from "@/lib/marketing/sync/sync-daily-stats";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handleMarketingSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client yok" },
      { status: 503 },
    );
  }

  try {
    const result = await runMarketingSync(supabase, {
      mode: "full",
      days: marketingSyncDays(),
    });
    return NextResponse.json({
      ok: true,
      bootstrap: result.bootstrap,
      range: result.range,
      backfill: result.backfill,
      campaigns: result.campaigns,
      stats: result.stats,
      googleExtended: result.googleExtended,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Marketing sync hatası",
      },
      { status: 500 },
    );
  }
}

/** Elle: 720 gün Google + Meta. Gece cron süreç içinde 30 gün yeniler. */
export async function GET(request: NextRequest) {
  return handleMarketingSync(request);
}

export async function POST(request: NextRequest) {
  return handleMarketingSync(request);
}
