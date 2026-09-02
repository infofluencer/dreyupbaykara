import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AdAccountSafe,
  CampaignPerformanceRow,
  MarketingSummary,
} from "@/lib/marketing/types";

function parseSummary(data: unknown): MarketingSummary | null {
  if (!data || typeof data !== "object") return null;
  return data as MarketingSummary;
}

export async function loadMarketingSummary(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
): Promise<MarketingSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_marketing_summary", {
    start_date: startDate,
    end_date: endDate,
    site_filter: siteFilter,
  });

  if (error) {
    console.error("[marketing] summary rpc:", error.message);
    return null;
  }

  return parseSummary(data);
}

export async function loadAdAccountsSafe(): Promise<AdAccountSafe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_accounts_safe")
    .select("*")
    .order("platform");

  if (error) {
    console.error("[marketing] ad_accounts_safe:", error.message);
    return [];
  }

  return (data as AdAccountSafe[]) ?? [];
}

const KNOWN_MARKETING_SITES = [
  "endospineistanbul",
  "fitikameliyati",
  "endoskopikbelameliyati",
] as const;

export async function loadSiteOptions(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: prefixes }, { data: campaigns }, { data: leads }, { data: customerSites }] =
    await Promise.all([
      supabase.from("site_prefix_map").select("site"),
      supabase.from("ad_campaigns").select("site").not("site", "is", null),
      supabase.from("leads").select("site").not("site", "is", null).limit(500),
      supabase.from("ad_customer_site_map").select("site"),
    ]);

  const sites = new Set<string>(KNOWN_MARKETING_SITES);
  for (const row of prefixes ?? []) {
    if (row.site) sites.add(row.site);
  }
  for (const row of customerSites ?? []) {
    if (row.site) sites.add(row.site as string);
  }
  for (const row of campaigns ?? []) {
    if (row.site && row.site !== "manual") sites.add(row.site as string);
  }
  for (const row of leads ?? []) {
    if (row.site && row.site !== "manual") sites.add(row.site as string);
  }

  return [...sites].sort((a, b) => a.localeCompare(b, "tr"));
}

export async function loadUnmatchedCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("id, platform, name, status, created_at")
    .eq("site_match_source", "unmatched")
    .order("name");

  if (error) {
    console.error("[marketing] unmatched:", error.message);
    return [];
  }

  return data ?? [];
}

export async function loadCampaignPerformance(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
): Promise<CampaignPerformanceRow[]> {
  const supabase = await createClient();

  let campaignQuery = supabase
    .from("ad_campaigns")
    .select("id, platform, name, site, site_match_source, status");

  if (siteFilter) {
    campaignQuery = campaignQuery.eq("site", siteFilter);
  }

  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError || !campaigns?.length) {
    return [];
  }

  const campaignIds = campaigns.map((c) => c.id);
  const { data: stats } = await supabase
    .from("ad_daily_stats")
    .select("campaign_id, spend, clicks, impressions")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const statsByCampaign = new Map<
    string,
    { spend: number; clicks: number; impressions: number }
  >();
  for (const row of stats ?? []) {
    const id = row.campaign_id as string;
    const current = statsByCampaign.get(id) ?? {
      spend: 0,
      clicks: 0,
      impressions: 0,
    };
    current.spend += Number(row.spend ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    current.impressions += Number(row.impressions ?? 0);
    statsByCampaign.set(id, current);
  }

  let leadsQuery = supabase
    .from("leads")
    .select("utm_campaign, campaign, site, created_at")
    .gte("created_at", `${startDate}T00:00:00+03:00`)
    .lte("created_at", `${endDate}T23:59:59+03:00`);

  if (siteFilter) {
    leadsQuery = leadsQuery.eq("site", siteFilter);
  }

  const { data: leads } = await leadsQuery;

  return campaigns.map((campaign) => {
    const agg = statsByCampaign.get(campaign.id) ?? {
      spend: 0,
      clicks: 0,
      impressions: 0,
    };
    const nameLower = campaign.name.toLowerCase();
    const leadCount = (leads ?? []).filter((lead) => {
      const utm = (lead.utm_campaign || lead.campaign || "").toLowerCase();
      return utm === nameLower || utm.includes(nameLower);
    }).length;

    return {
      id: campaign.id,
      platform: campaign.platform as CampaignPerformanceRow["platform"],
      name: campaign.name,
      site: campaign.site as string | null,
      site_match_source:
        campaign.site_match_source as CampaignPerformanceRow["site_match_source"],
      status: campaign.status as string | null,
      spend: Math.round(agg.spend * 100) / 100,
      clicks: agg.clicks,
      impressions: agg.impressions,
      leads: leadCount,
      cpl:
        leadCount > 0
          ? Math.round((agg.spend / leadCount) * 100) / 100
          : null,
    };
  }).sort((a, b) => b.spend - a.spend);
}

