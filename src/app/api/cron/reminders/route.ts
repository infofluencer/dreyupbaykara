import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/cloud-api";
import {
  alreadyDispatched,
  buildTemplateBodyComponents,
  isPhoneOptedOut,
  isRuleDueNow,
  loadCandidateAppointments,
  loadEnabledRules,
  normalizePhoneDigits,
  previewAutomationBody,
} from "@/lib/whatsapp/automations";

export const runtime = "nodejs";

async function runReminders(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json(
      { error: "WHATSAPP_ENABLED kapalı", sent: 0 },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client yok" },
      { status: 503 },
    );
  }

  let rules;
  try {
    rules = await loadEnabledRules(supabase);
  } catch (err) {
    return NextResponse.json(
      {
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
      checked: 0,
      sent: 0,
      skipped: 0,
      failures: [] as string[],
      note: "Aktif kural yok — /admin/automations",
    });
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let checked = 0;
  const failures: string[] = [];

  for (const rule of rules) {
    if (!rule.template_name?.trim()) {
      failures.push(`${rule.key}: template_name boş`);
      continue;
    }

    let appointments;
    try {
      appointments = await loadCandidateAppointments(supabase, rule, now);
    } catch (err) {
      failures.push(
        `${rule.key}: ${err instanceof Error ? err.message : "randevu sorgu"}`,
      );
      continue;
    }

    for (const appointment of appointments) {
      checked += 1;
      if (!isRuleDueNow(rule, appointment.starts_at, now)) continue;

      if (await alreadyDispatched(supabase, appointment.id, rule.key)) {
        continue;
      }

      const phone = appointment.contact?.phone
        ? normalizePhoneDigits(appointment.contact.phone)
        : "";
      if (!phone || !appointment.contact) {
        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact?.id ?? null,
            phone: phone || null,
            template_name: rule.template_name,
            status: "skipped",
            error: "Telefon yok",
          },
          { onConflict: "appointment_id,rule_key" },
        );
        skipped += 1;
        continue;
      }

      if (await isPhoneOptedOut(supabase, phone)) {
        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact.id,
            phone,
            template_name: rule.template_name,
            status: "skipped",
            error: "Opt-out",
          },
          { onConflict: "appointment_id,rule_key" },
        );
        skipped += 1;
        continue;
      }

      const components = rule.include_body_params
        ? buildTemplateBodyComponents(
            appointment.contact.name,
            appointment.starts_at,
          )
        : undefined;

      try {
        const response = await sendWhatsAppTemplate(
          phone,
          rule.template_name,
          rule.language || "tr",
          components,
        );

        const { data: conversation } = await supabase
          .from("conversations")
          .upsert(
            {
              contact_id: appointment.contact.id,
              lead_id: appointment.lead_id,
              wa_phone: phone,
              contact_name: appointment.contact.name,
              last_message_at: new Date().toISOString(),
              status: "open",
            },
            { onConflict: "contact_id" },
          )
          .select("id")
          .single();

        if (conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            wa_message_id: response.messageId,
            direction: "outbound",
            body: `[Otomatik: ${rule.label}] ${previewAutomationBody(
              appointment.contact.name,
              appointment.starts_at,
            )}`,
            status: "sent",
            automated: true,
            source: "system",
            raw_payload: {
              appointment_id: appointment.id,
              rule_key: rule.key,
              template_name: rule.template_name,
            },
          });
        }

        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact.id,
            phone,
            template_name: rule.template_name,
            wa_message_id: response.messageId,
            status: "sent",
            error: null,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id,rule_key" },
        );

        // Eski tek-bayrak alanını da doldur (geri uyumluluk)
        if (rule.key === "appt_1d") {
          await supabase
            .from("appointments")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", appointment.id)
            .is("reminder_sent_at", null);
        }

        sent += 1;
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "Bilinmeyen hata";
        failures.push(`${rule.key}/${appointment.id}: ${message}`);
        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact.id,
            phone,
            template_name: rule.template_name,
            status: "failed",
            error: message,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id,rule_key" },
        );
      }
    }
  }

  return NextResponse.json({
    checked,
    sent,
    skipped,
    failures,
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
