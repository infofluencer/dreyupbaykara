import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { requireAdminSession } from "@/lib/admin/auth";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { pickDisplayLead } from "@/lib/crm/lead-status";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; lead?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const query = await searchParams;
  const supabase = await createClient();

  if (query.lead && !query.c) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", query.lead)
      .maybeSingle();
    if (data) redirect(`/admin/messages?c=${data.id}`);
  }

  const selectedId = query.c ?? null;

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      `
        id,
        wa_phone,
        contact_name,
        status,
        last_message_at,
        last_message_preview,
        last_message_direction,
        unread_count,
        assigned_to,
        lead_id,
        contact_id,
        patient_id,
        leads (
          id,
          utm_source,
          utm_campaign,
          gclid,
          channel,
          site
        )
      `,
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(150);

  if (error) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Konuşmalar yüklenemedi. Migration{" "}
        <code>20260817120000_whatsapp_inbox_tracking.sql</code> uygulandı mı?
        <br />
        <span className="mt-1 block text-xs opacity-80">{error.message}</span>
      </p>
    );
  }

  const contactIds = [
    ...new Set(
      (conversations ?? [])
        .map((row) => row.contact_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  type LeadRow = {
    id: string;
    contact_id: string;
    status: string | null;
    stage: string;
    created_at: string;
    lost_reason: string | null;
    needs_followup: boolean | null;
  };

  const emptyLeads = Promise.resolve({ data: [] as LeadRow[] });
  const emptyContacts = Promise.resolve({
    data: [] as Array<{ id: string; is_patient: boolean | null }>,
  });
  const emptyMessages = Promise.resolve({
    data: [] as Array<{
      id: string;
      direction: string;
      body: string | null;
      status: string;
      automated: boolean | null;
      created_at: string;
      media_type: string | null;
      media_url: string | null;
      source: string | null;
    }>,
  });

  const [{ data: contactLeads }, { data: contactRows }, { data: messageRows }] =
    await Promise.all([
      contactIds.length
        ? supabase
            .from("leads")
            .select(
              "id, contact_id, status, stage, created_at, lost_reason, needs_followup",
            )
            .in("contact_id", contactIds)
            .order("created_at", { ascending: false })
            .limit(400)
        : emptyLeads,
      contactIds.length
        ? supabase
            .from("contacts")
            .select("id, is_patient")
            .in("id", contactIds)
        : emptyContacts,
      selectedId
        ? supabase
            .from("messages")
            .select(
              "id, direction, body, status, automated, created_at, media_type, media_url, source",
            )
            .eq("conversation_id", selectedId)
            .order("created_at")
            .limit(500)
        : emptyMessages,
    ]);

  const isPatientByContact = new Map(
    (contactRows ?? []).map((row) => [row.id, Boolean(row.is_patient)]),
  );

  const leadsByContact = new Map<string, LeadRow[]>();
  for (const lead of contactLeads ?? []) {
    const list = leadsByContact.get(lead.contact_id) ?? [];
    list.push(lead);
    leadsByContact.set(lead.contact_id, list);
  }

  const normalized = (conversations ?? []).map((row) => {
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    const active = pickDisplayLead(leadsByContact.get(row.contact_id) ?? []);
    return {
      id: row.id,
      wa_phone: row.wa_phone,
      contact_name: row.contact_name,
      status: row.status ?? "open",
      last_message_at: row.last_message_at,
      last_message_preview: row.last_message_preview,
      last_message_direction: row.last_message_direction,
      unread_count: row.unread_count ?? 0,
      assigned_to: row.assigned_to,
      lead_id: row.lead_id,
      contact_id: row.contact_id,
      patient_id: row.patient_id,
      is_patient: isPatientByContact.get(row.contact_id) ?? false,
      lead: lead
        ? {
            id: lead.id,
            utm_source: lead.utm_source,
            utm_campaign: lead.utm_campaign,
            gclid: lead.gclid,
            channel: lead.channel,
            site: lead.site,
          }
        : null,
      pipelineLead: active
        ? {
            id: active.id,
            status: active.status,
            lost_reason: active.lost_reason,
            needs_followup: active.needs_followup ?? false,
          }
        : null,
    };
  });

  if (selectedId && !normalized.some((row) => row.id === selectedId)) {
    redirect("/admin/messages");
  }

  const messages = (messageRows ?? []).map((message) => ({
    ...message,
    direction: message.direction as "inbound" | "outbound",
    source: message.source ?? null,
  }));

  return (
    <MessagesInbox
      conversations={normalized}
      selectedId={selectedId}
      messages={messages}
      apiEnabled={isWhatsAppEnabled()}
    />
  );
}
