import type { SiteMatchSource, SitePrefixMapRow } from "@/lib/marketing/types";

/** Kampanya ismindeki [PREFIX] etiketini yakalar (örn. `[BEL] Endoskopik Bel`). */
export const CAMPAIGN_PREFIX_RE = /^\[([A-Z0-9]{2,12})\]\s*/i;

export type SiteMatchResult = {
  prefix: string | null;
  site: string | null;
  siteMatchSource: SiteMatchSource;
};

function normalizePrefix(value: string): string {
  return value.trim().toUpperCase();
}

function buildPrefixLookup(prefixMap: SitePrefixMapRow[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const row of prefixMap) {
    lookup.set(normalizePrefix(row.prefix), row.site.trim());
  }
  return lookup;
}

/**
 * Kampanya adından site eşleşmesi çıkarır.
 * Prefix map'te yoksa unmatched döner.
 */
export function matchCampaignSite(
  campaignName: string,
  prefixMap: SitePrefixMapRow[],
): SiteMatchResult {
  const trimmed = campaignName.trim();
  if (!trimmed) {
    return { prefix: null, site: null, siteMatchSource: "unmatched" };
  }

  const match = trimmed.match(CAMPAIGN_PREFIX_RE);
  if (!match?.[1]) {
    return { prefix: null, site: null, siteMatchSource: "unmatched" };
  }

  const prefix = normalizePrefix(match[1]);
  const lookup = buildPrefixLookup(prefixMap);
  const site = lookup.get(prefix) ?? null;

  if (!site) {
    return { prefix, site: null, siteMatchSource: "unmatched" };
  }

  return { prefix, site, siteMatchSource: "auto" };
}

export function extractCampaignPrefix(campaignName: string): string | null {
  const match = campaignName.trim().match(CAMPAIGN_PREFIX_RE);
  return match?.[1] ? normalizePrefix(match[1]) : null;
}

/**
 * Site eşlemesi: önce kampanya adı [PREFIX], yoksa Google/Meta hesap ID haritası.
 */
export function resolveCampaignSite(
  campaignName: string,
  prefixMap: SitePrefixMapRow[],
  accountSite?: string | null,
): SiteMatchResult {
  const trimmed = campaignName.trim();
  const hasPrefixTag = Boolean(trimmed.match(CAMPAIGN_PREFIX_RE)?.[1]);

  if (hasPrefixTag) {
    return matchCampaignSite(campaignName, prefixMap);
  }

  if (accountSite?.trim()) {
    return {
      prefix: null,
      site: accountSite.trim(),
      siteMatchSource: "auto",
    };
  }

  return { prefix: null, site: null, siteMatchSource: "unmatched" };
}
