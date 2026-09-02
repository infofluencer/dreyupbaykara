/** Tıklama kayıtları (lead_source_report) yalnızca bu sitede gösterilir. */
export const MARKETING_CLICK_LOGS_SITE = "endoskopikbelameliyati";

/** Google reklam harcaması bu sitelerde; CRM lead genelde ana sitede kayıtlı. */
export const MARKETING_AD_SITES = [
  "endospineistanbul",
  "fitikameliyati",
] as const;

export type MarketingAdSite = (typeof MARKETING_AD_SITES)[number];

export function isMarketingAdSite(
  site: string | null | undefined,
): site is MarketingAdSite {
  return MARKETING_AD_SITES.includes(site as MarketingAdSite);
}

/** Reklam sitesi filtresinde leads.site değil utm→kampanya eşleşmesi kullanılır. */
export function filterLeadsBySiteColumn(siteFilter: string | null): boolean {
  return !siteFilter || siteFilter === MARKETING_CLICK_LOGS_SITE;
}
