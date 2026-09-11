import { NextResponse, type NextRequest } from "next/server";
import { advanceFinishedAppointments } from "@/lib/crm/appointment-pipeline";
import { createServiceClient } from "@/lib/supabase/admin";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";
import { loadEnabledRules } from "@/lib/whatsapp/automations";
import { runAutomationReminders } from "@/lib/whatsapp/run-reminders";

export const runtime = "nodejs";

async function runReminders(request: NextRequest) {
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

  const now = new Date();

  // Durum taşıması mesajlaşmadan bağımsız — WhatsApp kapalı olsa da çalışır
  let pipeline = {
    appointmentsCompleted: 0,
    leadsAdvanced: 0,
    pipelineFailures: [] as string[],
  };
  try {
    pipeline = await advanceFinishedAppointments(supabase, now);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Randevu bitiş / durum taşıma başarısız",
      },
      { status: 500 },
    );
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({
      ...pipeline,
      sent: 0,
      skipped: 0,
      checked: 0,
      failures: pipeline.pipelineFailures,
      note: "WHATSAPP_ENABLED kapalı — sadece durum taşıması yapıldı",
    });
  }

  let rules;
  try {
    rules = await loadEnabledRules(supabase);
  } catch (err) {
    return NextResponse.json(
      {
        ...pipeline,
        error:
          err instanceof Error
            ? err.message
            : "message_rules okunamadı (migration uygulandı mı?)",
      },
      { status: 500 },
    );
  }

  if (!rules.length) {
    return NextResponse.json({
      ...pipeline,
      checked: 0,
      sent: 0,
      skipped: 0,
      failures: pipeline.pipelineFailures,
      note: "Aktif kural yok — /admin/automations",
    });
  }

  const run = await runAutomationReminders(supabase, rules, {
    now,
    sendText: (phone, body) => sendWhatsAppText(phone, body),
  });

  return NextResponse.json({
    ...pipeline,
    checked: run.checked,
    sent: run.sent,
    skipped: run.skipped,
    failures: [...pipeline.pipelineFailures, ...run.failures],
    rules: rules.map((r) => r.key),
  });
}

/** Vercel Cron varsayılan GET; VPS curl genelde POST. */
export async function GET(request: NextRequest) {
  return runReminders(request);
}

export async function POST(request: NextRequest) {
  return runReminders(request);
}
