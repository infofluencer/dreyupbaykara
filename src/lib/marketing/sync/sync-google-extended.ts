import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleAdsCustomerIds } from "@/lib/marketing/config";
import {
  fetchGoogleConversionActionStats,
  fetchGoogleDeviceStats,
  fetchGoogleGeoStats,
  fetchGoogleLandingPageStats,
  fetchGoogleSearchTermStats,
} from "@/lib/marketing/google-ads/client";
import {
  deactivateAdAccount,
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";

export type GoogleExtendedSyncResult = {
  deviceRows: number;
  conversionRows: number;
  geoRows: number;
  searchTermRows: number;
  landingPageRows: number;
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

  const { error } = await supabase.from("ad_segment_daily_stats").upsert(
    payload,
    { onConflict: "campaign_id,date,segment_type,segment_value" },
  );
  if (error) throw new Error(error.message);
  return payload.length;
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

  const { error } = await supabase.from("ad_search_term_daily").upsert(payload, {
    onConflict: "campaign_id,date,search_term",
  });
  if (error) throw new Error(error.message);
  return payload.length;
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

  const { error } = await supabase.from("ad_landing_page_daily").upsert(
    payload,
    { onConflict: "campaign_id,date,landing_page" },
  );
  if (error) throw new Error(error.message);
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
    }

    const [deviceRows, conversionRows, geoRows, searchTermRows, landingPageRows] =
      await Promise.all([
        upsertSegmentRows(supabase, campaignIdMap, deviceAll),
        upsertSegmentRows(supabase, campaignIdMap, conversionAll),
        upsertSegmentRows(supabase, campaignIdMap, geoAll),
        upsertSearchTermRows(supabase, campaignIdMap, searchAll),
        upsertLandingPageRows(supabase, campaignIdMap, landingAll),
      ]);

    return {
      deviceRows,
      conversionRows,
      geoRows,
      searchTermRows,
      landingPageRows,
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
      error: err instanceof Error ? err.message : "Google extended sync hatası",
    };
  }
}
