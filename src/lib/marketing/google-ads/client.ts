import "server-only";

import { googleAdsConfig, googleAdsApiBaseUrl } from "@/lib/marketing/config";
import type {
  RemoteCampaign,
  RemoteConversionAction,
  RemoteDailyStat,
  RemoteGoogleLeadSubmission,
  RemoteLandingPageStat,
  RemoteSearchTermStat,
  RemoteSegmentStat,
} from "@/lib/marketing/types";

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

function microsToTry(micros: string | number | undefined): number {
  return Math.round((Number(micros ?? 0) / 1_000_000) * 100) / 100;
}

function ratio(value: number | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function mapCampaignMetricsRow(row: {
  campaign?: { id?: string };
  segments?: {
    date?: string;
    device?: string;
    conversionAction?: string;
    conversionActionName?: string;
  };
  metrics?: Record<string, unknown>;
  geographicView?: { countryCriterionId?: string };
}): {
  externalCampaignId: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  averageCpc: number | null;
  costPerConversion: number | null;
  searchImpressionShare: number | null;
  searchBudgetLostImpressionShare: number | null;
  searchRankLostImpressionShare: number | null;
} | null {
  const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
  const date = row.segments?.date ?? "";
  if (!externalCampaignId || !date) return null;
  const m = row.metrics ?? {};
  return {
    externalCampaignId,
    date,
    spend: microsToTry(m.costMicros as string | undefined),
    impressions: Number(m.impressions ?? 0),
    clicks: Number(m.clicks ?? 0),
    conversions: Number(m.conversions ?? 0),
    ctr: ratio(Number(m.ctr)),
    averageCpc: m.averageCpc != null ? microsToTry(m.averageCpc as string) : null,
    costPerConversion:
      m.costPerConversion != null
        ? microsToTry(m.costPerConversion as string)
        : null,
    searchImpressionShare: ratio(Number(m.searchImpressionShare)),
    searchBudgetLostImpressionShare: ratio(
      Number(m.searchBudgetLostImpressionShare),
    ),
    searchRankLostImpressionShare: ratio(Number(m.searchRankLostImpressionShare)),
  };
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
      ctr?: number;
      averageCpc?: string;
      costPerConversion?: string;
      searchImpressionShare?: number;
      searchBudgetLostImpressionShare?: number;
      searchRankLostImpressionShare?: number;
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
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
    `,
  );

  return rows.flatMap((row) => {
    const mapped = mapCampaignMetricsRow(row);
    if (!mapped) return [];
    const stat: RemoteDailyStat = {
      ...mapped,
      currency: "TRY",
      ctr: mapped.ctr,
      averageCpc: mapped.averageCpc,
      costPerConversion: mapped.costPerConversion,
      searchImpressionShare: mapped.searchImpressionShare,
      searchBudgetLostImpressionShare: mapped.searchBudgetLostImpressionShare,
      searchRankLostImpressionShare: mapped.searchRankLostImpressionShare,
    };
    return [stat];
  });
}

export async function fetchGoogleDeviceStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteSegmentStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    segments?: { date?: string; device?: string };
    metrics?: Record<string, unknown>;
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        segments.date,
        segments.device,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
    `,
  );

  return rows.flatMap((row) => {
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const date = row.segments?.date ?? "";
    const device = row.segments?.device ?? "";
    if (!externalCampaignId || !date || !device) return [];
    const m = row.metrics ?? {};
    const stat: RemoteSegmentStat = {
      externalCampaignId,
      date,
      segmentType: "device",
      segmentValue: device,
      spend: microsToTry(m.costMicros as string | undefined),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversions ?? 0),
    };
    return [stat];
  });
}

export async function fetchGoogleConversionActionStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteSegmentStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    segments?: { date?: string; conversionActionName?: string };
    metrics?: Record<string, unknown>;
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        segments.date,
        segments.conversion_action_name,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
        AND segments.conversion_action_name != ''
        AND metrics.conversions > 0
    `,
  );

  return rows.flatMap((row) => {
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const date = row.segments?.date ?? "";
    const name = row.segments?.conversionActionName?.trim() ?? "";
    if (!externalCampaignId || !date || !name) return [];
    const m = row.metrics ?? {};
    const stat: RemoteSegmentStat = {
      externalCampaignId,
      date,
      segmentType: "conversion_action",
      segmentValue: name,
      spend: microsToTry(m.costMicros as string | undefined),
      impressions: 0,
      clicks: 0,
      conversions: Number(m.conversions ?? 0),
    };
    return [stat];
  });
}

export async function fetchGoogleGeoStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteSegmentStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    segments?: { date?: string };
    geographicView?: { countryCriterionId?: string };
    metrics?: Record<string, unknown>;
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        geographic_view.country_criterion_id,
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM geographic_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `,
  );

  return rows.flatMap((row) => {
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const date = row.segments?.date ?? "";
    const geo = row.geographicView?.countryCriterionId
      ? String(row.geographicView.countryCriterionId)
      : "";
    if (!externalCampaignId || !date || !geo) return [];
    const m = row.metrics ?? {};
    const stat: RemoteSegmentStat = {
      externalCampaignId,
      date,
      segmentType: "geo",
      segmentValue: geo,
      spend: microsToTry(m.costMicros as string | undefined),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversions ?? 0),
    };
    return [stat];
  });
}

export async function fetchGoogleSearchTermStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteSearchTermStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    searchTermView?: { searchTerm?: string };
    segments?: { date?: string };
    metrics?: Record<string, unknown>;
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        search_term_view.search_term,
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM search_term_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `,
  );

  return rows.flatMap((row) => {
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const date = row.segments?.date ?? "";
    const searchTerm = row.searchTermView?.searchTerm?.trim() ?? "";
    if (!externalCampaignId || !date || !searchTerm) return [];
    const m = row.metrics ?? {};
    const stat: RemoteSearchTermStat = {
      externalCampaignId,
      date,
      searchTerm,
      spend: microsToTry(m.costMicros as string | undefined),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversions ?? 0),
    };
    return [stat];
  });
}

export async function fetchGoogleLandingPageStats(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteLandingPageStat[]> {
  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    landingPageView?: { unexpandedFinalUrl?: string };
    segments?: { date?: string };
    metrics?: Record<string, unknown>;
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        landing_page_view.unexpanded_final_url,
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM landing_page_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `,
  );

  return rows.flatMap((row) => {
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const date = row.segments?.date ?? "";
    const landingPage = row.landingPageView?.unexpandedFinalUrl?.trim() ?? "";
    if (!externalCampaignId || !date || !landingPage) return [];
    const m = row.metrics ?? {};
    const stat: RemoteLandingPageStat = {
      externalCampaignId,
      date,
      landingPage,
      spend: microsToTry(m.costMicros as string | undefined),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversions ?? 0),
    };
    return [stat];
  });
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

function parseSubmissionDateTime(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const parsed = new Date(raw.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Google Lead Form Extension — bireysel lead kayıtları (WhatsApp CRM lead değil). */
export async function fetchGoogleLeadFormSubmissions(
  accessToken: string,
  accountExternalId: string,
  startDate: string,
  endDate: string,
): Promise<RemoteGoogleLeadSubmission[]> {
  const start = `${startDate} 00:00:00`;
  const end = `${endDate} 23:59:59`;

  const rows = await googleAdsSearch<{
    campaign?: { id?: string };
    leadFormSubmissionData?: {
      id?: string;
      gclid?: string;
      submissionDateTime?: string;
      leadFormSubmissionFields?: Array<{
        fieldType?: string;
        fieldValue?: string;
      }>;
    };
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        campaign.id,
        lead_form_submission_data.id,
        lead_form_submission_data.gclid,
        lead_form_submission_data.submission_date_time,
        lead_form_submission_data.lead_form_submission_fields
      FROM lead_form_submission_data
      WHERE lead_form_submission_data.submission_date_time
        BETWEEN '${start}' AND '${end}'
      ORDER BY lead_form_submission_data.submission_date_time DESC
    `,
  );

  return rows.flatMap((row) => {
    const externalSubmissionId = row.leadFormSubmissionData?.id?.trim() ?? "";
    const externalCampaignId = row.campaign?.id ? String(row.campaign.id) : "";
    const submittedAt = parseSubmissionDateTime(
      row.leadFormSubmissionData?.submissionDateTime,
    );
    if (!externalSubmissionId || !externalCampaignId || !submittedAt) return [];

    const formFields = (row.leadFormSubmissionData?.leadFormSubmissionFields ??
      [])
      .map((field) => ({
        fieldType: field.fieldType?.trim() ?? "",
        fieldValue: field.fieldValue?.trim() ?? "",
      }))
      .filter((field) => field.fieldType || field.fieldValue);

    return [
      {
        externalSubmissionId,
        externalCampaignId,
        gclid: row.leadFormSubmissionData?.gclid?.trim() || null,
        submittedAt,
        formFields,
      },
    ];
  });
}

/** Hesapta tanımlı dönüşüm aksiyonları (ne sayılıyor?). */
export async function fetchGoogleConversionActions(
  accessToken: string,
  accountExternalId: string,
): Promise<RemoteConversionAction[]> {
  const rows = await googleAdsSearch<{
    conversionAction?: {
      id?: string;
      name?: string;
      category?: string;
      type?: string;
    };
  }>(
    accessToken,
    accountExternalId,
    `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type
      FROM conversion_action
      WHERE conversion_action.status != 'REMOVED'
      ORDER BY conversion_action.name
    `,
  );

  return rows.flatMap((row) => {
    const externalActionId = row.conversionAction?.id
      ? String(row.conversionAction.id)
      : "";
    const name = row.conversionAction?.name?.trim() ?? "";
    if (!externalActionId || !name) return [];
    return [
      {
        externalActionId,
        name,
        category: row.conversionAction?.category?.trim() || null,
        actionType: row.conversionAction?.type?.trim() || null,
      },
    ];
  });
}
