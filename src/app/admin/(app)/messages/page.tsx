import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { requireAdminSession } from "@/lib/admin/auth";
import { isWhatsAppEnabled } from "@/lib/whatsapp/enabled";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; lead?: string }>;
}) {
  const session = await requireAdminSession([
    "admin",
    "doctor",
    "assistant",
  ]);
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

  const [{ data: conversations, error }, { data: staff }] = await Promise.all([
    supabase
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
      .limit(150),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["admin", "doctor", "assistant"])
      .order("full_name"),
  ]);

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

  const normalized = (conversations ?? []).map((row) => {
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
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
      patient_id: row.patient_id,
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
    };
  });

  if (selectedId && !normalized.some((row) => row.id === selectedId)) {
    redirect("/admin/messages");
  }

  let messages: Array<{
    id: string;
    direction: "inbound" | "outbound";
    body: string | null;
    status: string;
    automated: boolean | null;
    created_at: string;
    media_type: string | null;
    media_url: string | null;
  }> = [];

  if (selectedId) {
    const { data } = await supabase
      .from("messages")
      .select(
        "id, direction, body, status, automated, created_at, media_type, media_url",
      )
      .eq("conversation_id", selectedId)
      .order("created_at")
      .limit(500);
    messages = (data ?? []).map((message) => ({
      ...message,
      direction: message.direction as "inbound" | "outbound",
    }));
  }

  return (
    <MessagesInbox
      conversations={normalized}
      selectedId={selectedId}
      messages={messages}
      staff={(staff ?? []).map((member) => ({
        id: member.id,
        full_name: member.full_name,
      }))}
      currentUserId={session.userId}
      role={session.role}
      apiEnabled={isWhatsAppEnabled()}
    />
  );
}
