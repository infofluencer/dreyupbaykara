import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTrackingParamsFromUrl } from "@/lib/marketing/attribution";
import { MARKETING_CLICK_LOGS_SITE } from "@/lib/marketing/constants";

export type MessageSource = "panel" | "app_echo" | "bot" | "system" | "ad";

const REF_RE = /\bRef:\s*([A-Z0-9]{6,12})\b/i;

export function extractLeadRef(body: string | null | undefined): string | null {
  return body?.match(REF_RE)?.[1]?.toUpperCase() ?? null;
}

type MetaAdStamp = {
  ctwaClid: string | null;
  sourceUrl: string | null;
  headline: string | null;
  fromAd?: boolean;
};

async function resolveLeadFromRef(
  supabase: SupabaseClient,
  leadRef: string,
  contactId: string,
  ad: MetaAdStamp,
) {
  const { data: source } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("lead_ref", leadRef)
    .maybeSingle();

  if (source?.matched_lead_id) {
    await stampMetaAdOnLead(supabase, source.matched_lead_id, ad);
    return source.matched_lead_id;
  }

  const { data: existingByRef } = await supabase
    .from("leads")
    .select("id")
    .eq("lead_ref", leadRef)
    .maybeSingle();

  if (existingByRef?.id) {
    await stampMetaAdOnLead(supabase, existingByRef.id, ad);
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
        gbraid: source.gbraid,
        wbraid: source.wbraid,
        msclkid: source.msclkid,
        ttclid: source.ttclid,
        ctwa_clid: ad.ctwaClid,
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
      await stampMetaAdOnLead(supabase, lead.id, ad);
    }
    return lead?.id ?? null;
  }

  return null;
}

function siteFromReferralUrl(url: string | null | undefined): string {
  const lower = (url ?? "").toLowerCase();
  if (lower.includes("endospineistanbul.com")) return "endospineistanbul";
  if (lower.includes("fitikameliyati.com")) return "fitikameliyati";
  if (lower.includes("endoskopikbelameliyati.com")) {
    return "endoskopikbelameliyati";
  }
  return MARKETING_CLICK_LOGS_SITE;
}

/**
 * Mevcut blank lead'e Meta reklam izini bas.
 * ctwa_clid olmasa bile fromAd / referral varsa UTM + channel yazar
 * (aksi halde ameliyat pastasında Organik kalırdı).
 */
async function stampMetaAdOnLead(
  supabase: SupabaseClient,
  leadId: string,
  options: MetaAdStamp,
) {
  const hasMetaSignal = Boolean(
    options.ctwaClid?.trim() ||
      options.sourceUrl?.trim() ||
      options.headline?.trim() ||
      options.fromAd,
  );
  if (!hasMetaSignal) return;

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "ctwa_clid, channel, fbclid, utm_source, utm_medium, utm_campaign, campaign, site",
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return;

  const fromUrl = parseTrackingParamsFromUrl(options.sourceUrl);
  const patch: Record<string, string> = {};

  if (options.ctwaClid?.trim() && !lead.ctwa_clid) {
    patch.ctwa_clid = options.ctwaClid.trim();
  }
  if (fromUrl.fbclid && !lead.fbclid) {
    patch.fbclid = fromUrl.fbclid;
  }
  if (!lead.utm_source) {
    patch.utm_source = fromUrl.utm_source ?? "facebook";
  }
  if (!lead.utm_medium) {
    patch.utm_medium = fromUrl.utm_medium ?? "paid";
  }
  if (!lead.utm_campaign && fromUrl.utm_campaign) {
    patch.utm_campaign = fromUrl.utm_campaign;
  }
  if (!lead.campaign) {
    const campaign =
      fromUrl.campaign ?? fromUrl.utm_campaign ?? options.headline;
    if (campaign) patch.campaign = campaign;
  }

  const channel = (lead.channel || "").trim().toLowerCase();
  const stampableChannel = new Set([
    "",
    "whatsapp",
    "website",
    "panel",
    "landing",
    "page",
  ]);
  if (stampableChannel.has(channel)) {
    patch.channel = "meta_ctwa";
  }

  if ((!lead.site || lead.site === "manual") && options.sourceUrl) {
    patch.site = siteFromReferralUrl(options.sourceUrl);
  }

  if (!Object.keys(patch).length) return;
  await supabase.from("leads").update(patch).eq("id", leadId);
}

/** Click-to-WhatsApp: Ref yoksa bile CRM lead aç — yoksa Meta kartı boş kalır. */
async function resolveLeadFromCtwa(
  supabase: SupabaseClient,
  contactId: string,
  options: MetaAdStamp,
): Promise<string | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("lead_id")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (conversation?.lead_id) {
    await stampMetaAdOnLead(supabase, conversation.lead_id, options);
    return conversation.lead_id;
  }

  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingLead?.id) {
    await stampMetaAdOnLead(supabase, existingLead.id, options);
    return existingLead.id;
  }

  const fromUrl = parseTrackingParamsFromUrl(options.sourceUrl);
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      contact_id: contactId,
      site: siteFromReferralUrl(options.sourceUrl),
      channel: "meta_ctwa",
      campaign: fromUrl.campaign ?? fromUrl.utm_campaign ?? options.headline,
      utm_source: fromUrl.utm_source ?? "facebook",
      utm_medium: fromUrl.utm_medium ?? "paid",
      utm_campaign: fromUrl.utm_campaign,
      fbclid: fromUrl.fbclid,
      ctwa_clid: options.ctwaClid,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[whatsapp] ctwa lead:", error.message);
    return null;
  }
  return lead?.id ?? null;
}

