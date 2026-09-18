import "server-only";

import {
  isAttributedLead,
  type InheritAttributionRow,
} from "@/lib/crm/inherit-attribution";
import {
  classifyAdPlatformWithEvidence,
  type AdPlatform,
  type SourceRow,
} from "@/lib/crm/source-kind";
import {
  resolveLeadAttribution,
  type LeadSourceAttribution,
} from "@/lib/marketing/attribution";
import { createClient } from "@/lib/supabase/server";

/** Attribution nereden geldi (audit). */
export type SurgeryAttrOrigin =
  | "lead"
  | "lead_sources"
  | "sibling"
  | "none";

export type SurgerySourcePatient = {
  leadId: string;
  contactId: string | null;
  name: string | null;
  phone: string | null;
  platform: AdPlatform;
  /** ameliyat_edildi'ye geçiş anı */
  surgeryAt: string;
  /** lead | lead_sources | sibling | none */
  attrOrigin: SurgeryAttrOrigin;
  /** Örn. fbclid, ctwa_clid, sinyal yok */
  attrSignal: string;
};

export type SurgerySourceStats = {
  total: number;
  platforms: Record<AdPlatform, number>;
  patients: SurgerySourcePatient[];
};

const emptyPlatforms = (): Record<AdPlatform, number> => ({
  google_ads: 0,
  meta: 0,
  other: 0,
  organic: 0,
});

const LEAD_SOURCE_SELECT =
  "id, contact_id, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, gbraid, wbraid, fbclid, ctwa_clid, msclkid, ttclid, lead_ref, contacts(id, name, phone)";

const SIBLING_ATTR_SELECT =
  "id, contact_id, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, gbraid, wbraid, fbclid, ctwa_clid, msclkid, ttclid, lead_ref, created_at";

const LEAD_SOURCES_ATTR_SELECT =
  "id, lead_ref, matched_lead_id, site, utm_source, utm_medium, utm_campaign, campaign, gclid, gbraid, wbraid, fbclid, landing_url, created_at";

type LeadRow = SourceRow & {
  id: string;
  contact_id?: string | null;
  lead_ref?: string | null;
  site?: string | null;
  contacts?:
    | { id?: string; name?: string | null; phone?: string | null }
    | Array<{ id?: string; name?: string | null; phone?: string | null }>
    | null;
};

type LeadSourceRow = LeadSourceAttribution & {
  id: string;
  matched_lead_id?: string | null;
  created_at?: string;
};

