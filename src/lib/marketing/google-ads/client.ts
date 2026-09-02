import "server-only";

import { googleAdsConfig, googleAdsApiBaseUrl } from "@/lib/marketing/config";
import type { RemoteCampaign, RemoteDailyStat } from "@/lib/marketing/types";

function googleAdsApi(): string {
  return googleAdsApiBaseUrl();
}

export class GoogleAdsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleAdsApiError";
  }
}

function customerId(accountExternalId: string): string {
  return accountExternalId.replace(/\D/g, "");
}

async function googleAdsSearch<T extends Record<string, unknown>>(
  accessToken: string,
  accountExternalId: string,
  query: string,
): Promise<T[]> {
  const { developerToken, loginCustomerId } = googleAdsConfig();
  if (!developerToken) {
    throw new GoogleAdsApiError("GOOGLE_ADS_DEVELOPER_TOKEN eksik", 503);
  }

  const cid = customerId(accountExternalId);
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "content-type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const res = await fetch(
    `${googleAdsApi()}/customers/${cid}/googleAds:search`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    },
  );

  const json = (await res.json()) as {
    results?: T[];
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    const msg =
      json.error?.message ||
      `Google Ads API ${res.status}: ${JSON.stringify(json)}`;
    throw new GoogleAdsApiError(msg, res.status);
  }

  return json.results ?? [];
}

export async function fetchGoogleCampaigns(
  accessToken: string,
  accountExternalId: string,
): Promise<RemoteCampaign[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string; name?: string; status?: string };
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
    `,
  );

  return rows
    .map((row) => ({
      externalId: row.campaign?.id ? String(row.campaign.id) : "",
      name: row.campaign?.name?.trim() || "",
      status: row.campaign?.status ?? null,
    }))
    .filter((row) => row.externalId && row.name);
}

export async function fetchGoogleDailyStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteDailyStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    segments?: { date?: string };
    metrics?: {
      costMicros?: string;
      impressions?: string;
      clicks?: string;
      conversions?: number;
    };
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
    `,
  );

  return rows
    .map((row) => {
      const externalCampaignId = row.campaign?.id
        ? String(row.campaign.id)
        : "";
      const date = row.segments?.date ?? "";
      if (!externalCampaignId || !date) return null;

      const spendMicros = Number(row.metrics?.costMicros ?? 0);
      return {
        externalCampaignId,
        date,
        spend: Math.round((spendMicros / 1_000_000) * 100) / 100,
        impressions: Number(row.metrics?.impressions ?? 0),
        clicks: Number(row.metrics?.clicks ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
        currency: "TRY",
      } satisfies RemoteDailyStat;
    })
    .filter((row): row is RemoteDailyStat => row !== null);
}

export async function fetchGoogleAccountDisplayName(
  accessToken: string,
  accountExternalId: string,
): Promise<string | null> {
  const rows = await googleAdsSearch<{
    customer?: { descriptiveName?: string };
  }>(
    accessToken,
    accountExternalId,
    "SELECT customer.descriptive_name FROM customer LIMIT 1",
  );
  return rows[0]?.customer?.descriptiveName?.trim() || null;
}
