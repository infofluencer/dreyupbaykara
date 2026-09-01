import "server-only";

import { metaAdsConfig } from "@/lib/marketing/config";
import type { RemoteCampaign, RemoteDailyStat } from "@/lib/marketing/types";

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
  const search = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${GRAPH_API}${path}?${search}`);
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

export async function fetchMetaDailyStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteDailyStat[]> {
  const stats: RemoteDailyStat[] = [];
  type Row = {
    campaign_id?: string;
    date_start?: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    actions?: Array<{ action_type?: string; value?: string }>;
  };
  let nextUrl: string | null =
    `${actId(accountExternalId)}/insights?` +
    new URLSearchParams({
      level: "campaign",
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      time_increment: "1",
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      limit: "500",
    }).toString();

  while (nextUrl) {
    const currentUrl = nextUrl;
    const json: PagedResponse<Row> = await fetchGraphPage<Row>(
      currentUrl,
      accessToken,
    );

    for (const row of json.data ?? []) {
      if (!row.campaign_id || !row.date_start) continue;

      const leadActions = (row.actions ?? []).filter((action) =>
        [
          "lead",
          "onsite_conversion.lead_grouped",
          "offsite_conversion.fb_pixel_lead",
        ].includes(action.action_type ?? ""),
      );
      const conversions = leadActions.reduce(
        (sum, action) => sum + Number(action.value ?? 0),
        0,
      );

      stats.push({
        externalCampaignId: row.campaign_id,
        date: row.date_start,
        spend: Math.round(Number(row.spend ?? 0) * 100) / 100,
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        conversions,
        currency: "TRY",
      });
    }

    nextUrl = json.paging?.next ?? null;
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
