import "server-only";

import { createClient } from "@/lib/supabase/server";
import { istanbulYmd } from "@/lib/date/tr";
import type {
  AdAccountSafe,
  CampaignPerformanceResult,
  CampaignPerformanceRow,
  GoogleLeadsSummary,
  MarketingSummary,
} from "@/lib/marketing/types";
import {
  isGoogleAttributedLead,
} from "@/lib/marketing/campaign-match";
import {
  leadMatchesAdSiteFilter,
  matchLeadToCampaignIdWithGclid,
  resolveLeadAttribution,
  type GclidAttributionMaps,
  type LeadSourceAttribution,
} from "@/lib/marketing/attribution";
import {
  filterLeadsBySiteColumn,
  isMarketingAdSite,
  MARKETING_CLICK_LOGS_SITE,
} from "@/lib/marketing/constants";

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

export async function loadCustomerSiteMap(
  platform?: "google_ads" | "meta",
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("ad_customer_site_map")
    .select("platform, external_customer_id, site");

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[marketing] ad_customer_site_map:", error.message);
    return {};
  }

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const id = String(row.external_customer_id ?? "")
      .replace(/^act_/, "")
      .trim();
    const site = String(row.site ?? "").trim();
    if (!id || !site) continue;
    if (!map[id]) map[id] = [];
    if (!map[id].includes(site)) map[id].push(site);
  }
  return map;
}

const KNOWN_MARKETING_SITES = [
  "endospineistanbul",
  "fitikameliyati",
  "endoskopikbelameliyati",
] as const;

export async function loadSiteOptions(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: prefixes }, { data: campaigns }, { data: customerSites }] =
    await Promise.all([
      supabase.from("site_prefix_map").select("site"),
      supabase.from("ad_campaigns").select("site").not("site", "is", null),
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

function extractUtmCampaignFromLandingUrl(url: string): string | null {
  try {
    const normalized = url.replace("{ignore}", "placeholder");
    const parsed = new URL(normalized);
    const utm = parsed.searchParams.get("utm_campaign")?.trim();
    return utm || null;
  } catch {
    const match = url.match(/[?&]utm_campaign=([^&]+)/i);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]).trim() || null;
    } catch {
      return match[1].trim() || null;
    }
  }
}

async function loadLandingUtmSlugs(
  campaignIds: string[],
): Promise<Set<string>> {
  if (!campaignIds.length) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("ad_landing_page_daily")
    .select("landing_page")
    .in("campaign_id", campaignIds);

  const slugs = new Set<string>();
  for (const row of data ?? []) {
    const utm = extractUtmCampaignFromLandingUrl(String(row.landing_page ?? ""));
    if (utm) slugs.add(utm.toLowerCase());
  }
  return slugs;
}

async function loadLeadSourceMap(
  leadRefs: string[],
): Promise<Map<string, LeadSourceAttribution>> {
  const map = new Map<string, LeadSourceAttribution>();
  if (!leadRefs.length) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_sources")
    .select(
      "lead_ref, site, utm_source, utm_medium, utm_campaign, campaign, gclid, gbraid, wbraid, fbclid, landing_url",
    )
    .in("lead_ref", leadRefs);

  for (const row of data ?? []) {
    if (row.lead_ref) {
      map.set(row.lead_ref as string, row as LeadSourceAttribution);
    }
  }
  return map;
}

async function loadGclidAttributionMaps(): Promise<GclidAttributionMaps> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("google_ad_clicks")
    .select("gclid, external_campaign_id, ad_campaigns(site)")
    .not("gclid", "is", null);

  const gclidToSite = new Map<string, string>();
  const gclidToExternalCampaignId = new Map<string, string>();

  for (const row of data ?? []) {
    const gclid = String(row.gclid ?? "").trim();
    if (!gclid) continue;

    const campaign = row.ad_campaigns as
      | { site?: string | null }
      | { site?: string | null }[]
      | null;
    const site = Array.isArray(campaign) ? campaign[0]?.site : campaign?.site;
    if (site) gclidToSite.set(gclid, site);

    const externalId = String(row.external_campaign_id ?? "").trim();
    if (externalId) gclidToExternalCampaignId.set(gclid, externalId);
  }

  return { gclidToSite, gclidToExternalCampaignId };
}

