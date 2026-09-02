import {
  isGoogleAttributedLead,
  matchLeadToCampaignId,
  type CampaignForLeadMatch,
  type LeadForCampaignMatch,
} from "@/lib/marketing/campaign-match";
import {
  isMarketingAdSite,
  MARKETING_AD_SITES,
  type MarketingAdSite,
} from "@/lib/marketing/constants";

/** Reklam hesabı site kodu → landing domain (Google Ads final URL'leri). */
export const MARKETING_SITE_DOMAINS: Record<MarketingAdSite, string[]> = {
  endospineistanbul: ["endospineistanbul.com"],
  fitikameliyati: ["fitikameliyati.com"],
};

export type LeadSourceAttribution = {
  lead_ref?: string | null;
  site?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  campaign?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  landing_url?: string | null;
};

export type ResolvedLeadAttribution = LeadForCampaignMatch & {
  leadRef?: string | null;
  landingUrl?: string | null;
  resolvedSite?: string | null;
};

function clip(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** URL query string'den takip parametrelerini çıkarır (referer / landing_url yedek). */
export function parseTrackingParamsFromUrl(
  url: string | null | undefined,
): Partial<LeadSourceAttribution> {
  if (!url?.trim()) return {};
  try {
    const parsed = new URL(url);
    const get = (key: string) => clip(parsed.searchParams.get(key));
    return {
      utm_source: get("utm_source"),
      utm_medium: get("utm_medium"),
      utm_campaign: get("utm_campaign"),
      campaign: get("campaign"),
      gclid: get("gclid"),
      gbraid: get("gbraid"),
      wbraid: get("wbraid"),
      fbclid: get("fbclid"),
    };
  } catch {
    return {};
  }
}

function coalesceField(
  lead: LeadForCampaignMatch,
  source: LeadSourceAttribution | null | undefined,
  fromUrl: Partial<LeadSourceAttribution>,
  key: keyof LeadSourceAttribution,
): string | null {
  const leadVal = clip(lead[key as keyof LeadForCampaignMatch] as string | null);
  if (leadVal) return leadVal;
  const sourceVal = clip(source?.[key] as string | null | undefined);
  if (sourceVal) return sourceVal;
  return clip(fromUrl[key as keyof LeadSourceAttribution] as string | null);
}

/** Lead + lead_sources + landing_url birleşik attribution. */
export function resolveLeadAttribution(
  lead: LeadForCampaignMatch & { lead_ref?: string | null },
  source?: LeadSourceAttribution | null,
): ResolvedLeadAttribution {
  const landingUrl = clip(source?.landing_url);
  const fromUrl = parseTrackingParamsFromUrl(landingUrl);

  const resolved: ResolvedLeadAttribution = {
    site: coalesceField(lead, source, fromUrl, "site") ?? clip(lead.site),
    utm_campaign: coalesceField(lead, source, fromUrl, "utm_campaign"),
    campaign: coalesceField(lead, source, fromUrl, "campaign"),
    gclid: coalesceField(lead, source, fromUrl, "gclid"),
    gbraid: coalesceField(lead, source, fromUrl, "gbraid"),
    wbraid: coalesceField(lead, source, fromUrl, "wbraid"),
    leadRef: lead.lead_ref ?? source?.lead_ref ?? null,
    landingUrl,
  };

  resolved.resolvedSite = inferMarketingSite(resolved, source);
  return resolved;
}

function inferMarketingSite(
  lead: ResolvedLeadAttribution,
  source?: LeadSourceAttribution | null,
): string | null {
  const site = clip(source?.site) ?? clip(lead.site);
  if (site && site !== "manual") return site;

  const url = (lead.landingUrl ?? "").toLowerCase();
  for (const adSite of MARKETING_AD_SITES) {
    for (const domain of MARKETING_SITE_DOMAINS[adSite]) {
      if (url.includes(domain)) return adSite;
    }
  }
  return site;
}

export function leadMatchesAdSiteFilter(
  lead: ResolvedLeadAttribution,
  siteFilter: string,
  campaigns: CampaignForLeadMatch[],
  landingUtmSlugs?: Set<string>,
  gclidSiteMap?: Map<string, string>,
): boolean {
  if (lead.site === siteFilter || lead.resolvedSite === siteFilter) {
    return true;
  }

  if (!isMarketingAdSite(siteFilter)) return false;

  const gclid = clip(lead.gclid);
  if (gclid && gclidSiteMap?.get(gclid) === siteFilter) {
    return true;
  }

  const campaignId = matchLeadToCampaignId(lead, campaigns);
  if (campaignId) {
    const campaign = campaigns.find((c) => c.id === campaignId);
    return campaign?.site === siteFilter;
  }

  const utm = clip(lead.utm_campaign) ?? clip(lead.campaign);
  if (utm && landingUtmSlugs?.has(utm.toLowerCase())) {
    return true;
  }

  const url = (lead.landingUrl ?? "").toLowerCase();
  for (const domain of MARKETING_SITE_DOMAINS[siteFilter]) {
    if (url.includes(domain)) return true;
  }

  return false;
}

export function countGoogleUnmatchedForAdSite(
  leads: ResolvedLeadAttribution[],
  siteFilter: string,
  campaigns: CampaignForLeadMatch[],
): number {
  if (!isMarketingAdSite(siteFilter)) return 0;

  const siteCampaigns = campaigns.filter((c) => c.site === siteFilter);
  let count = 0;
  for (const lead of leads) {
    if (!isGoogleAttributedLead(lead)) continue;
    if (matchLeadToCampaignId(lead, siteCampaigns)) continue;
    if (leadMatchesAdSiteFilter(lead, siteFilter, siteCampaigns)) count += 1;
  }
  return count;
}

/** gclid → reklam sitesi (google_ad_clicks + ad_campaigns join) */
export type GclidAttributionMaps = {
  gclidToSite: Map<string, string>;
  gclidToExternalCampaignId: Map<string, string>;
};

export function matchLeadToCampaignIdWithGclid(
  lead: LeadForCampaignMatch,
  campaigns: CampaignForLeadMatch[],
  gclidToExternalCampaignId?: Map<string, string>,
): string | null {
  const fromUtm = matchLeadToCampaignId(lead, campaigns);
  if (fromUtm) return fromUtm;

  const gclid = clip(lead.gclid);
  if (!gclid || !gclidToExternalCampaignId) return null;

  const externalId = gclidToExternalCampaignId.get(gclid);
  if (!externalId) return null;

  return (
    campaigns.find((c) => c.externalCampaignId === externalId)?.id ?? null
  );
}
