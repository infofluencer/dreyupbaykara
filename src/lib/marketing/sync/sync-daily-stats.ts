import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleAdsCustomerIds, marketingSyncDays } from "@/lib/marketing/config";
import { fetchGoogleDailyStats } from "@/lib/marketing/google-ads/client";
import { fetchMetaDailyStats } from "@/lib/marketing/meta/client";
import type { MarketingPlatform } from "@/lib/marketing/types";
import {
  bootstrapAdAccountsFromEnv,
  deactivateAdAccount,
  ensureValidAccessToken,
  getActiveAdAccount,
  getActiveAdAccounts,
  MarketingTokenError,
} from "@/lib/marketing/tokens";
import { chunkRows, mergeRowsByKey } from "@/lib/marketing/sync/upsert-rows";

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
  if (platform === "meta") {
    return syncMetaDailyStatsAllAccounts(supabase, startDate, endDate);
  }

  const account = await getActiveAdAccount(supabase, platform);
  if (!account) {
    return { platform, rows: 0 };
  }

  try {
    const accessToken = await ensureValidAccessToken(supabase, account);
    const remoteStats = (
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
    ).flat();

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
          ctr: stat.ctr ?? null,
          average_cpc: stat.averageCpc ?? null,
          cost_per_conversion: stat.costPerConversion ?? null,
          search_impression_share: stat.searchImpressionShare ?? null,
          search_budget_lost_impression_share:
            stat.searchBudgetLostImpressionShare ?? null,
          search_rank_lost_impression_share:
            stat.searchRankLostImpressionShare ?? null,
          updated_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (!rows.length) {
      return { platform, rows: 0 };
    }

    const deduped = mergeRowsByKey(
      rows,
      (row) => `${row.campaign_id}|${row.date}`,
      ["spend", "impressions", "clicks", "conversions"],
    ).map((row) => {
      const clicks = Number(row.clicks);
      const impressions = Number(row.impressions);
      const spend = Number(row.spend);
      return {
        ...row,
        ctr:
          impressions > 0
            ? Math.round((clicks / impressions) * 1_000_000) / 1_000_000
            : row.ctr,
        average_cpc:
          clicks > 0
            ? Math.round((spend / clicks) * 100) / 100
            : row.average_cpc,
      };
    });

    for (const batch of chunkRows(deduped)) {
      const { error } = await supabase.from("ad_daily_stats").upsert(batch, {
        onConflict: "campaign_id,date",
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    return { platform, rows: deduped.length };
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

async function syncMetaDailyStatsAllAccounts(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<SyncDailyStatsResult> {
  const accounts = await getActiveAdAccounts(supabase, "meta");
  if (!accounts.length) {
    return { platform: "meta", rows: 0 };
  }

  let totalRows = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const accessToken = await ensureValidAccessToken(supabase, account);
      const remoteStats = await fetchMetaDailyStats(
        accessToken,
        account.external_account_id,
        startDate,
        endDate,
      );
      if (!remoteStats.length) continue;

      const externalIds = [
        ...new Set(remoteStats.map((s) => s.externalCampaignId)),
      ];
      const { data: campaigns, error: campaignError } = await supabase
        .from("ad_campaigns")
        .select("id, external_campaign_id")
        .eq("platform", "meta")
        .eq("account_id", account.id)
        .in("external_campaign_id", externalIds);

      if (campaignError) throw new Error(campaignError.message);

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

      if (!rows.length) continue;

      const deduped = mergeRowsByKey(
        rows,
        (row) => `${row.campaign_id}|${row.date}`,
        ["spend", "impressions", "clicks", "conversions"],
      );

      for (const batch of chunkRows(deduped)) {
        const { error } = await supabase.from("ad_daily_stats").upsert(batch, {
          onConflict: "campaign_id,date",
        });
        if (error) throw new Error(error.message);
      }

      totalRows += deduped.length;
    } catch (err) {
      if (err instanceof MarketingTokenError) {
        await deactivateAdAccount(supabase, account.id);
      }
      errors.push(err instanceof Error ? err.message : "Meta stats hatası");
    }
  }

  return {
    platform: "meta",
    rows: totalRows,
    error: errors.length ? errors.join("; ") : undefined,
  };
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
  options?: { days?: number; mode?: "cron" | "full" },
): Promise<{
  bootstrap: Awaited<ReturnType<typeof bootstrapAdAccountsFromEnv>>;
  campaigns: Awaited<ReturnType<typeof import("./sync-campaigns").syncAllCampaigns>>;
  stats: SyncDailyStatsResult[];
  googleExtended: Awaited<
    ReturnType<typeof import("./sync-google-extended").syncGoogleExtendedStats>
  >;
  range: { startDate: string; endDate: string; days: number; mode: "cron" | "full" };
}> {
  const bootstrap = await bootstrapAdAccountsFromEnv(supabase);
  const { syncAllCampaigns } = await import("./sync-campaigns");
  const mode = options?.mode ?? "full";
  const days = options?.days ?? marketingSyncDays();
  const range = rollingSyncDateRange(days);
  const campaigns = await syncAllCampaigns(supabase);
  const stats = await syncAllDailyStats(
    supabase,
    range.startDate,
    range.endDate,
  );
  const { syncGoogleExtendedStats } = await import("./sync-google-extended");
  const googleExtended = await syncGoogleExtendedStats(
    supabase,
    range.startDate,
    range.endDate,
  );
  return {
    bootstrap,
    campaigns,
    stats,
    googleExtended,
    range: { ...range, days, mode },
  };
}