export function defaultMarketingDateRange(days = 30): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function loadMonthToDateSummary(): Promise<{
  spend: number;
  cpl: number | null;
} | null> {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = now.toISOString().slice(0, 10);
  const summary = await loadMarketingSummary(startDate, endDate, null);
  if (!summary) return null;
  return { spend: summary.total_spend, cpl: summary.cpl };
}

export type GoogleMarketingInsights = {
  avgCtr: number | null;
  avgCpc: number | null;
  avgImpressionShare: number | null;
  budgetLostShare: number | null;
  rankLostShare: number | null;
  googleCostPerConversion: number | null;
  devices: Array<{
    device: string;
    spend: number;
    clicks: number;
    conversions: number;
  }>;
  conversionActions: Array<{
    name: string;
    conversions: number;
    spend: number;
  }>;
  searchTerms: Array<{
    term: string;
    spend: number;
    clicks: number;
    conversions: number;
  }>;
  landingPages: Array<{
    url: string;
    spend: number;
    clicks: number;
    conversions: number;
  }>;
};

async function loadFilteredGoogleCampaignIds(
  siteFilter: string | null,
): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ad_campaigns")
    .select("id")
    .eq("platform", "google_ads");
  if (siteFilter) query = query.eq("site", siteFilter);
  const { data } = await query;
  return (data ?? []).map((row) => row.id as string);
}