async function findOrCreateConversation(
  supabase: SupabaseClient,
  contact: {
    id: string;
    phone: string;
    name: string | null;
    is_patient?: boolean | null;
  },
  leadId: string | null,
) {
  const patientId = contact.is_patient ? contact.id : null;
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
        ...(leadId ? { lead_id: leadId } : {}),
        ...(patientId ? { patient_id: patientId } : {}),
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

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      contact_id: contact.id,
      patient_id: patientId,
      lead_id: leadId,
      wa_phone: contact.phone,
      contact_name: contact.name,
      status: "open",
    })
    .select("id")
    .single();

  if (conversationError?.code === "23505") {
    const { data: existingAfterRace } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .maybeSingle();
    return existingAfterRace?.id ?? null;
  }

  if (conversationError || !conversation) {
    console.error("[whatsapp] conversation create:", conversationError?.message);
    return null;
  }
  return conversation.id;
}

/**
 * Inbound webhook: contact upsert, optional Ref → lead, conversation, message.
 * Conversation preview / unread_count are maintained by DB trigger on insert.
 */
function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export async function ingestInboundWhatsAppMessage(
  supabase: SupabaseClient,
  options: {
    phone: string | null | undefined;
    contactName?: string | null;
    body: string | null;
    waMessageId: string;
    timestamp?: string;
    mediaType?: string | null;
    mediaId?: string | null;
    rawPayload?: unknown;
    ctwaClid?: string | null;
    fromAd?: boolean;
    sourceUrl?: string | null;
    headline?: string | null;
  },
): Promise<{
  conversationId: string;
  leadId: string | null;
  created: boolean;
} | null> {
  const phone = digitsOnly(options.phone);
  if (!phone || !options.waMessageId) return null;

  // Stub contact only — is_patient stays false until staff registers them.
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert(
      {
        phone,
        name: options.contactName || phone,
      },
      { onConflict: "phone" },
    )
    .select("id, name, phone, is_patient")
    .single();

  if (contactError || !contact) {
    console.error("[whatsapp] contact:", contactError?.message);
    return null;
  }

  const leadRef = extractLeadRef(options.body);
  let leadId: string | null = null;

  const adMeta: MetaAdStamp = {
    ctwaClid: options.ctwaClid ?? null,
    sourceUrl: options.sourceUrl ?? null,
    headline: options.headline ?? null,
    fromAd: options.fromAd,
  };

  if (leadRef) {
    leadId = await resolveLeadFromRef(
      supabase,
      leadRef,
      contact.id,
      adMeta,
    );
  }

  if (!leadId && (options.ctwaClid || options.fromAd)) {
    leadId = await resolveLeadFromCtwa(supabase, contact.id, adMeta);
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

  const created = (inserted?.length ?? 0) > 0;
  if (created && options.body) {
    await maybeRecordOptOut(supabase, phone, options.body);
  }

  return {
    conversationId,
    leadId,
    created,
  };
}

const OPT_OUT_RE = /^\s*(dur|stop|iptal|vazgeç|vazgec)\s*$/i;

async function maybeRecordOptOut(
  supabase: SupabaseClient,
  phone: string,
  body: string,
) {
  if (!OPT_OUT_RE.test(body.trim())) return;
  const digits = digitsOnly(phone);
  if (!digits) return;
  const { error } = await supabase.from("wa_message_opt_outs").upsert(
    { phone: digits, reason: "inbound_keyword" },
    { onConflict: "phone" },
  );
  if (error) {
    console.error("[whatsapp] opt-out:", error.message);
  }
}

/** Panel okunmamış sayacını sıfırla (telefondan etkileşim veya panel açılışı). */
export async function clearConversationUnread(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);
  if (error) {
    console.error("[whatsapp] clear unread:", error.message);
    return error.message;
  }
  return null;
}

/**
 * Coexistence: message sent from WhatsApp Business app (smb_message_echoes).
 * Telefondan mesaj gönderildiğinde konuşmayı panelde okundu sayar.
 */
export async function ingestWhatsAppAppEcho(
  supabase: SupabaseClient,
  options: {
    phone: string | null | undefined;
    body: string | null;
    waMessageId: string;
    timestamp?: string;
    mediaType?: string | null;
    mediaId?: string | null;
    rawPayload?: unknown;
  },
): Promise<{ conversationId: string; created: boolean } | null> {
  const phone = digitsOnly(options.phone);
  if (!phone || !options.waMessageId) return null;

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert({ phone }, { onConflict: "phone" })
    .select("id, name, phone, is_patient")
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

  await clearConversationUnread(supabase, conversationId);

  if (messageError?.code === "23505") {
    return { conversationId, created: false };
  }
  if (messageError) {
    console.error("[whatsapp] echo message:", messageError.message);
    return { conversationId, created: false };
  }

  return { conversationId, created: (inserted?.length ?? 0) > 0 };
}