function firstContact(lead: LeadRow) {
  const raw = lead.contacts;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function clip(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toSourceRow(
  lead: SourceRow & {
    site?: string | null;
    lead_ref?: string | null;
  },
  source?: LeadSourceAttribution | null,
): SourceRow & { site?: string | null } {
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
    site: resolved.resolvedSite ?? resolved.site ?? lead.site,
    channel: lead.channel,
    campaign: resolved.campaign ?? lead.campaign,
    utm_source: resolved.utm_source ?? lead.utm_source,
    utm_medium: clip(source.utm_medium) ?? lead.utm_medium,
    utm_campaign: resolved.utm_campaign ?? lead.utm_campaign,
    gclid: resolved.gclid ?? lead.gclid,
    gbraid: resolved.gbraid ?? lead.gbraid,
    wbraid: resolved.wbraid ?? lead.wbraid,
    fbclid: resolved.fbclid ?? lead.fbclid,
    ctwa_clid: resolved.ctwa_clid ?? lead.ctwa_clid,
    msclkid: lead.msclkid,
    ttclid: lead.ttclid,
  };
}

function rowHasStrongerSignal(before: SourceRow, after: SourceRow): boolean {
  const b = classifyAdPlatformWithEvidence(before);
  const a = classifyAdPlatformWithEvidence(after);
  if (b.platform === "organic" && a.platform !== "organic") return true;
  if (b.signal === "sinyal yok" && a.signal !== "sinyal yok") return true;
  return false;
}

/**
 * lead_sources: lead_ref veya matched_lead_id ile batch yükle.
 */
async function loadLeadSourcesForLeads(
  leads: { id: string; lead_ref?: string | null }[],
): Promise<{
  byRef: Map<string, LeadSourceRow>;
  byMatchedLead: Map<string, LeadSourceRow>;
}> {
  const byRef = new Map<string, LeadSourceRow>();
  const byMatchedLead = new Map<string, LeadSourceRow>();
  if (!leads.length) return { byRef, byMatchedLead };

  const supabase = await createClient();
  const refs = [
    ...new Set(
      leads.map((l) => clip(l.lead_ref)).filter((r): r is string => Boolean(r)),
    ),
  ];
  const leadIds = leads.map((l) => l.id);

  const chunkSize = 100;

  for (let i = 0; i < refs.length; i += chunkSize) {
    const chunk = refs.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("lead_sources")
      .select(LEAD_SOURCES_ATTR_SELECT)
      .in("lead_ref", chunk);
    if (error) {
      console.error("[marketing] surgery lead_sources by ref:", error.message);
      continue;
    }
    for (const row of (data as LeadSourceRow[]) ?? []) {
      const ref = clip(row.lead_ref);
      if (ref && !byRef.has(ref)) byRef.set(ref, row);
    }
  }

  for (let i = 0; i < leadIds.length; i += chunkSize) {
    const chunk = leadIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("lead_sources")
      .select(LEAD_SOURCES_ATTR_SELECT)
      .in("matched_lead_id", chunk)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(
        "[marketing] surgery lead_sources by match:",
        error.message,
      );
      continue;
    }
    for (const row of (data as LeadSourceRow[]) ?? []) {
      const matched = clip(row.matched_lead_id);
      if (matched && !byMatchedLead.has(matched)) {
        byMatchedLead.set(matched, row);
      }
    }
  }

  return { byRef, byMatchedLead };
}

function pickSourceForLead(
  lead: { id: string; lead_ref?: string | null },
  byRef: Map<string, LeadSourceRow>,
  byMatchedLead: Map<string, LeadSourceRow>,
): LeadSourceRow | null {
  const ref = clip(lead.lead_ref);
  if (ref && byRef.has(ref)) return byRef.get(ref) ?? null;
  return byMatchedLead.get(lead.id) ?? null;
}

/**
 * Organik görünen ameliyat lead'leri için aynı contact'taki first-touch
 * attributed sibling'i bul (takvim/manual blank lead mirası).
 */
async function firstTouchByContact(
  contactIds: string[],
): Promise<Map<string, InheritAttributionRow>> {
  const map = new Map<string, InheritAttributionRow>();
  if (!contactIds.length) return map;

  const supabase = await createClient();
  const chunkSize = 100;
  const siblings: (InheritAttributionRow & {
    contact_id?: string | null;
  })[] = [];

  for (let i = 0; i < contactIds.length; i += chunkSize) {
    const chunk = contactIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("leads")
      .select(SIBLING_ATTR_SELECT)
      .in("contact_id", chunk)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[marketing] surgery sibling attribution:", error.message);
      continue;
    }
    for (const row of (data as (InheritAttributionRow & {
      contact_id?: string | null;
    })[]) ?? []) {
      siblings.push(row);
    }
  }

  const { byRef, byMatchedLead } = await loadLeadSourcesForLeads(
    siblings.map((s) => ({ id: s.id, lead_ref: s.lead_ref })),
  );

  for (const row of siblings) {
    const contactId = row.contact_id;
    if (!contactId || map.has(contactId)) continue;
    const source = pickSourceForLead(row, byRef, byMatchedLead);
    const enriched = toSourceRow(row, source) as InheritAttributionRow;
    if (isAttributedLead(enriched)) {
      map.set(contactId, { ...row, ...enriched });
    }
  }
  return map;
}

/**
 * Seçili dönemde ameliyat_edildi'ye geçen lead'lerin reklam kaynağı + hasta listesi.
 * Kaynak: leads → lead_sources (+ landing_url) → contact first-touch sibling.
 */