export async function loadCampaignPerformance(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
  platformFilter: "google_ads" | "meta" | null = null,
): Promise<CampaignPerformanceResult> {
  const supabase = await createClient();

  let campaignQuery = supabase
    .from("ad_campaigns")
    .select(
      "id, platform, name, site, site_match_source, status, external_campaign_id",
    );

  if (siteFilter) {
    campaignQuery = campaignQuery.eq("site", siteFilter);
  }
  if (platformFilter) {
    campaignQuery = campaignQuery.eq("platform", platformFilter);
  }

  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError || !campaigns?.length) {
    return {
      rows: [],
      attribution: {
        crmLeadsInRange: 0,
        crmLeadsMatched: 0,
        crmGoogleUnmatched: 0,
        googleConversionsTotal: 0,
      },
    };
  }

  const campaignIds = campaigns.map((c) => c.id);
  const { data: stats } = await supabase
    .from("ad_daily_stats")
    .select("campaign_id, spend, clicks, impressions, conversions")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  const statsByCampaign = new Map<
    string,
    {
      spend: number;
      clicks: number;
      impressions: number;
      conversions: number;
    }
  >();
  for (const row of stats ?? []) {
    const id = row.campaign_id as string;
    const current = statsByCampaign.get(id) ?? {
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };
    current.spend += Number(row.spend ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    current.impressions += Number(row.impressions ?? 0);
    current.conversions += Number(row.conversions ?? 0);
    statsByCampaign.set(id, current);
  }

  let leadsQuery = supabase
    .from("leads")
    .select(
      "utm_campaign, campaign, gclid, gbraid, wbraid, site, lead_ref, utm_source, fbclid",
    )
    .gte("created_at", `${startDate}T00:00:00+03:00`)
    .lte("created_at", `${endDate}T23:59:59+03:00`);

  if (siteFilter && filterLeadsBySiteColumn(siteFilter)) {
    leadsQuery = leadsQuery.eq("site", siteFilter);
  }

  const { data: leads } = await leadsQuery;
  const rawLeads = leads ?? [];

  const sourceMap = await loadLeadSourceMap(
    rawLeads
      .map((lead) => lead.lead_ref as string | null)
      .filter((ref): ref is string => Boolean(ref)),
  );

  const landingUtmSlugs =
    siteFilter && isMarketingAdSite(siteFilter)
      ? await loadLandingUtmSlugs(campaignIds)
      : new Set<string>();

  const gclidMaps = await loadGclidAttributionMaps();

  const campaignsForMatch = campaigns.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    externalCampaignId: (c.external_campaign_id as string) ?? "",
    site: c.site as string | null,
    platform: c.platform as string,
  }));

  const allLeads = rawLeads
    .map((lead) =>
      resolveLeadAttribution(
        lead,
        lead.lead_ref ? sourceMap.get(lead.lead_ref as string) : null,
      ),
    )
    .filter((lead) => {
      if (!siteFilter || !isMarketingAdSite(siteFilter)) return true;
      return leadMatchesAdSiteFilter(
        lead,
        siteFilter,
        campaignsForMatch,
        landingUtmSlugs,
        gclidMaps.gclidToSite,
      );
    });

  const leadCounts = new Map<string, number>();
  let crmLeadsMatched = 0;
  let crmGoogleUnmatched = 0;

  for (const lead of allLeads) {
    const campaignId = matchLeadToCampaignIdWithGclid(
      lead,
      campaignsForMatch,
      gclidMaps.gclidToExternalCampaignId,
    );
    if (campaignId) {
      leadCounts.set(campaignId, (leadCounts.get(campaignId) ?? 0) + 1);
      crmLeadsMatched += 1;
      continue;
    }

    if (isGoogleAttributedLead(lead)) {
      if (!siteFilter || isMarketingAdSite(siteFilter)) {
        crmGoogleUnmatched += 1;
      }
    }
  }

  const crmLeadsInRange = allLeads.length;

  const rows = campaigns
    .map((campaign) => {
      const agg = statsByCampaign.get(campaign.id) ?? {
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
      };
      const crmLeads = leadCounts.get(campaign.id) ?? 0;
      const googleConversions = Math.round(agg.conversions * 100) / 100;

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
        googleConversions,
        crmLeads,
        googleCpa:
          googleConversions > 0
            ? Math.round((agg.spend / googleConversions) * 100) / 100
            : null,
        cpl:
          crmLeads > 0
            ? Math.round((agg.spend / crmLeads) * 100) / 100
            : null,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const googleConversionsTotal = rows.reduce(
    (sum, row) => sum + row.googleConversions,
    0,
  );

  return {
    rows,
    attribution: {
      crmLeadsInRange,
      crmLeadsMatched,
      crmGoogleUnmatched,
      googleConversionsTotal: Math.round(googleConversionsTotal * 100) / 100,
    },
  };
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
  startDate: string;
  endDate: string;
} | null> {
  const endDate = istanbulYmd(new Date());
  const startDate = `${endDate.slice(0, 7)}-01`;
  const summary = await loadMarketingSummary(startDate, endDate, null);
  if (!summary) return null;
  return {
    spend: summary.total_spend,
    cpl: summary.cpl,
    startDate,
    endDate,
  };
}

export type GoogleMarketingInsights = {
  totalSpend: number;
  totalClicks: number;
  totalConversions: number;
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

const DEVICE_LABELS: Record<string, string> = {
  MOBILE: "Mobil",
  DESKTOP: "Masaüstü",
  TABLET: "Tablet",
  CONNECTED_TV: "TV",
  OTHER: "Diğer",
};

function emptyGoogleInsights(): GoogleMarketingInsights {
  return {
    totalSpend: 0,
    totalClicks: 0,
    totalConversions: 0,
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

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGoogleInsightsRpc(data: unknown): GoogleMarketingInsights | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const totalSpend = num(row.totalSpend);
  const totalClicks = num(row.totalClicks);
  const totalConversions = num(row.totalConversions);

  const devices = Array.isArray(row.devices)
    ? row.devices.map((item) => {
        const d = item as Record<string, unknown>;
        const key = String(d.device ?? "");
        return {
          device: DEVICE_LABELS[key] ?? key,
          spend: Math.round(num(d.spend) * 100) / 100,
          clicks: num(d.clicks),
          conversions: num(d.conversions),
        };
      })
    : [];

  const conversionActions = Array.isArray(row.conversionActions)
    ? row.conversionActions.map((item) => {
        const d = item as Record<string, unknown>;
        return {
          name: String(d.name ?? ""),
          conversions: Math.round(num(d.conversions) * 100) / 100,
          spend: Math.round(num(d.spend) * 100) / 100,
        };
      })
    : [];

  const searchTerms = Array.isArray(row.searchTerms)
    ? row.searchTerms.map((item) => {
        const d = item as Record<string, unknown>;
        return {
          term: String(d.term ?? ""),
          spend: Math.round(num(d.spend) * 100) / 100,
          clicks: num(d.clicks),
          conversions: num(d.conversions),
        };
      })
    : [];

  const landingPages = Array.isArray(row.landingPages)
    ? row.landingPages.map((item) => {
        const d = item as Record<string, unknown>;
        return {
          url: String(d.url ?? ""),
          spend: Math.round(num(d.spend) * 100) / 100,
          clicks: num(d.clicks),
          conversions: num(d.conversions),
        };
      })
    : [];

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalConversions: Math.round(totalConversions * 100) / 100,
    avgCtr: numOrNull(row.avgCtr),
    avgCpc:
      totalClicks > 0
        ? Math.round((totalSpend / totalClicks) * 100) / 100
        : numOrNull(row.avgCpc),
    avgImpressionShare: numOrNull(row.avgImpressionShare),
    budgetLostShare: numOrNull(row.budgetLostShare),
    rankLostShare: numOrNull(row.rankLostShare),
    googleCostPerConversion:
      totalConversions > 0
        ? Math.round((totalSpend / totalConversions) * 100) / 100
        : null,
    devices,
    conversionActions,
    searchTerms,
    landingPages,
  };
}

export async function loadGoogleMarketingInsights(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
): Promise<GoogleMarketingInsights> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_google_marketing_insights", {
    start_date: startDate,
    end_date: endDate,
    site_filter: siteFilter,
  });

  if (!error && data) {
    const parsed = parseGoogleInsightsRpc(data);
    if (parsed) return parsed;
  }

  if (error) {
    console.warn("[marketing] insights rpc:", error.message);
  }

  return loadGoogleMarketingInsightsLegacy(startDate, endDate, siteFilter);
}

