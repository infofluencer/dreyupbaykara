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

/** Dashboard + backfill penceresi (~2 yıl; Meta Insights 37 ay limitinin altında). */
export const MARKETING_HISTORY_DAYS = 720;

/**
 * Cron her turda yenilenen pencere.
 * Google dönüşüm gecikmesi genelde 7–30 gün, Meta tıklama 7 (bazen 28).
 * Günde 2 kez 30 gün çekmek API’yi yormaz.
 */
export const MARKETING_CRON_LOOKBACK_DAYS = 30;

/** Google click_view en fazla 90 gün; cihaz/terim de bu pencerede tutulur. */
export const MARKETING_GOOGLE_EXTENDED_DAYS = 90;

/** Insights/GAQL timeout olmasın diye geçmişi 90’ar gün çek. */
export const MARKETING_SYNC_CHUNK_DAYS = 90;

/** Bir cron turunda en fazla kaç geçmiş parçası. 8×90 = 720 gün (Dokploy’da timeout yok). */
export const MARKETING_CRON_BACKFILL_CHUNKS = 8;
