import "server-only";

import { metaAdsConfig } from "@/lib/marketing/config";
import {
  isMetaPrimaryAction,
  isMetaTrackedAction,
} from "@/lib/marketing/meta/actions";
import type {
  RemoteCampaign,
  RemoteDailyStat,
  RemoteSegmentStat,
} from "@/lib/marketing/types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export class MetaAdsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MetaAdsApiError";
  }
}

function actId(accountExternalId: string): string {
  const raw = accountExternalId.replace(/^act_/, "");
  return `act_${raw}`;
}

type GraphError = { error?: { message?: string; code?: number } };

async function graphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const cleanPath = path.replace(/^\//, "");
  const [pathname, existingQuery] = cleanPath.split("?");
  const search = new URLSearchParams(existingQuery ?? "");
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }
  search.set("access_token", accessToken);

  const res = await fetch(`${GRAPH_API}/${pathname}?${search}`);
  const json = (await res.json()) as T & GraphError;

  if (!res.ok || json.error) {
    throw new MetaAdsApiError(
      json.error?.message || `Meta Graph API ${res.status}`,
      res.status,
    );
  }

  return json;
}

type PagedResponse<T> = {
  data?: T[];
  paging?: { next?: string };
  error?: { message?: string };
};

async function fetchGraphPage<T>(
  url: string,
  accessToken: string,
): Promise<PagedResponse<T>> {
  if (url.startsWith("http")) {
    const res = await fetch(url);
    const body = (await res.json()) as PagedResponse<T>;
    if (!res.ok || body.error) {
      throw new MetaAdsApiError(
        body.error?.message || `Meta Graph API ${res.status}`,
        res.status,
      );
    }
    return body;
  }

  return graphGet<PagedResponse<T>>(url, accessToken);
}

export async function fetchMetaCampaigns(
  accessToken: string,
  accountExternalId: string,
): Promise<RemoteCampaign[]> {
  const campaigns: RemoteCampaign[] = [];
  type Row = { id?: string; name?: string; effective_status?: string };
  let nextUrl: string | null =
    `${actId(accountExternalId)}/campaigns?fields=id,name,status,effective_status&limit=100`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    const json: PagedResponse<Row> = await fetchGraphPage<Row>(
      currentUrl,
      accessToken,
    );

    for (const row of json.data ?? []) {
      if (!row.id || !row.name) continue;
      campaigns.push({
        externalId: row.id,
        name: row.name.trim(),
        status: row.effective_status ?? null,
      });
    }

    nextUrl = json.paging?.next ?? null;
  }

  return campaigns;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1_000_000) / 1_000_000;
}

type ActionRow = { action_type?: string; value?: string };

type InsightsRow = {
  campaign_id?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  frequency?: string;
  unique_clicks?: string;
  inline_link_clicks?: string;
  actions?: ActionRow[];
  cost_per_action_type?: ActionRow[];
  publisher_platform?: string;
  impression_device?: string;
};

const DAILY_INSIGHT_FIELDS =
  "campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,unique_clicks,inline_link_clicks,actions,cost_per_action_type";

const BREAKDOWN_INSIGHT_FIELDS =
  "campaign_id,spend,impressions,clicks,reach,actions,cost_per_action_type";

