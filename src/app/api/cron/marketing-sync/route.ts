import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { marketingCronSyncDays } from "@/lib/marketing/config";
import { runMarketingSync } from "@/lib/marketing/sync/sync-daily-stats";

export const runtime = "nodejs";

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
      days: marketingCronSyncDays(),
      mode: "cron",
    });
    return NextResponse.json({
      ok: true,
      bootstrap: result.bootstrap,
      range: result.range,
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

/** Vercel Cron GET; VPS curl genelde POST. Günde 1–2 kez yeterli. */
export async function GET(request: NextRequest) {
  return handleMarketingSync(request);
}

export async function POST(request: NextRequest) {
  return handleMarketingSync(request);
}
