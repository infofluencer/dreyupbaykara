import "server-only";

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

export function metaAdsConfig() {
  return {
    appId: process.env.META_APP_ID?.trim() || "",
    appSecret: process.env.META_APP_SECRET?.trim() || "",
    adAccountId: (
      process.env.META_AD_ACCOUNT_ID?.trim() || ""
    ).replace(/^act_/, ""),
  };
}

export function isGoogleAdsConfigured(): boolean {
  const c = googleAdsConfig();
  return Boolean(c.clientId && c.clientSecret && c.developerToken);
}

export function isMetaAdsConfigured(): boolean {
  const c = metaAdsConfig();
  return Boolean(c.appId && c.appSecret && c.adAccountId);
}
