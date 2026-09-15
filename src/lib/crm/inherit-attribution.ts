import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveLeadAttribution,
  type LeadSourceAttribution,
} from "@/lib/marketing/attribution";

const ATTRIBUTION_SELECT =
  "id, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, gbraid, wbraid, fbclid, ctwa_clid, msclkid, ttclid, lead_ref, created_at";

export type InheritAttributionRow = {
  id: string;
  site?: string | null;
  channel?: string | null;
  campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  ctwa_clid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
  lead_ref?: string | null;
  created_at?: string;
};

function clip(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Reklam / UTM / CTWA izi olan lead — panel blank lead değil. */
export function isAttributedLead(row: {
  channel?: string | null;
  campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  ctwa_clid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
}): boolean {
  if (clip(row.channel)?.toLowerCase() === "meta_ctwa") return true;
  return Boolean(
    clip(row.gclid) ||
      clip(row.gbraid) ||
      clip(row.wbraid) ||
      clip(row.fbclid) ||
      clip(row.ctwa_clid) ||
      clip(row.msclkid) ||
      clip(row.ttclid) ||
      clip(row.utm_source) ||
      clip(row.utm_medium) ||
      clip(row.utm_campaign) ||
      clip(row.campaign),
  );
}

/**
 * Insert için kopyalanacak alanlar (channel/site çağıran belirler).
 * lead_ref kopyalanmaz — unique constraint.
 */
export function attributionInsertFields(
  source: InheritAttributionRow | null | undefined,
): {
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  fbclid: string | null;
  ctwa_clid: string | null;
  msclkid: string | null;
  ttclid: string | null;
} {
  if (!source) {
    return {
      campaign: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      gclid: null,
      gbraid: null,
      wbraid: null,
      fbclid: null,
      ctwa_clid: null,
      msclkid: null,
      ttclid: null,
    };
  }
  return {
    campaign: clip(source.campaign),
    utm_source: clip(source.utm_source),
    utm_medium: clip(source.utm_medium),
    utm_campaign: clip(source.utm_campaign),
    gclid: clip(source.gclid),
    gbraid: clip(source.gbraid),
    wbraid: clip(source.wbraid),
    fbclid: clip(source.fbclid),
    ctwa_clid: clip(source.ctwa_clid),
    msclkid: clip(source.msclkid),
    ttclid: clip(source.ttclid),
  };
}

/** Gerçek reklam sitesi varsa onu kullan; yoksa null (çağıran manual yazar). */
export function inheritedSite(
  source: InheritAttributionRow | null | undefined,
): string | null {
  const site = clip(source?.site);
  if (!site || site === "manual") return null;
  return site;
}

async function loadLeadById(
  supabase: SupabaseClient,
  leadId: string,
): Promise<InheritAttributionRow | null> {
  const { data } = await supabase
    .from("leads")
    .select(ATTRIBUTION_SELECT)
    .eq("id", leadId)
    .maybeSingle();
  return (data as InheritAttributionRow | null) ?? null;
}

async function enrichFromLeadSources(
  supabase: SupabaseClient,
  lead: InheritAttributionRow,
): Promise<InheritAttributionRow> {
  const leadRef = clip(lead.lead_ref);
  let source: LeadSourceAttribution | null = null;

  if (leadRef) {
    const { data } = await supabase
      .from("lead_sources")
      .select(
        "lead_ref, site, utm_source, utm_medium, utm_campaign, campaign, gclid, gbraid, wbraid, fbclid, landing_url",
      )
      .eq("lead_ref", leadRef)
      .maybeSingle();
    source = (data as LeadSourceAttribution | null) ?? null;
  }

  if (!source) {
    const { data } = await supabase
      .from("lead_sources")
      .select(
        "lead_ref, site, utm_source, utm_medium, utm_campaign, campaign, gclid, gbraid, wbraid, fbclid, landing_url",
      )
      .eq("matched_lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    source = (data as LeadSourceAttribution | null) ?? null;
  }

  if (!source) return lead;

  const resolved = resolveLeadAttribution(
    {
      site: lead.site,
      utm_source: lead.utm_source,
      utm_campaign: lead.utm_campaign,
      campaign: lead.campaign,
      gclid: lead.gclid,
      gbraid: lead.gbraid,
      wbraid: lead.wbraid,
      fbclid: lead.fbclid,
      ctwa_clid: lead.ctwa_clid,
      lead_ref: lead.lead_ref,
    },
    source,
  );

  return {
    ...lead,
    site: resolved.resolvedSite ?? resolved.site ?? lead.site,
    campaign: resolved.campaign ?? lead.campaign,
    utm_source: resolved.utm_source ?? lead.utm_source,
    utm_medium: clip(source.utm_medium) ?? lead.utm_medium,
    utm_campaign: resolved.utm_campaign ?? lead.utm_campaign,
    gclid: resolved.gclid ?? lead.gclid,
    gbraid: resolved.gbraid ?? lead.gbraid,
    wbraid: resolved.wbraid ?? lead.wbraid,
    fbclid: resolved.fbclid ?? lead.fbclid,
    ctwa_clid: resolved.ctwa_clid ?? lead.ctwa_clid,
  };
}

/**
 * Aynı contact için first-touch attribution.
 * 1) conversations.lead_id attributed ise onu
 * 2) yoksa en eski attributed lead
 */
export async function findContactAttribution(
  supabase: SupabaseClient,
  contactId: string,
): Promise<InheritAttributionRow | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("lead_id")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (conversation?.lead_id) {
    const linked = await loadLeadById(supabase, conversation.lead_id);
    if (linked && isAttributedLead(linked)) {
      return enrichFromLeadSources(supabase, linked);
    }
  }

  const { data: siblings } = await supabase
    .from("leads")
    .select(ATTRIBUTION_SELECT)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(50);

  const firstTouch = ((siblings as InheritAttributionRow[] | null) ?? []).find(
    (row) => isAttributedLead(row),
  );
  if (!firstTouch) return null;
  return enrichFromLeadSources(supabase, firstTouch);
}
