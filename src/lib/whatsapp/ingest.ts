import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageSource = "panel" | "app_echo" | "bot" | "system" | "ad";

const REF_RE = /\bRef:\s*([A-Z0-9]{6,12})\b/i;

export function extractLeadRef(body: string | null | undefined): string | null {
  return body?.match(REF_RE)?.[1]?.toUpperCase() ?? null;
}

async function resolveLeadFromRef(
  supabase: SupabaseClient,
  leadRef: string,
  contactId: string,
  ctwaClid: string | null,
) {
  const { data: source } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("lead_ref", leadRef)
    .maybeSingle();

  if (source?.matched_lead_id) {
    return source.matched_lead_id;
  }

  const { data: existingByRef } = await supabase
    .from("leads")
    .select("id")
    .eq("lead_ref", leadRef)
    .maybeSingle();

  if (existingByRef?.id) {
    return existingByRef.id;
  }

  if (source) {
    const { data: lead } = await supabase
      .from("leads")
      .insert({
        contact_id: contactId,
        site: source.site,
        channel: source.channel,
        campaign: source.campaign,
        utm_source: source.utm_source,
        utm_medium: source.utm_medium,
        utm_campaign: source.utm_campaign,
        gclid: source.gclid,
        fbclid: source.fbclid,
        ctwa_clid: ctwaClid,
        lead_ref: leadRef,
      })
      .select("id")
      .single();

    if (lead?.id) {
      await supabase
        .from("lead_sources")
        .update({
          matched_lead_id: lead.id,
          matched_at: new Date().toISOString(),
        })
        .eq("id", source.id);
    }
    return lead?.id ?? null;
  }

  return null;
}

async function findOrCreateConversation(
  supabase: SupabaseClient,
  contact: { id: string; phone: string; name: string | null },
  leadId: string | null,
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("contact_id", contact.id)
    .maybeSingle();

  if (existing) {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .update({
        wa_phone: contact.phone,
        contact_name: contact.name,
        status: "open",
        ...(leadId ? { lead_id: leadId, patient_id: contact.id } : {}),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error || !conversation) {
      console.error("[whatsapp] conversation reopen:", error?.message);
      return null;
    }
    return conversation.id;
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      contact_id: contact.id,
      patient_id: leadId ? contact.id : null,
      lead_id: leadId,
      wa_phone: contact.phone,
      contact_name: contact.name,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !conversation) {
    console.error("[whatsapp] conversation create:", error?.message);
    return null;
  }
  return conversation.id;
}

/**
 * Inbound webhook: contact upsert, optional Ref → lead, conversation, message.
 * Conversation preview / unread_count are maintained by DB trigger on insert.
 */
export async function ingestInboundWhatsAppMessage(
  supabase: SupabaseClient,
  options: {
    phone: string;
    contactName?: string | null;
    body: string | null;
    waMessageId: string;
    timestamp?: string;
    mediaType?: string | null;
    mediaId?: string | null;
    rawPayload?: unknown;
    ctwaClid?: string | null;
    fromAd?: boolean;
  },
): Promise<{
  conversationId: string;
  leadId: string | null;
  created: boolean;
} | null> {
  const phone = options.phone.replace(/\D/g, "");
  if (!phone) return null;

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert(
      {
        phone,
        name: options.contactName || phone,
      },
      { onConflict: "phone" },
    )
    .select("id, name, phone")
    .single();

  if (contactError || !contact) {
    console.error("[whatsapp] contact:", contactError?.message);
    return null;
  }

  const leadRef = extractLeadRef(options.body);
  let leadId: string | null = null;

  if (leadRef) {
    leadId = await resolveLeadFromRef(
      supabase,
      leadRef,
      contact.id,
      options.ctwaClid ?? null,
    );
  }

  const conversationId = await findOrCreateConversation(
    supabase,
    contact,
    leadId,
  );
  if (!conversationId) return null;

  const createdAt = options.timestamp
    ? new Date(Number(options.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const inboundSource: MessageSource | null =
    options.fromAd || options.ctwaClid || leadRef ? "ad" : null;

  const { data: inserted, error: messageError } = await supabase
    .from("messages")
    .upsert(
      {
        conversation_id: conversationId,
        wa_message_id: options.waMessageId,
        direction: "inbound",
        body: options.body,
        media_type: options.mediaType ?? null,
        media_url: options.mediaId ?? null,
        status: "received",
        source: inboundSource,
        raw_payload: options.rawPayload ?? null,
        created_at: createdAt,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (messageError?.code === "23505") {
    return { conversationId, leadId, created: false };
  }
  if (messageError) {
    console.error("[whatsapp] message:", messageError.message);
    return null;
  }

  return {
    conversationId,
    leadId,
    created: (inserted?.length ?? 0) > 0,
  };
}

/**
 * Coexistence: message sent from WhatsApp Business app (smb_message_echoes).
 */
export async function ingestWhatsAppAppEcho(
  supabase: SupabaseClient,
  options: {
    phone: string;
    body: string | null;
    waMessageId: string;
    timestamp?: string;
    mediaType?: string | null;
    mediaId?: string | null;
    rawPayload?: unknown;
  },
): Promise<{ conversationId: string; created: boolean } | null> {
  const phone = options.phone.replace(/\D/g, "");
  if (!phone || !options.waMessageId) return null;

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert({ phone }, { onConflict: "phone" })
    .select("id, name, phone")
    .single();

  if (contactError || !contact) {
    console.error("[whatsapp] echo contact:", contactError?.message);
    return null;
  }

  const conversationId = await findOrCreateConversation(
    supabase,
    contact,
    null,
  );
  if (!conversationId) return null;

  const createdAt = options.timestamp
    ? new Date(Number(options.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const { data: inserted, error: messageError } = await supabase
    .from("messages")
    .upsert(
      {
        conversation_id: conversationId,
        wa_message_id: options.waMessageId,
        direction: "outbound",
        body: options.body,
        media_type: options.mediaType ?? null,
        media_url: options.mediaId ?? null,
        status: "sent",
        sent_by: null,
        automated: false,
        source: "app_echo" satisfies MessageSource,
        raw_payload: options.rawPayload ?? null,
        created_at: createdAt,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (messageError?.code === "23505") {
    return { conversationId, created: false };
  }
  if (messageError) {
    console.error("[whatsapp] echo message:", messageError.message);
    return null;
  }

  return { conversationId, created: (inserted?.length ?? 0) > 0 };
}
