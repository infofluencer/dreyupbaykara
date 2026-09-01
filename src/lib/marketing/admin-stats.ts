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

export async function loadSiteOptions(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: prefixes }, { data: campaigns }, { data: leads }] =
    await Promise.all([
      supabase.from("site_prefix_map").select("site"),
      supabase.from("ad_campaigns").select("site").not("site", "is", null),
      supabase.from("leads").select("site").not("site", "is", null).limit(500),
    ]);

  const sites = new Set<string>();
  for (const row of prefixes ?? []) {
    if (row.site) sites.add(row.site);
  }
  for (const row of campaigns ?? []) {
    if (row.site) sites.add(row.site as string);
  }
  for (const row of leads ?? []) {
    if (row.site) sites.add(row.site as string);
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
