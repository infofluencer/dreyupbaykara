import "server-only";

import {
  isAttributedLead,
  type InheritAttributionRow,
} from "@/lib/crm/inherit-attribution";
import {
  classifyAdPlatform,
  type AdPlatform,
  type SourceRow,
} from "@/lib/crm/source-kind";
import { createClient } from "@/lib/supabase/server";

export type SurgerySourcePatient = {
  leadId: string;
  contactId: string | null;
  name: string | null;
  phone: string | null;
  platform: AdPlatform;
  /** ameliyat_edildi'ye geçiş anı */
  surgeryAt: string;
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
  "id, contact_id, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, gbraid, wbraid, fbclid, ctwa_clid, msclkid, ttclid, contacts(id, name, phone)";

const SIBLING_ATTR_SELECT =
  "id, contact_id, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, gbraid, wbraid, fbclid, ctwa_clid, msclkid, ttclid, created_at";

type LeadRow = SourceRow & {
  id: string;
  contact_id?: string | null;
  contacts?:
    | { id?: string; name?: string | null; phone?: string | null }
    | Array<{ id?: string; name?: string | null; phone?: string | null }>
    | null;
};

function firstContact(lead: LeadRow) {
  const raw = lead.contacts;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
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
      const contactId = row.contact_id;
      if (!contactId || map.has(contactId)) continue;
      if (isAttributedLead(row)) map.set(contactId, row);
    }
  }
  return map;
}

/**
 * Seçili dönemde ameliyat_edildi'ye geçen lead'lerin reklam kaynağı + hasta listesi.
 * Kaynak WhatsApp Ref / CTWA / gclid / fbclid / UTM ile sınıflandırılır.
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

  const needsSibling = leads.filter(
    (lead) => classifyAdPlatform(lead) === "organic" && lead.contact_id,
  );
  const siblingByContact = await firstTouchByContact([
    ...new Set(
      needsSibling
        .map((lead) => lead.contact_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]);

  const patients: SurgerySourcePatient[] = [];

  for (const lead of leads) {
    let platform = classifyAdPlatform(lead);
    if (platform === "organic" && lead.contact_id) {
      const sibling = siblingByContact.get(lead.contact_id);
      if (sibling) platform = classifyAdPlatform(sibling);
    }
    platforms[platform] += 1;
    const contact = firstContact(lead);
    patients.push({
      leadId: lead.id,
      contactId: contact?.id ?? lead.contact_id ?? null,
      name: contact?.name?.trim() || null,
      phone: contact?.phone?.trim() || null,
      platform,
      surgeryAt: surgeryAtByLead.get(lead.id) ?? "",
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
