import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleAdsCustomerIds, marketingCronSyncDays, marketingSyncDays } from "@/lib/marketing/config";
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
import {
  MARKETING_CRON_BACKFILL_CHUNKS,
  MARKETING_GOOGLE_EXTENDED_DAYS,
  MARKETING_SYNC_CHUNK_DAYS,
} from "@/lib/marketing/constants";

export type SyncDailyStatsResult = {
  platform: MarketingPlatform;
  rows: number;
  error?: string;
};

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

export function dateRangeChunks(
  startDate: string,
  endDate: string,
  chunkDays = MARKETING_SYNC_CHUNK_DAYS,
): Array<{ startDate: string; endDate: string }> {
  if (!startDate || !endDate || startDate > endDate) return [];
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const rawEnd = addDaysYmd(cursor, chunkDays - 1);
    const end = rawEnd < endDate ? rawEnd : endDate;
    chunks.push({ startDate: cursor, endDate: end });
    cursor = addDaysYmd(end, 1);
  }
  return chunks;
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

async function syncPlatformDailyStatsRange(
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

async function syncPlatformDailyStats(
  supabase: SupabaseClient,
  platform: MarketingPlatform,
  startDate: string,
  endDate: string,
): Promise<SyncDailyStatsResult> {
  const chunks = dateRangeChunks(startDate, endDate);
  if (!chunks.length) {
    return { platform, rows: 0 };
  }

  let rows = 0;
  const errors: string[] = [];
  for (const chunk of chunks) {
    const result = await syncPlatformDailyStatsRange(
      supabase,
      platform,
      chunk.startDate,
      chunk.endDate,
    );
    rows += result.rows;
    if (result.error) errors.push(result.error);
  }

  return {
    platform,
    rows,
    error: errors.length ? errors.join("; ") : undefined,
  };
}

function mergePlatformResults(
  results: SyncDailyStatsResult[],
): SyncDailyStatsResult[] {
  const merged = new Map<MarketingPlatform, SyncDailyStatsResult>();
  for (const result of results) {
    const current = merged.get(result.platform) ?? {
      platform: result.platform,
      rows: 0,
    };
    current.rows += result.rows;
    if (result.error) {
      current.error = current.error
        ? `${current.error}; ${result.error}`
        : result.error;
    }
    merged.set(result.platform, current);
  }
  return [...merged.values()];
}

async function oldestDailyStatDate(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ad_daily_stats")
    .select("date")
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[marketing] oldest daily stat:", error.message);
    return null;
  }
  const date = String(data?.date ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** Eksik geçmişi 90’ar gün, yeniye yakın parçalardan doldur. */
async function backfillHistoryDailyStats(
  supabase: SupabaseClient,
  historyDays: number,
  refreshStartDate: string,
): Promise<{
  startDate: string | null;
  endDate: string | null;
  chunks: number;
  rows: number;
  stats: SyncDailyStatsResult[];
}> {
  const neededStart = rollingSyncDateRange(historyDays).startDate;
  const backfillEnd = addDaysYmd(refreshStartDate, -1);
  if (neededStart > backfillEnd) {
    return { startDate: null, endDate: null, chunks: 0, rows: 0, stats: [] };
  }

  const oldest = await oldestDailyStatDate(supabase);
  if (oldest && oldest <= neededStart) {
    return { startDate: null, endDate: null, chunks: 0, rows: 0, stats: [] };
  }

  const fillEnd = oldest ? addDaysYmd(oldest, -1) : backfillEnd;
  if (neededStart > fillEnd) {
    return { startDate: null, endDate: null, chunks: 0, rows: 0, stats: [] };
  }

  const pending = dateRangeChunks(neededStart, fillEnd);
  const chunks = pending.slice(-MARKETING_CRON_BACKFILL_CHUNKS);
  const stats: SyncDailyStatsResult[] = [];

  for (const chunk of chunks) {
    stats.push(
      ...(await syncAllDailyStats(supabase, chunk.startDate, chunk.endDate)),
    );
  }

  return {
    startDate: chunks[0]?.startDate ?? null,
    endDate: chunks[chunks.length - 1]?.endDate ?? null,
    chunks: chunks.length,
    rows: stats.reduce((sum, row) => sum + row.rows, 0),
    stats: mergePlatformResults(stats),
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
  backfill: {
    startDate: string | null;
    endDate: string | null;
    chunks: number;
    rows: number;
  };
  range: { startDate: string; endDate: string; days: number; mode: "cron" | "full" };
}> {
  const bootstrap = await bootstrapAdAccountsFromEnv(supabase);
  const { syncAllCampaigns } = await import("./sync-campaigns");
  const mode = options?.mode ?? "cron";
  const historyDays = marketingSyncDays();
  const refreshDays =
    mode === "full"
      ? (options?.days ?? historyDays)
      : (options?.days ?? marketingCronSyncDays());
  const range = rollingSyncDateRange(refreshDays);
  const campaigns = await syncAllCampaigns(supabase);
  const stats = await syncAllDailyStats(
    supabase,
    range.startDate,
    range.endDate,
  );
  const googleExtendedRange = rollingSyncDateRange(
    Math.min(MARKETING_GOOGLE_EXTENDED_DAYS, historyDays),
  );
  const { syncGoogleExtendedStats } = await import("./sync-google-extended");
  const googleExtended = await syncGoogleExtendedStats(
    supabase,
    googleExtendedRange.startDate,
    googleExtendedRange.endDate,
  );

  const backfill =
    mode === "cron"
      ? await backfillHistoryDailyStats(
          supabase,
          historyDays,
          range.startDate,
        )
      : { startDate: null, endDate: null, chunks: 0, rows: 0 };

  return {
    bootstrap,
    campaigns,
    stats,
    googleExtended,
    backfill: {
      startDate: backfill.startDate,
      endDate: backfill.endDate,
      chunks: backfill.chunks,
      rows: backfill.rows,
    },
    range: { ...range, days: refreshDays, mode },
  };
}
