export type MarketingPlatform = "google_ads" | "meta";

export type SiteMatchSource = "auto" | "manual" | "unmatched";

export type AdCustomerSiteMapRow = {
  platform: MarketingPlatform;
  external_customer_id: string;
  site: string;
  label: string | null;
};

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
  ctr?: number | null;
  averageCpc?: number | null;
  costPerConversion?: number | null;
  searchImpressionShare?: number | null;
  searchBudgetLostImpressionShare?: number | null;
  searchRankLostImpressionShare?: number | null;
};

export type RemoteSegmentStat = {
  externalCampaignId: string;
  date: string;
  segmentType: "device" | "conversion_action" | "geo";
  segmentValue: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type RemoteSearchTermStat = {
  externalCampaignId: string;
  date: string;
  searchTerm: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type RemoteLandingPageStat = {
  externalCampaignId: string;
  date: string;
  landingPage: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

/** Google Lead Form Extension — bireysel form gönderimi */
export type RemoteGoogleLeadSubmission = {
  externalSubmissionId: string;
  externalCampaignId: string;
  gclid: string | null;
  submittedAt: string;
  formFields: Array<{ fieldType: string; fieldValue: string }>;
};

export type RemoteConversionAction = {
  externalActionId: string;
  name: string;
  category: string | null;
  actionType: string | null;
};

export type GoogleLeadSubmissionRow = {
  id: string;
  submitted_at: string;
  gclid: string | null;
  form_fields: Array<{ fieldType: string; fieldValue: string }> | null;
  campaign_name: string | null;
  campaign_site: string | null;
};

export type GoogleLeadsSummary = {
  /** Lead Form Extension gönderim sayısı (bireysel kayıt) */
  leadFormCount: number;
  /** Tüm dönüşüm aksiyonlarının toplamı (API metrik) */
  conversionTotal: number;
  /** Dönüşüm aksiyonu kırılımı */
  conversionByAction: Array<{ name: string; conversions: number }>;
  recentSubmissions: GoogleLeadSubmissionRow[];
  configuredActions: Array<{
    name: string;
    category: string | null;
    actionType: string | null;
  }>;
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
  /** Google Ads API dönüşüm metriği */
  googleConversions: number;
  /** CRM lead — utm_campaign / kampanya adı eşleşmesi */
  crmLeads: number;
  googleCpa: number | null;
  cpl: number | null;
};

export type CampaignPerformanceResult = {
  rows: CampaignPerformanceRow[];
  attribution: {
    crmLeadsInRange: number;
    crmLeadsMatched: number;
    crmGoogleUnmatched: number;
    googleConversionsTotal: number;
  };
};
