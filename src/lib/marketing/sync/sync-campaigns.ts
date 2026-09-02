import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCampaignSite } from "@/lib/marketing/site-matcher";
import type {
  MarketingPlatform,
  SitePrefixMapRow,
  AdCustomerSiteMapRow,
} from "@/lib/marketing/types";
import {
  fetchGoogleAccountDisplayName,
  fetchGoogleCampaigns,
} from "@/lib/marketing/google-ads/client";
import {
  fetchMetaCampaigns,
  defaultMetaAdAccountId,
} from "@/lib/marketing/meta/client";
import {
  deactivateAdAccount,
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";
import { googleAdsConfig, googleAdsCustomerIds, googleAdsCustomerSiteMapFromEnv } from "@/lib/marketing/config";

export type SyncCampaignsResult = {
  platform: MarketingPlatform;
  synced: number;
  skippedManual: number;
  error?: string;
};

async function loadCustomerSiteMap(
  supabase: SupabaseClient,
): Promise<AdCustomerSiteMapRow[]> {
  const { data, error } = await supabase
    .from("ad_customer_site_map")
    .select("platform, external_customer_id, site, label");

  const fromDb = error ? [] : ((data as AdCustomerSiteMapRow[]) ?? []);
  const fromEnv = googleAdsCustomerSiteMapFromEnv();

  if (error) {
    console.warn("[marketing] ad_customer_site_map:", error.message);
  }

  const merged = new Map<string, AdCustomerSiteMapRow>();
  for (const row of [...fromDb, ...fromEnv]) {
    merged.set(`${row.platform}:${row.external_customer_id}`, row);
  }

  if (!merged.size && googleAdsCustomerIds().length) {
    console.warn(
      "[marketing] ad_customer_site_map boş — migration veya GOOGLE_ADS_CUSTOMER_SITE_MAP gerekli",
    );
  }

  return [...merged.values()];
}

function siteForGoogleCustomer(
  map: AdCustomerSiteMapRow[],
  customerId: string,
): string | null {
  const id = customerId.replace(/\D/g, "");
  return (
    map.find(
      (row) =>
        row.platform === "google_ads" &&
        row.external_customer_id.replace(/\D/g, "") === id,
    )?.site ?? null
  );
}

async function loadPrefixMap(
  supabase: SupabaseClient,
): Promise<SitePrefixMapRow[]> {
  const { data, error } = await supabase
    .from("site_prefix_map")
    .select("prefix, site");

  if (error) {
    throw new Error(`site_prefix_map read failed: ${error.message}`);
  }

  return (data as SitePrefixMapRow[]) ?? [];
}

async function upsertCampaign(
  supabase: SupabaseClient,
  input: {
    accountId: string;
    platform: MarketingPlatform;
    externalId: string;
    name: string;
    status: string | null;
    prefixMap: SitePrefixMapRow[];
    accountSite?: string | null;
    existing?: {
      site: string | null;
      site_match_source: string;
    } | null;
  },
): Promise<"inserted" | "updated" | "skipped_manual"> {
  const isManual = input.existing?.site_match_source === "manual";

  const siteFields = isManual
    ? {
        site: input.existing?.site ?? null,
        site_match_source: "manual" as const,
      }
    : (() => {
        const matched = resolveCampaignSite(
          input.name,
          input.prefixMap,
          input.accountSite,
        );
        return {
          site: matched.site,
          site_match_source: matched.siteMatchSource,
        };
      })();

  const payload = {
    account_id: input.accountId,
    platform: input.platform,
    external_campaign_id: input.externalId,
    name: input.name,
    status: input.status,
    site: siteFields.site,
    site_match_source: siteFields.site_match_source,
    updated_at: new Date().toISOString(),
  };

  if (isManual) {
    const { error } = await supabase
      .from("ad_campaigns")
      .update({
        name: input.name,
        status: input.status,
        updated_at: payload.updated_at,
      })
      .eq("platform", input.platform)
      .eq("external_campaign_id", input.externalId);

    if (error) {
      throw new Error(error.message);
    }
    return "skipped_manual";
  }

  const { error } = await supabase.from("ad_campaigns").upsert(payload, {
    onConflict: "platform,external_campaign_id",
  });

  if (error) {
    throw new Error(error.message);
  }

  return input.existing ? "updated" : "inserted";
}

async function syncPlatformCampaigns(
  supabase: SupabaseClient,
  platform: MarketingPlatform,
  prefixMap: SitePrefixMapRow[],
  customerSiteMap: AdCustomerSiteMapRow[],
): Promise<SyncCampaignsResult> {
  const account = await getActiveAdAccount(supabase, platform);
  if (!account) {
    return { platform, synced: 0, skippedManual: 0 };
  }

  try {
    const accessToken = await ensureValidAccessToken(supabase, account);
    let remoteCampaigns: Array<{
      externalId: string;
      name: string;
      status: string | null;
      accountSite?: string | null;
    }>;

    if (platform === "google_ads") {
      remoteCampaigns = (
        await Promise.all(
          googleAdsCustomerIds().map(async (customerId) => {
            const campaigns = await fetchGoogleCampaigns(
              accessToken,
              customerId,
            );
            const accountSite = siteForGoogleCustomer(
              customerSiteMap,
              customerId,
            );
            return campaigns.map((c) => ({ ...c, accountSite }));
          }),
        )
      ).flat();
    } else {
      const metaSite =
        customerSiteMap.find(
          (row) =>
            row.platform === "meta" &&
            row.external_customer_id.replace(/^act_/, "") ===
              account.external_account_id.replace(/^act_/, ""),
        )?.site ?? null;
      const campaigns = await fetchMetaCampaigns(
        accessToken,
        account.external_account_id,
      );
      remoteCampaigns = campaigns.map((c) => ({
        ...c,
        accountSite: metaSite,
      }));
    }

    const { data: existingRows } = await supabase
      .from("ad_campaigns")
      .select("external_campaign_id, site, site_match_source")
      .eq("platform", platform);

    const existingByExternal = new Map(
      (existingRows ?? []).map((row) => [
        row.external_campaign_id as string,
        {
          site: row.site as string | null,
          site_match_source: row.site_match_source as string,
        },
      ]),
    );

    let synced = 0;
    let skippedManual = 0;

    for (const remote of remoteCampaigns) {
      const result = await upsertCampaign(supabase, {
        accountId: account.id,
        platform,
        externalId: remote.externalId,
        name: remote.name,
        status: remote.status,
        prefixMap,
        accountSite: remote.accountSite,
        existing: existingByExternal.get(remote.externalId) ?? null,
      });

      if (result === "skipped_manual") {
        skippedManual += 1;
      } else {
        synced += 1;
      }
    }

    if (platform === "google_ads" && !account.display_name) {
      const displayName = await fetchGoogleAccountDisplayName(
        accessToken,
        account.external_account_id,
      );
      if (displayName) {
        await supabase
          .from("ad_accounts")
          .update({ display_name: displayName })
          .eq("id", account.id);
      }
    }

    return { platform, synced, skippedManual };
  } catch (err) {
    if (err instanceof MarketingTokenError) {
      await deactivateAdAccount(supabase, account.id);
    }
    return {
      platform,
      synced: 0,
      skippedManual: 0,
      error: err instanceof Error ? err.message : "Sync hatası",
    };
  }
}

export async function syncAllCampaigns(
  supabase: SupabaseClient,
): Promise<SyncCampaignsResult[]> {
  const [prefixMap, customerSiteMap] = await Promise.all([
    loadPrefixMap(supabase),
    loadCustomerSiteMap(supabase),
  ]);
  const results: SyncCampaignsResult[] = [];

  for (const platform of ["google_ads", "meta"] as const) {
    results.push(
      await syncPlatformCampaigns(
        supabase,
        platform,
        prefixMap,
        customerSiteMap,
      ),
    );
  }

  return results;
}

export async function ensureDefaultGoogleAccountId(): Promise<string | null> {
  const { loginCustomerId } = googleAdsConfig();
  return loginCustomerId || null;
}

export async function ensureDefaultMetaAccountId(): Promise<string | null> {
  const id = defaultMetaAdAccountId();
  return id || null;
}