function parseTrackedActions(row: InsightsRow) {
  const costByType = new Map<string, number>();
  for (const item of row.cost_per_action_type ?? []) {
    const type = item.action_type ?? "";
    if (!type) continue;
    costByType.set(type, Number(item.value ?? 0));
  }

  return (row.actions ?? [])
    .map((action) => {
      const actionType = action.action_type ?? "";
      if (!isMetaTrackedAction(actionType)) return null;
      const value = Number(action.value ?? 0);
      if (!Number.isFinite(value) || value <= 0) return null;
      const unitCost = costByType.get(actionType);
      return {
        actionType,
        value,
        cost:
          unitCost != null && Number.isFinite(unitCost)
            ? money(unitCost * value)
            : null,
      };
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);
}

function primaryConversions(
  actions: Array<{ actionType: string; value: number }>,
): number {
  return actions
    .filter((action) => isMetaPrimaryAction(action.actionType))
    .reduce((sum, action) => sum + action.value, 0);
}

async function fetchInsightsPages(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
  fields: string,
  extra: Record<string, string> = {},
): Promise<InsightsRow[]> {
  const rows: InsightsRow[] = [];
  const params = new URLSearchParams({
    level: "campaign",
    fields,
    time_increment: "1",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: "500",
    ...extra,
  });
  let nextUrl: string | null =
    `${actId(accountExternalId)}/insights?${params.toString()}`;

  while (nextUrl) {
    const json: PagedResponse<InsightsRow> = await fetchGraphPage<InsightsRow>(
      nextUrl,
      accessToken,
    );
    rows.push(...(json.data ?? []));
    nextUrl = json.paging?.next ?? null;
  }

  return rows;
}

export async function fetchMetaDailyStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteDailyStat[]> {
  let rows: InsightsRow[];
  try {
    rows = await fetchInsightsPages(
      accessToken,
      accountExternalId,
      startDate,
      endDate,
      DAILY_INSIGHT_FIELDS,
    );
  } catch (err) {
    console.warn(
      "[marketing] Meta extended insights failed, falling back:",
      err instanceof Error ? err.message : err,
    );
    rows = await fetchInsightsPages(
      accessToken,
      accountExternalId,
      startDate,
      endDate,
      "campaign_id,campaign_name,spend,impressions,clicks,actions,cost_per_action_type",
    );
  }

  const stats: RemoteDailyStat[] = [];
  for (const row of rows) {
    if (!row.campaign_id || !row.date_start) continue;

    const trackedActions = parseTrackedActions(row);
    const conversions = primaryConversions(trackedActions);
    const spend = money(Number(row.spend ?? 0));
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const reach = Number(row.reach ?? 0);
    const uniqueClicks = Number(row.unique_clicks ?? 0);
    const inlineLinkClicks = Number(row.inline_link_clicks ?? 0);

    stats.push({
      externalCampaignId: row.campaign_id,
      date: row.date_start,
      spend,
      impressions,
      clicks,
      conversions,
      currency: "TRY",
      ctr: ratio(clicks, impressions),
      averageCpc: clicks > 0 ? money(spend / clicks) : null,
      costPerConversion: conversions > 0 ? money(spend / conversions) : null,
      reach: Number.isFinite(reach) ? reach : 0,
      frequency:
        Number(row.frequency ?? 0) > 0
          ? Math.round(Number(row.frequency) * 10_000) / 10_000
          : reach > 0
            ? Math.round((impressions / reach) * 10_000) / 10_000
            : null,
      uniqueClicks: Number.isFinite(uniqueClicks) ? uniqueClicks : 0,
      inlineLinkClicks: Number.isFinite(inlineLinkClicks) ? inlineLinkClicks : 0,
      actions: trackedActions,
    });
  }

  return stats;
}

export async function fetchMetaBreakdownStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
  breakdown: "publisher_platform" | "impression_device",
): Promise<RemoteSegmentStat[]> {
  const segmentType =
    breakdown === "publisher_platform" ? "publisher_platform" : "device";
  const stats: RemoteSegmentStat[] = [];
  const rows = await fetchInsightsPages(
    accessToken,
    accountExternalId,
    startDate,
    endDate,
    BREAKDOWN_INSIGHT_FIELDS,
    { breakdowns: breakdown },
  );

  for (const row of rows) {
    if (!row.campaign_id || !row.date_start) continue;
    const segmentValue =
      breakdown === "publisher_platform"
        ? row.publisher_platform
        : row.impression_device;
    if (!segmentValue) continue;

    const conversions = primaryConversions(parseTrackedActions(row));
    stats.push({
      externalCampaignId: row.campaign_id,
      date: row.date_start,
      segmentType,
      segmentValue,
      spend: money(Number(row.spend ?? 0)),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      conversions,
    });
  }

  return stats;
}

export async function exchangeMetaShortLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const { appId, appSecret } = metaAdsConfig();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !json.access_token) {
    throw new MetaAdsApiError(
      json.error?.message || "Meta long-lived token exchange failed",
      res.status,
    );
  }

  return {
    accessToken: json.access_token,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null,
  };
}

export function defaultMetaAdAccountId(): string {
  return metaAdsConfig().adAccountId;
}

export type MetaAdAccountOption = {
  id: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  businessName: string | null;
};

/** Kullanıcının erişebildiği reklam hesapları (BM altı dahil). */
export async function fetchMetaAdAccounts(
  accessToken: string,
): Promise<MetaAdAccountOption[]> {
  type Row = {
    account_id?: string;
    id?: string;
    name?: string;
    account_status?: number;
    currency?: string;
    business?: { name?: string };
  };

  const accounts: MetaAdAccountOption[] = [];
  let nextUrl: string | null =
    "me/adaccounts?fields=account_id,id,name,account_status,currency,business{name}&limit=100";

  while (nextUrl) {
    const currentUrl = nextUrl;
    const json: PagedResponse<Row> = await fetchGraphPage<Row>(
      currentUrl,
      accessToken,
    );

    for (const row of json.data ?? []) {
      const rawId = (row.account_id || row.id || "").replace(/^act_/, "");
      if (!rawId) continue;
      accounts.push({
        id: rawId,
        name: row.name?.trim() || `act_${rawId}`,
        accountStatus: row.account_status ?? null,
        currency: row.currency ?? null,
        businessName: row.business?.name?.trim() || null,
      });
    }

    nextUrl = json.paging?.next ?? null;
  }

  return accounts.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
