import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleAdsCustomerIds } from "@/lib/marketing/config";
import {
  fetchGoogleConversionActionStats,
  fetchGoogleConversionActions,
  fetchGoogleClickViewRange,
  fetchGoogleDeviceStats,
  fetchGoogleGeoStats,
  fetchGoogleLandingPageStats,
  fetchGoogleLeadFormSubmissions,
  fetchGoogleSearchTermStats,
} from "@/lib/marketing/google-ads/client";
import {
  deactivateAdAccount,
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";
import { chunkRows, mergeRowsByKey } from "@/lib/marketing/sync/upsert-rows";

export type GoogleExtendedSyncResult = {
  deviceRows: number;
  conversionRows: number;
  geoRows: number;
  searchTermRows: number;
  landingPageRows: number;
  leadSubmissionRows: number;
  conversionActionDefs: number;
  gclidRows: number;
  error?: string;
};

async function loadCampaignIdMap(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("id, external_campaign_id")
    .eq("platform", "google_ads");

  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((row) => [
      row.external_campaign_id as string,
      row.id as string,
    ]),
  );
}

async function upsertSegmentRows(
  supabase: SupabaseClient,
  campaignIdMap: Map<string, string>,
  rows: Array<{
    externalCampaignId: string;
    date: string;
    segmentType: "device" | "conversion_action" | "geo";
    segmentValue: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>,
): Promise<number> {
  const payload = rows
    .map((row) => {
      const campaignId = campaignIdMap.get(row.externalCampaignId);
      if (!campaignId) return null;
      return {
        campaign_id: campaignId,
        date: row.date,
        segment_type: row.segmentType,
        segment_value: row.segmentValue,
        spend: row.spend,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!payload.length) return 0;

  const deduped = mergeRowsByKey(
    payload,
    (row) =>
      `${row.campaign_id}|${row.date}|${row.segment_type}|${row.segment_value}`,
    ["spend", "impressions", "clicks", "conversions"],
  );

  for (const batch of chunkRows(deduped)) {
    const { error } = await supabase.from("ad_segment_daily_stats").upsert(batch, {
      onConflict: "campaign_id,date,segment_type,segment_value",
    });
    if (error) throw new Error(error.message);
  }

  return deduped.length;
}

async function upsertSearchTermRows(
  supabase: SupabaseClient,
  campaignIdMap: Map<string, string>,
  rows: Array<{
    externalCampaignId: string;
    date: string;
    searchTerm: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>,
): Promise<number> {
  const payload = rows
    .map((row) => {
      const campaignId = campaignIdMap.get(row.externalCampaignId);
      if (!campaignId) return null;
      return {
        campaign_id: campaignId,
        date: row.date,
        search_term: row.searchTerm.slice(0, 500),
        spend: row.spend,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!payload.length) return 0;

  const deduped = mergeRowsByKey(
    payload,
    (row) => `${row.campaign_id}|${row.date}|${row.search_term}`,
    ["spend", "impressions", "clicks", "conversions"],
  );

  for (const batch of chunkRows(deduped)) {
    const { error } = await supabase.from("ad_search_term_daily").upsert(batch, {
      onConflict: "campaign_id,date,search_term",
    });
    if (error) throw new Error(error.message);
  }

  return deduped.length;
}

async function upsertLandingPageRows(
  supabase: SupabaseClient,
  campaignIdMap: Map<string, string>,
  rows: Array<{
    externalCampaignId: string;
    date: string;
    landingPage: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>,
): Promise<number> {
  const payload = rows
    .map((row) => {
      const campaignId = campaignIdMap.get(row.externalCampaignId);
      if (!campaignId) return null;
      return {
        campaign_id: campaignId,
        date: row.date,
        landing_page: row.landingPage.slice(0, 1000),
        spend: row.spend,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!payload.length) return 0;

  const deduped = mergeRowsByKey(
    payload,
    (row) => `${row.campaign_id}|${row.date}|${row.landing_page}`,
    ["spend", "impressions", "clicks", "conversions"],
  );

  for (const batch of chunkRows(deduped)) {
    const { error } = await supabase.from("ad_landing_page_daily").upsert(batch, {
      onConflict: "campaign_id,date,landing_page",
    });
    if (error) throw new Error(error.message);
  }

  return deduped.length;
}

async function upsertLeadSubmissions(
  supabase: SupabaseClient,
  accountId: string,
  campaignIdMap: Map<string, string>,
  rows: Array<{
    externalSubmissionId: string;
    externalCampaignId: string;
    gclid: string | null;
    submittedAt: string;
    formFields: Array<{ fieldType: string; fieldValue: string }>;
  }>,
): Promise<number> {
  if (!rows.length) return 0;

  const payload = rows.map((row) => ({
    account_id: accountId,
    external_submission_id: row.externalSubmissionId,
    external_campaign_id: row.externalCampaignId,
    campaign_id: campaignIdMap.get(row.externalCampaignId) ?? null,
    gclid: row.gclid,
    submitted_at: row.submittedAt,
    form_fields: row.formFields.length ? row.formFields : null,
    updated_at: new Date().toISOString(),
  }));

  for (const batch of chunkRows(payload)) {
    const { error } = await supabase.from("google_ad_lead_submissions").upsert(
      batch,
      { onConflict: "account_id,external_submission_id" },
    );
    if (error) throw new Error(error.message);
  }

  return payload.length;
}

async function upsertConversionActionDefs(
  supabase: SupabaseClient,
  accountId: string,
  rows: Array<{
    externalActionId: string;
    name: string;
    category: string | null;
    actionType: string | null;
  }>,
): Promise<number> {
  if (!rows.length) return 0;

  const payload = rows.map((row) => ({
    account_id: accountId,
    external_action_id: row.externalActionId,
    name: row.name,
    category: row.category,
    action_type: row.actionType,
    synced_at: new Date().toISOString(),
  }));

  for (const batch of chunkRows(payload)) {
    const { error } = await supabase.from("ad_conversion_actions").upsert(batch, {
      onConflict: "account_id,external_action_id",
    });
    if (error) throw new Error(error.message);
  }

  return payload.length;
}

async function upsertGoogleClicks(
  supabase: SupabaseClient,
  accountId: string,
  customerId: string,
  campaignIdMap: Map<string, string>,
  rows: Array<{
    gclid: string;
    externalCampaignId: string;
    clickDate: string;
  }>,
): Promise<number> {
  if (!rows.length) return 0;

  const deduped = new Map<
    string,
    {
      gclid: string;
      externalCampaignId: string;
      clickDate: string;
    }
  >();
  for (const row of rows) {
    if (!deduped.has(row.gclid)) deduped.set(row.gclid, row);
  }

  const payload = [...deduped.values()].map((row) => ({
    account_id: accountId,
    external_customer_id: customerId,
    gclid: row.gclid,
    external_campaign_id: row.externalCampaignId,
    campaign_id: campaignIdMap.get(row.externalCampaignId) ?? null,
    click_date: row.clickDate,
    synced_at: new Date().toISOString(),
  }));

  for (const batch of chunkRows(payload)) {
    const { error } = await supabase.from("google_ad_clicks").upsert(batch, {
      onConflict: "gclid",
    });
    if (error) throw new Error(error.message);
  }

  return payload.length;
}

export async function syncGoogleExtendedStats(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<GoogleExtendedSyncResult> {
  const account = await getActiveAdAccount(supabase, "google_ads");
  if (!account) {
    return {
      deviceRows: 0,
      conversionRows: 0,
      geoRows: 0,
      searchTermRows: 0,
      landingPageRows: 0,
      leadSubmissionRows: 0,
      conversionActionDefs: 0,
      gclidRows: 0,
    };
  }

  try {
    const accessToken = await ensureValidAccessToken(supabase, account);
    const campaignIdMap = await loadCampaignIdMap(supabase);

    const customerIds = googleAdsCustomerIds();
    const deviceAll: Awaited<ReturnType<typeof fetchGoogleDeviceStats>> = [];
    const conversionAll: Awaited<
      ReturnType<typeof fetchGoogleConversionActionStats>
    > = [];
    const geoAll: Awaited<ReturnType<typeof fetchGoogleGeoStats>> = [];
    const searchAll: Awaited<ReturnType<typeof fetchGoogleSearchTermStats>> =
      [];
    const landingAll: Awaited<ReturnType<typeof fetchGoogleLandingPageStats>> =
      [];
    const leadSubmissionsAll: Awaited<
      ReturnType<typeof fetchGoogleLeadFormSubmissions>
    > = [];
    const conversionActionDefsAll: Awaited<
      ReturnType<typeof fetchGoogleConversionActions>
    > = [];
    let gclidRows = 0;

    for (const customerId of customerIds) {
      try {
        deviceAll.push(
          ...(await fetchGoogleDeviceStats(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] device stats:", err);
      }
      try {
        conversionAll.push(
          ...(await fetchGoogleConversionActionStats(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] conversion stats:", err);
      }
      try {
        geoAll.push(
          ...(await fetchGoogleGeoStats(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] geo stats:", err);
      }
      try {
        searchAll.push(
          ...(await fetchGoogleSearchTermStats(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] search term stats:", err);
      }
      try {
        landingAll.push(
          ...(await fetchGoogleLandingPageStats(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] landing page stats:", err);
      }
      try {
        leadSubmissionsAll.push(
          ...(await fetchGoogleLeadFormSubmissions(
            accessToken,
            customerId,
            startDate,
            endDate,
          )),
        );
      } catch (err) {
        console.warn("[marketing] lead form submissions:", err);
      }
      try {
        conversionActionDefsAll.push(
          ...(await fetchGoogleConversionActions(accessToken, customerId)),
        );
      } catch (err) {
        console.warn("[marketing] conversion action defs:", err);
      }
      try {
        const clicks = await fetchGoogleClickViewRange(
          accessToken,
          customerId,
          startDate,
          endDate,
        );
        gclidRows += await upsertGoogleClicks(
          supabase,
          account.id,
          customerId,
          campaignIdMap,
          clicks,
        );
      } catch (err) {
        console.warn("[marketing] click_view gclid:", err);
      }
    }

    const [
      deviceRows,
      conversionRows,
      geoRows,
      searchTermRows,
      landingPageRows,
      leadSubmissionRows,
      conversionActionDefs,
    ] = await Promise.all([
      upsertSegmentRows(supabase, campaignIdMap, deviceAll),
      upsertSegmentRows(supabase, campaignIdMap, conversionAll),
      upsertSegmentRows(supabase, campaignIdMap, geoAll),
      upsertSearchTermRows(supabase, campaignIdMap, searchAll),
      upsertLandingPageRows(supabase, campaignIdMap, landingAll),
      upsertLeadSubmissions(
        supabase,
        account.id,
        campaignIdMap,
        leadSubmissionsAll,
      ),
      upsertConversionActionDefs(
        supabase,
        account.id,
        conversionActionDefsAll,
      ),
    ]);

    return {
      deviceRows,
      conversionRows,
      geoRows,
      searchTermRows,
      landingPageRows,
      leadSubmissionRows,
      conversionActionDefs,
      gclidRows,
    };
  } catch (err) {
    if (err instanceof MarketingTokenError) {
      await deactivateAdAccount(supabase, account.id);
    }
    return {
      deviceRows: 0,
      conversionRows: 0,
      geoRows: 0,
      searchTermRows: 0,
      landingPageRows: 0,
      leadSubmissionRows: 0,
      conversionActionDefs: 0,
      gclidRows: 0,
      error: err instanceof Error ? err.message : "Google extended sync hatası",
    };
  }
}