export async function loadSurgerySourceStats(
  startDate: string,
  endDate: string,
  siteFilter: string | null = null,
): Promise<SurgerySourceStats> {
  const platforms = emptyPlatforms();
  const supabase = await createClient();

  const fromIso = new Date(`${startDate}T00:00:00+03:00`).toISOString();
  const endExclusive = new Date(`${endDate}T24:00:00+03:00`).toISOString();

  const { data: history, error: historyError } = await supabase
    .from("lead_status_history")
    .select("lead_id, created_at")
    .eq("to_status", "ameliyat_edildi")
    .gte("created_at", fromIso)
    .lt("created_at", endExclusive)
    .order("created_at", { ascending: false })
    .limit(3000);

  if (historyError) {
    console.error("[marketing] surgery history:", historyError.message);
    return { total: 0, platforms, patients: [] };
  }

  // Lead başına en güncel ameliyat_edildi geçişi
  const surgeryAtByLead = new Map<string, string>();
  for (const row of history ?? []) {
    if (!surgeryAtByLead.has(row.lead_id)) {
      surgeryAtByLead.set(row.lead_id, row.created_at);
    }
  }

  const leadIds = [...surgeryAtByLead.keys()];
  if (!leadIds.length) {
    return { total: 0, platforms, patients: [] };
  }

  const chunkSize = 200;
  const leads: LeadRow[] = [];

  for (let i = 0; i < leadIds.length; i += chunkSize) {
    const chunk = leadIds.slice(i, i + chunkSize);
    let query = supabase
      .from("leads")
      .select(LEAD_SOURCE_SELECT)
      .in("id", chunk);

    if (siteFilter) {
      query = query.eq("site", siteFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[marketing] surgery leads:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      leads.push(row as LeadRow);
    }
  }

  const { byRef, byMatchedLead } = await loadLeadSourcesForLeads(leads);

  const needsSibling = leads.filter((lead) => {
    const source = pickSourceForLead(lead, byRef, byMatchedLead);
    const enriched = toSourceRow(lead, source);
    return (
      classifyAdPlatformWithEvidence(enriched).platform === "organic" &&
      lead.contact_id
    );
  });
  const siblingByContact = await firstTouchByContact([
    ...new Set(
      needsSibling
        .map((lead) => lead.contact_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]);

  const patients: SurgerySourcePatient[] = [];

  for (const lead of leads) {
    const rawEvidence = classifyAdPlatformWithEvidence(lead);
    const source = pickSourceForLead(lead, byRef, byMatchedLead);
    const enriched = toSourceRow(lead, source);
    let evidence = classifyAdPlatformWithEvidence(enriched);
    let attrOrigin: SurgeryAttrOrigin = "none";

    if (evidence.platform !== "organic") {
      attrOrigin =
        rawEvidence.platform !== "organic"
          ? "lead"
          : rowHasStrongerSignal(lead, enriched)
            ? "lead_sources"
            : "lead";
    } else if (lead.contact_id) {
      const sibling = siblingByContact.get(lead.contact_id);
      if (sibling) {
        evidence = classifyAdPlatformWithEvidence(sibling);
        if (evidence.platform !== "organic") {
          attrOrigin = "sibling";
        }
      }
    }

    const platform = evidence.platform;
    platforms[platform] += 1;
    const contact = firstContact(lead);
    patients.push({
      leadId: lead.id,
      contactId: contact?.id ?? lead.contact_id ?? null,
      name: contact?.name?.trim() || null,
      phone: contact?.phone?.trim() || null,
      platform,
      surgeryAt: surgeryAtByLead.get(lead.id) ?? "",
      attrOrigin,
      attrSignal: evidence.signal,
    });
  }

  patients.sort((a, b) => {
    const ta = a.surgeryAt ? new Date(a.surgeryAt).getTime() : 0;
    const tb = b.surgeryAt ? new Date(b.surgeryAt).getTime() : 0;
    return tb - ta;
  });

  return {
    total: patients.length,
    platforms,
    patients,
  };
}
