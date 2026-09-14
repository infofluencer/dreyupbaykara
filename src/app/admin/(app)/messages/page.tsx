import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { requireAdminSession } from "@/lib/admin/auth";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { pickDisplayLead } from "@/lib/crm/lead-status";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_INBOX_TIME_RANGE,
  INBOX_RANGE_LIMIT,
  fetchInboxContactFlags,
  fetchInboxContactLeads,
  inboxRangeCutoffIso,
  type InboxContactLead,
} from "@/lib/whatsapp/inbox-range";
import { fetchThreadMessages } from "@/lib/whatsapp/thread-history";

const CONVERSATION_SELECT = `
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
`;

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; lead?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const query = await searchParams;
  const supabase = await createClient();

  if (query.lead && !query.c) {
    // Bir talebin birden fazla konuşması olabilir; maybeSingle() bu durumda
    // hata verip hastayı sohbetsiz bırakıyordu. En son yazışılanı aç.
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", query.lead)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1);
    const conversationId = data?.[0]?.id;
    if (conversationId) redirect(`/admin/messages?c=${conversationId}`);
  }

  const selectedId = query.c ?? null;
  const listCutoff = inboxRangeCutoffIso(DEFAULT_INBOX_TIME_RANGE);
  const listLimit = INBOX_RANGE_LIMIT[DEFAULT_INBOX_TIME_RANGE];

  let conversationQuery = supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (listCutoff) {
    conversationQuery = conversationQuery.gte("last_message_at", listCutoff);
  }
  const { data: conversations, error } = await conversationQuery.limit(listLimit);

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

  // Açılmak istenen sohbet dönem penceresine girmiyorsa tek tek getir.
  // Aksi halde liste dışı kalıyor ve panel gelen kutusuna atıyordu.
  let conversationRows = conversations ?? [];
  if (
    selectedId &&
    !conversationRows.some((row) => String(row.id) === selectedId)
  ) {
    const { data: pinned } = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("id", selectedId)
      .maybeSingle();
    if (pinned) conversationRows = [pinned, ...conversationRows];
  }

  const contactIds = [
    ...new Set(
      conversationRows
        .map((row) => row.contact_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: contactLeads }, { data: contactRows }, thread] =
    await Promise.all([
      fetchInboxContactLeads(supabase, contactIds).then((data) => ({ data })),
      fetchInboxContactFlags(supabase, contactIds).then((data) => ({ data })),
      selectedId
        ? fetchThreadMessages(supabase, selectedId, listCutoff)
        : Promise.resolve({ rows: [], hasOlder: false }),
    ]);

  const isPatientByContact = new Map(
    (contactRows ?? []).map((row) => [row.id, Boolean(row.is_patient)]),
  );

  const leadsByContact = new Map<string, InboxContactLead[]>();
  for (const lead of contactLeads ?? []) {
    const list = leadsByContact.get(lead.contact_id) ?? [];
    list.push(lead);
    leadsByContact.set(lead.contact_id, list);
  }

  const normalized = conversationRows.map((row) => {
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

  // Buraya düşüyorsa id geçersiz ya da yetki dışı: gelen kutusuna dön.
  if (selectedId && !normalized.some((row) => row.id === selectedId)) {
    redirect("/admin/messages");
  }

  const messages = thread.rows.map((message) => ({
    ...message,
    direction: message.direction as "inbound" | "outbound",
    source: message.source ?? null,
  }));

  return (
    <MessagesInbox
      conversations={normalized}
      selectedId={selectedId}
      messages={messages}
      hasOlderMessages={thread.hasOlder}
      apiEnabled={isWhatsAppEnabled()}
    />
  );
}
