import "server-only";

import {
  MARKETING_CRON_LOOKBACK_DAYS,
  MARKETING_HISTORY_DAYS,
} from "@/lib/marketing/constants";

export function marketingOAuthBaseUrl(): string {
  return (
    process.env.MARKETING_OAUTH_REDIRECT_BASE?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3005"
  );
}

export function googleAdsConfig() {
  return {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID?.trim() || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || "",
    loginCustomerId: (
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim() || ""
    ).replace(/\D/g, ""),
  };
}

/** MCC altındaki reklam hesapları; yoksa login customer id. */
export function googleAdsCustomerIds(): string[] {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_IDS?.trim();
  const login = googleAdsConfig().loginCustomerId;

  if (raw) {
    const ids = raw
      .split(/[,;\s]+/)
      .map((id) => id.replace(/\D/g, ""))
      .filter(Boolean);
    if (ids.length) return [...new Set(ids)];
  }

  return login ? [login] : [];
}

export function metaAdsConfig() {
  return {
    appId: process.env.META_APP_ID?.trim() || "",
    appSecret: process.env.META_APP_SECRET?.trim() || "",
    adAccountId: (
      process.env.META_AD_ACCOUNT_ID?.trim() || ""
    ).replace(/^act_/, ""),
  };
}

/** Env'deki Meta reklam hesap ID'leri (virgülle; act_ opsiyonel). */
export function metaAdAccountIds(): string[] {
  const multi = process.env.META_AD_ACCOUNT_IDS?.trim();
  const single = metaAdsConfig().adAccountId;
  const raw = multi || single;
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((id) => id.replace(/^act_/, "").replace(/\D/g, ""))
        .filter(Boolean),
    ),
  ];
}

export function isGoogleAdsConfigured(): boolean {
  const c = googleAdsConfig();
  return Boolean(c.clientId && c.clientSecret && c.developerToken);
}

export function isMetaAdsConfigured(): boolean {
  const c = metaAdsConfig();
  // Ad account OAuth sonrası seçilir; OAuth için App ID + Secret yeterli.
  return Boolean(c.appId && c.appSecret);
}

export function hasGoogleEnvTokens(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() ||
      process.env.GOOGLE_ADS_ACCESS_TOKEN?.trim(),
  );
}

export function hasMetaEnvToken(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN?.trim());
}

export function isGoogleAdsEnvReady(): boolean {
  const c = googleAdsConfig();
  return Boolean(
    c.developerToken &&
      c.loginCustomerId &&
      c.clientId &&
      c.clientSecret &&
      hasGoogleEnvTokens(),
  );
}

export function isMetaEnvReady(): boolean {
  const c = metaAdsConfig();
  return Boolean(
    c.appId && c.appSecret && metaAdAccountIds().length && hasMetaEnvToken(),
  );
}

/** Google Ads REST API — v18 Ağustos 2025'te kapatıldı; varsayılan v25. */
export function googleAdsApiBaseUrl(): string {
  const version = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
  return `https://googleads.googleapis.com/${version}`;
}

export function marketingSyncDays(
  defaultDays = MARKETING_HISTORY_DAYS,
): number {
  const raw = process.env.MARKETING_SYNC_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : defaultDays;
  if (!Number.isFinite(parsed) || parsed < 1) return defaultDays;
  return Math.min(parsed, MARKETING_HISTORY_DAYS);
}

/** Cron: son N günü tekrar çek + upsert (dönüşüm atribüsyonu güncellenir). */
export function marketingCronSyncDays(
  defaultDays = MARKETING_CRON_LOOKBACK_DAYS,
): number {
  const raw = process.env.MARKETING_CRON_SYNC_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : defaultDays;
  if (!Number.isFinite(parsed) || parsed < 1) return defaultDays;
  return Math.min(parsed, marketingSyncDays());
}

/** Env yedek: 6474329013:endospineistanbul,9298256533:fitikameliyati */
export function googleAdsCustomerSiteMapFromEnv(): Array<{
  platform: "google_ads";
  external_customer_id: string;
  site: string;
  label: string | null;
}> {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_SITE_MAP?.trim();
  if (!raw) return [];

  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [id, site] = part.split(/[:=]/).map((s) => s.trim());
      if (!id || !site) return null;
      return {
        platform: "google_ads" as const,
        external_customer_id: id.replace(/\D/g, ""),
        site,
        label: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}