export async function loadGoogleMarketingInsights(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
): Promise<GoogleMarketingInsights | null> {
  const supabase = await createClient();
  const campaignIds = await loadFilteredGoogleCampaignIds(siteFilter);
  if (!campaignIds.length) {
    return {
      avgCtr: null,
      avgCpc: null,
      avgImpressionShare: null,
      budgetLostShare: null,
      rankLostShare: null,
      googleCostPerConversion: null,
      devices: [],
      conversionActions: [],
      searchTerms: [],
      landingPages: [],
    };
  }

  const { data: dailyRows } = await supabase
    .from("ad_daily_stats")
    .select(
      "spend, clicks, impressions, conversions, ctr, average_cpc, cost_per_conversion, search_impression_share, search_budget_lost_impression_share, search_rank_lost_impression_share",
    )
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const { data: segmentRows } = await supabase
    .from("ad_segment_daily_stats")
    .select("segment_type, segment_value, spend, clicks, conversions")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const { data: searchRows } = await supabase
    .from("ad_search_term_daily")
    .select("search_term, spend, clicks, conversions")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const { data: landingRows } = await supabase
    .from("ad_landing_page_daily")
    .select("landing_page, spend, clicks, conversions")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const daily = dailyRows ?? [];
  const totalSpend = daily.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const totalClicks = daily.reduce((s, r) => s + Number(r.clicks ?? 0), 0);
  const totalConversions = daily.reduce(
    (s, r) => s + Number(r.conversions ?? 0),
    0,
  );

  const avg = (values: number[]) =>
    values.length
      ? Math.round(
          (values.reduce((a, b) => a + b, 0) / values.length) * 10_000,
        ) / 10_000
      : null;

  const deviceMap = new Map<
    string,
    { spend: number; clicks: number; conversions: number }
  >();
  const conversionMap = new Map<
    string,
    { spend: number; conversions: number }
  >();
  for (const row of segmentRows ?? []) {
    if (row.segment_type === "device") {
      const current = deviceMap.get(row.segment_value) ?? {
        spend: 0,
        clicks: 0,
        conversions: 0,
      };
      current.spend += Number(row.spend ?? 0);
      current.clicks += Number(row.clicks ?? 0);
      current.conversions += Number(row.conversions ?? 0);
      deviceMap.set(row.segment_value, current);
    }
    if (row.segment_type === "conversion_action") {
      const current = conversionMap.get(row.segment_value) ?? {
        spend: 0,
        conversions: 0,
      };
      current.spend += Number(row.spend ?? 0);
      current.conversions += Number(row.conversions ?? 0);
      conversionMap.set(row.segment_value, current);
    }
  }

  const searchMap = new Map<
    string,
    { spend: number; clicks: number; conversions: number }
  >();
  for (const row of searchRows ?? []) {
    const current = searchMap.get(row.search_term) ?? {
      spend: 0,
      clicks: 0,
      conversions: 0,
    };
    current.spend += Number(row.spend ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    current.conversions += Number(row.conversions ?? 0);
    searchMap.set(row.search_term, current);
  }

  const landingMap = new Map<
    string,
    { spend: number; clicks: number; conversions: number }
  >();
  for (const row of landingRows ?? []) {
    const current = landingMap.get(row.landing_page) ?? {
      spend: 0,
      clicks: 0,
      conversions: 0,
    };
    current.spend += Number(row.spend ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    current.conversions += Number(row.conversions ?? 0);
    landingMap.set(row.landing_page, current);
  }

  const deviceLabels: Record<string, string> = {
    MOBILE: "Mobil",
    DESKTOP: "Masaüstü",
    TABLET: "Tablet",
    CONNECTED_TV: "TV",
    OTHER: "Diğer",
  };

  return {
    avgCtr: avg(daily.map((r) => Number(r.ctr)).filter((v) => v > 0)),
    avgCpc:
      totalClicks > 0
        ? Math.round((totalSpend / totalClicks) * 100) / 100
        : avg(daily.map((r) => Number(r.average_cpc)).filter((v) => v > 0)),
    avgImpressionShare: avg(
      daily
        .map((r) => Number(r.search_impression_share))
        .filter((v) => v > 0),
    ),
    budgetLostShare: avg(
      daily
        .map((r) => Number(r.search_budget_lost_impression_share))
        .filter((v) => v > 0),
    ),
    rankLostShare: avg(
      daily
        .map((r) => Number(r.search_rank_lost_impression_share))
        .filter((v) => v > 0),
    ),
    googleCostPerConversion:
      totalConversions > 0
        ? Math.round((totalSpend / totalConversions) * 100) / 100
        : null,
    devices: [...deviceMap.entries()]
      .map(([device, agg]) => ({
        device: deviceLabels[device] ?? device,
        ...agg,
        spend: Math.round(agg.spend * 100) / 100,
      }))
      .sort((a, b) => b.spend - a.spend),
    conversionActions: [...conversionMap.entries()]
      .map(([name, agg]) => ({
        name,
        conversions: Math.round(agg.conversions * 100) / 100,
        spend: Math.round(agg.spend * 100) / 100,
      }))
      .sort((a, b) => b.conversions - a.conversions),
    searchTerms: [...searchMap.entries()]
      .map(([term, agg]) => ({
        term,
        ...agg,
        spend: Math.round(agg.spend * 100) / 100,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 15),
    landingPages: [...landingMap.entries()]
      .map(([url, agg]) => ({
        url,
        ...agg,
        spend: Math.round(agg.spend * 100) / 100,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10),
  };
}