async function loadGoogleMarketingInsightsLegacy(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
): Promise<GoogleMarketingInsights> {
  const supabase = await createClient();
  const campaignIds = await loadFilteredGoogleCampaignIds(siteFilter);
  if (!campaignIds.length) {
    return emptyGoogleInsights();
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

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalConversions: Math.round(totalConversions * 100) / 100,
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
        device: DEVICE_LABELS[device] ?? device,
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
      .slice(0, 15),
  };
}

export async function loadGoogleLeadsSummary(
  startDate: string,
  endDate: string,
  siteFilter: string | null,
  googleConversionsTotal: number,
): Promise<GoogleLeadsSummary> {
  const supabase = await createClient();
  const startIso = `${startDate}T00:00:00+03:00`;
  const endIso = `${endDate}T23:59:59+03:00`;

  let campaignIds: string[] | null = null;
  if (siteFilter) {
    const { data: campaigns } = await supabase
      .from("ad_campaigns")
      .select("id")
      .eq("platform", "google_ads")
      .eq("site", siteFilter);
    campaignIds = (campaigns ?? []).map((row) => row.id as string);
    if (!campaignIds.length) {
      return {
        leadFormCount: 0,
        conversionTotal: googleConversionsTotal,
        conversionByAction: [],
        recentSubmissions: [],
        configuredActions: [],
      };
    }
  }

  let submissionsQuery = supabase
    .from("google_ad_lead_submissions")
    .select(
      "id, submitted_at, gclid, form_fields, campaign_id, ad_campaigns(name, site)",
      { count: "exact" },
    )
    .gte("submitted_at", startIso)
    .lte("submitted_at", endIso)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (campaignIds) {
    submissionsQuery = submissionsQuery.in("campaign_id", campaignIds);
  }

  const { data: submissions, count: leadFormCount } = await submissionsQuery;

  let conversionRowsQuery = supabase
    .from("ad_segment_daily_stats")
    .select("segment_value, conversions, campaign_id")
    .eq("segment_type", "conversion_action")
    .gte("date", startDate)
    .lte("date", endDate);

  if (campaignIds) {
    conversionRowsQuery = conversionRowsQuery.in("campaign_id", campaignIds);
  }

  const { data: conversionRows } = await conversionRowsQuery;
  const { data: actionDefs } = await supabase
    .from("ad_conversion_actions")
    .select("name, category, action_type")
    .order("name");

  const conversionByActionMap = new Map<string, number>();
  for (const row of conversionRows ?? []) {
    const name = String(row.segment_value ?? "");
    if (!name) continue;
    conversionByActionMap.set(
      name,
      (conversionByActionMap.get(name) ?? 0) + Number(row.conversions ?? 0),
    );
  }

  const recentSubmissions = (submissions ?? []).map((row) => {
    const campaign = row.ad_campaigns as
      | { name?: string; site?: string }
      | { name?: string; site?: string }[]
      | null;
    const campaignRow = Array.isArray(campaign) ? campaign[0] : campaign;
    return {
      id: row.id as string,
      submitted_at: row.submitted_at as string,
      gclid: row.gclid as string | null,
      form_fields: row.form_fields as GoogleLeadsSummary["recentSubmissions"][0]["form_fields"],
      campaign_name: campaignRow?.name ?? null,
      campaign_site: campaignRow?.site ?? null,
    };
  });

  return {
    leadFormCount: leadFormCount ?? recentSubmissions.length,
    conversionTotal: googleConversionsTotal,
    conversionByAction: [...conversionByActionMap.entries()]
      .map(([name, conversions]) => ({
        name,
        conversions: Math.round(conversions * 100) / 100,
      }))
      .sort((a, b) => b.conversions - a.conversions),
    recentSubmissions,
    configuredActions: (actionDefs ?? []).map((row) => ({
      name: String(row.name),
      category: row.category as string | null,
      actionType: row.action_type as string | null,
    })),
  };
}
