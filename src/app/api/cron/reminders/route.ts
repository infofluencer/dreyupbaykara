import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/cloud-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const templateName = process.env.WHATSAPP_APPOINTMENT_TEMPLATE;
  if (!templateName) {
    return NextResponse.json(
      { error: "WHATSAPP_APPOINTMENT_TEMPLATE tanımlı değil" },
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

  const now = new Date();
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "id, lead_id, starts_at, reminder_minutes_before, leads(contact_id, contacts(id, phone))",
    )
    .in("status", ["scheduled", "confirmed"])
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lt("starts_at", to.toISOString())
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const failures: string[] = [];
  for (const appointment of appointments ?? []) {
    const reminderAt =
      new Date(appointment.starts_at).getTime() -
      appointment.reminder_minutes_before * 60 * 1000;
    if (reminderAt > now.getTime()) continue;

    const lead = Array.isArray(appointment.leads)
      ? appointment.leads[0]
      : appointment.leads;
    const contact = Array.isArray(lead?.contacts)
      ? lead.contacts[0]
      : lead?.contacts;
    if (!contact?.phone) continue;

    try {
      const response = await sendWhatsAppTemplate(
        contact.phone,
        templateName,
        "tr",
      );
      const { data: conversation } = await supabase
        .from("conversations")
        .upsert(
          {
            contact_id: contact.id,
            lead_id: appointment.lead_id,
            last_message_at: new Date().toISOString(),
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
          body: `[Randevu hatırlatma şablonu: ${templateName}]`,
          status: "sent",
          automated: true,
          raw_payload: {
            appointment_id: appointment.id,
            template_name: templateName,
          },
        });
      }

      await supabase
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", appointment.id)
        .is("reminder_sent_at", null);
      sent += 1;
    } catch (sendError) {
      failures.push(
        sendError instanceof Error ? sendError.message : "Bilinmeyen hata",
      );
    }
  }

  return NextResponse.json({
    checked: appointments?.length ?? 0,
    sent,
    failures,
  });
}

