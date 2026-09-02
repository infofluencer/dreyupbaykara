/** Kampanya adı / utm eşleştirmesi için normalize. */
export function normalizeCampaignMatchKey(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google Ads URL slug: 2026-08-bel-mar → bel, mar */
function utmSlugTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[-_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d{4}$/.test(t) && !/^\d{1,2}$/.test(t));
}

function campaignNameTokens(name: string): string[] {
  const normalized = normalizeCampaignMatchKey(name);
  return normalized.split(" ").filter((t) => t.length >= 2);
}

function slugMatchesCampaignName(utmRaw: string, campaignName: string): boolean {
  const slugTokens = utmSlugTokens(utmRaw);
  if (slugTokens.length < 2) return false;

  const nameTokens = campaignNameTokens(campaignName);
  if (nameTokens.length < 2) return false;

  const matched = slugTokens.filter((st) =>
    nameTokens.some((nt) => nt.includes(st) || st.includes(nt)),
  );
  return matched.length >= 2;
}

export type LeadForCampaignMatch = {
  utm_campaign?: string | null;
  campaign?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  site?: string | null;
};

export type CampaignForLeadMatch = {
  id: string;
  name: string;
  externalCampaignId: string;
  site: string | null;
  platform: string;
};

export function matchLeadToCampaignId(
  lead: LeadForCampaignMatch,
  campaigns: CampaignForLeadMatch[],
): string | null {
  const utmRaw = (lead.utm_campaign || lead.campaign || "").trim();
  if (!utmRaw) return null;

  const utm = normalizeCampaignMatchKey(utmRaw);

  for (const campaign of campaigns) {
    const name = normalizeCampaignMatchKey(campaign.name);
    const externalId = campaign.externalCampaignId.trim();

    if (utm === name || utm.includes(name) || name.includes(utm)) {
      return campaign.id;
    }

    if (externalId && (utm === externalId || utm.includes(externalId))) {
      return campaign.id;
    }

    if (slugMatchesCampaignName(utmRaw, campaign.name)) {
      return campaign.id;
    }
  }

  return null;
}

export function isGoogleAttributedLead(lead: LeadForCampaignMatch): boolean {
  return Boolean(
    lead.gclid?.trim() || lead.gbraid?.trim() || lead.wbraid?.trim(),
  );
}
