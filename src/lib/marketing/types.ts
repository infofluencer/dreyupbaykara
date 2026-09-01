export type MarketingPlatform = "google_ads" | "meta";

export type SiteMatchSource = "auto" | "manual" | "unmatched";

export type AdAccountRow = {
  id: string;
  platform: MarketingPlatform;
  external_account_id: string;
  display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
};

export type AdAccountSafe = {
  id: string;
  platform: MarketingPlatform;
  external_account_id: string;
  display_name: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  has_token: boolean;
  created_at: string;
  updated_at: string;
};

export type SitePrefixMapRow = {
  prefix: string;
  site: string;
};

export type RemoteCampaign = {
  externalId: string;
  name: string;
  status: string | null;
};

export type RemoteDailyStat = {
  externalCampaignId: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  currency: string;
};

export type MarketingSummary = {
  total_spend: number;
  total_leads: number;
  cpl: number | null;
  appointment_rate: number | null;
  appointment_leads: number;
  currency: string;
  platforms: {
    google_ads: { spend: number; leads: number; cpl: number | null };
    meta: { spend: number; leads: number; cpl: number | null };
  };
  daily: Array<{ date: string; spend: number; leads: number }>;
};

export type CampaignPerformanceRow = {
  id: string;
  platform: MarketingPlatform;
  name: string;
  site: string | null;
  site_match_source: SiteMatchSource;
  status: string | null;
  spend: number;
  clicks: number;
  impressions: number;
  leads: number;
  cpl: number | null;
};
