import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleAdsCustomerIds } from "@/lib/marketing/config";
import { fetchGoogleDailyStats } from "@/lib/marketing/google-ads/client";
import { fetchMetaDailyStats } from "@/lib/marketing/meta/client";
import type { MarketingPlatform } from "@/lib/marketing/types";
import {
  deactivateAdAccount,
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";

export type SyncDailyStatsResult = {
  platform: MarketingPlatform;
  rows: number;
  error?: string;
};

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rollingSyncDateRange(days = 7): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: formatYmd(start), endDate: formatYmd(end) };
}

async function syncPlatformDailyStats(
  supabase: SupabaseClient,
  platform: MarketingPlatform,
  startDate: string,
  endDate: string,
): Promise<SyncDailyStatsResult> {
  const account = await getActiveAdAccount(supabase, platform);
  if (!account) {
    return { platform, rows: 0 };
  }

  try {
    const accessToken = await ensureValidAccessToken(supabase, account);
    const remoteStats =
      platform === "google_ads"
        ? (
            await Promise.all(
              googleAdsCustomerIds().map((customerId) =>
                fetchGoogleDailyStats(
                  accessToken,
                  customerId,
                  startDate,
                  endDate,
                ),
              ),
            )
          ).flat()
        : await fetchMetaDailyStats(
            accessToken,
            account.external_account_id,
            startDate,
            endDate,
          );

    if (!remoteStats.length) {
      return { platform, rows: 0 };
    }

    const externalIds = [...new Set(remoteStats.map((s) => s.externalCampaignId))];
    const { data: campaigns, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("id, external_campaign_id")
      .eq("platform", platform)
      .in("external_campaign_id", externalIds);

    if (campaignError) {
      throw new Error(campaignError.message);
    }

    const campaignIdByExternal = new Map(
      (campaigns ?? []).map((row) => [
        row.external_campaign_id as string,
        row.id as string,
      ]),
    );

    const rows = remoteStats
      .map((stat) => {
        const campaignId = campaignIdByExternal.get(stat.externalCampaignId);
        if (!campaignId) return null;
        return {
          campaign_id: campaignId,
          date: stat.date,
          spend: stat.spend,
          impressions: stat.impressions,
          clicks: stat.clicks,
          conversions: stat.conversions,
          currency: stat.currency,
          updated_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (!rows.length) {
      return { platform, rows: 0 };
    }

    const { error } = await supabase.from("ad_daily_stats").upsert(rows, {
      onConflict: "campaign_id,date",
    });

    if (error) {
      throw new Error(error.message);
    }

    return { platform, rows: rows.length };
  } catch (err) {
    if (err instanceof MarketingTokenError) {
      await deactivateAdAccount(supabase, account.id);
    }
    return {
      platform,
      rows: 0,
      error: err instanceof Error ? err.message : "Stats sync hatası",
    };
  }
}

export async function syncAllDailyStats(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<SyncDailyStatsResult[]> {
  const results: SyncDailyStatsResult[] = [];
  for (const platform of ["google_ads", "meta"] as const) {
    results.push(
      await syncPlatformDailyStats(supabase, platform, startDate, endDate),
    );
  }
  return results;
}

export async function runMarketingSync(
  supabase: SupabaseClient,
  options?: { days?: number },
): Promise<{
  campaigns: Awaited<ReturnType<typeof import("./sync-campaigns").syncAllCampaigns>>;
  stats: SyncDailyStatsResult[];
  range: { startDate: string; endDate: string };
}> {
  const { syncAllCampaigns } = await import("./sync-campaigns");
  const range = rollingSyncDateRange(options?.days ?? 7);
  const campaigns = await syncAllCampaigns(supabase);
  const stats = await syncAllDailyStats(
    supabase,
    range.startDate,
    range.endDate,
  );
  return { campaigns, stats, range };
}
