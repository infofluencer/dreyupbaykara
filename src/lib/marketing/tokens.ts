import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdAccountRow, MarketingPlatform } from "@/lib/marketing/types";
import {
  googleAdsConfig,
  metaAdsConfig,
} from "@/lib/marketing/config";

export class MarketingTokenError extends Error {
  constructor(
    message: string,
    public readonly platform: MarketingPlatform,
  ) {
    super(message);
    this.name = "MarketingTokenError";
  }
}

export async function getActiveAdAccount(
  supabase: SupabaseClient,
  platform: MarketingPlatform,
): Promise<AdAccountRow | null> {
  const { data, error } = await supabase
    .from("ad_accounts")
    .select(
      "id, platform, external_account_id, display_name, access_token, refresh_token, token_expires_at, is_active",
    )
    .eq("platform", platform)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[marketing] ad_accounts read failed: ${error.message}`);
  }

  return (data as AdAccountRow | null) ?? null;
}

export async function deactivateAdAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<void> {
  const { error } = await supabase
    .from("ad_accounts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) {
    console.error("[marketing] deactivate account:", error.message);
  }
}

async function exchangeGoogleRefreshToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const { clientId, clientSecret } = googleAdsConfig();
  if (!clientId || !clientSecret) {
    throw new MarketingTokenError(
      "Google OAuth env eksik",
      "google_ads",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new MarketingTokenError(
      json.error_description || json.error || "Google token yenileme başarısız",
      "google_ads",
    );
  }

  const expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  return { accessToken: json.access_token, expiresAt };
}

async function refreshGoogleAccessToken(
  account: AdAccountRow,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  if (!account.refresh_token) {
    throw new MarketingTokenError(
      "Google refresh token yok — GOOGLE_ADS_REFRESH_TOKEN env veya OAuth",
      "google_ads",
    );
  }
  return exchangeGoogleRefreshToken(account.refresh_token);
}

async function refreshMetaLongLivedToken(
  account: AdAccountRow,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const { appId, appSecret } = metaAdsConfig();
  if (!appId || !appSecret) {
    throw new MarketingTokenError("Meta OAuth env eksik", "meta");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: account.access_token,
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params}`,
  );
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !json.access_token) {
    throw new MarketingTokenError(
      json.error?.message || "Meta token yenileme başarısız",
      "meta",
    );
  }

  const expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  return { accessToken: json.access_token, expiresAt };
}

function tokenNeedsRefresh(expiresAt: string | null, skewMs = 5 * 60_000): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() <= skewMs;
}

function accessTokenMissing(account: AdAccountRow): boolean {
  return !account.access_token?.trim();
}

export async function ensureValidAccessToken(
  supabase: SupabaseClient,
  account: AdAccountRow,
): Promise<string> {
  const needsRefresh =
    accessTokenMissing(account) || tokenNeedsRefresh(account.token_expires_at);

  if (!needsRefresh) {
    return account.access_token;
  }

  try {
    const refreshed =
      account.platform === "google_ads"
        ? await refreshGoogleAccessToken(account)
        : await refreshMetaLongLivedToken(account);

    const { error } = await supabase
      .from("ad_accounts")
      .update({
        access_token: refreshed.accessToken,
        token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (error) {
      throw new Error(error.message);
    }

    return refreshed.accessToken;
  } catch (err) {
    await deactivateAdAccount(supabase, account.id);
    if (err instanceof MarketingTokenError) throw err;
    throw new MarketingTokenError(
      err instanceof Error ? err.message : "Token yenileme hatası",
      account.platform,
    );
  }
}

export async function upsertAdAccount(
  supabase: SupabaseClient,
  row: {
    platform: MarketingPlatform;
    externalAccountId: string;
    displayName?: string | null;
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("ad_accounts").upsert(
    {
      platform: row.platform,
      external_account_id: row.externalAccountId,
      display_name: row.displayName ?? null,
      access_token: row.accessToken,
      refresh_token: row.refreshToken ?? null,
      token_expires_at: row.tokenExpiresAt ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform,external_account_id" },
  );

  if (error) {
    throw new Error(`[marketing] ad_accounts upsert failed: ${error.message}`);
  }
}

export type EnvBootstrapResult = {
  google: { applied: boolean; error?: string };
  meta: { applied: boolean; error?: string };
};

/**
 * OAuth yerine env'deki kalıcı token'ları ad_accounts'a yazar.
 * Cron sync başlamadan önce çağrılır — site OAuth akışına bağlı kalmaz.
 */
export async function bootstrapAdAccountsFromEnv(
  supabase: SupabaseClient,
): Promise<EnvBootstrapResult> {
  const result: EnvBootstrapResult = {
    google: { applied: false },
    meta: { applied: false },
  };

  const googleRefresh = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  const googleAccess = process.env.GOOGLE_ADS_ACCESS_TOKEN?.trim();
  const { loginCustomerId, clientId, clientSecret } = googleAdsConfig();

  if (loginCustomerId && (googleRefresh || googleAccess)) {
    try {
      let accessToken = googleAccess || "";
      let expiresAt: string | null = null;

      if (googleRefresh && clientId && clientSecret) {
        const refreshed = await exchangeGoogleRefreshToken(googleRefresh);
        accessToken = refreshed.accessToken;
        expiresAt = refreshed.expiresAt;
      }

      if (!accessToken) {
        throw new Error("GOOGLE_ADS_ACCESS_TOKEN veya REFRESH_TOKEN gerekli");
      }

      await upsertAdAccount(supabase, {
        platform: "google_ads",
        externalAccountId: loginCustomerId,
        displayName: "Google Ads (env)",
        accessToken,
        refreshToken: googleRefresh ?? null,
        tokenExpiresAt: expiresAt,
      });
      result.google.applied = true;
    } catch (err) {
      result.google.error =
        err instanceof Error ? err.message : "Google env bootstrap hatası";
    }
  }

  const metaToken = process.env.META_ACCESS_TOKEN?.trim();
  const { adAccountId } = metaAdsConfig();

  if (metaToken && adAccountId) {
    try {
      await upsertAdAccount(supabase, {
        platform: "meta",
        externalAccountId: adAccountId,
        displayName: "Meta (env)",
        accessToken: metaToken,
        refreshToken: null,
        tokenExpiresAt: null,
      });
      result.meta.applied = true;
    } catch (err) {
      result.meta.error =
        err instanceof Error ? err.message : "Meta env bootstrap hatası";
    }
  }

  return result;
}

export type AdAccountEnvExport = {
  googleRefreshToken: string | null;
  metaAccessToken: string | null;
};

/** Service role — yalnızca admin connect sayfasında Dokploy env kopyası için. */
export async function loadAdAccountEnvExport(
  supabase: SupabaseClient,
): Promise<AdAccountEnvExport> {
  const { data, error } = await supabase
    .from("ad_accounts")
    .select("platform, refresh_token, access_token, is_active")
    .eq("is_active", true);

  if (error) {
    throw new Error(`[marketing] ad_accounts export read failed: ${error.message}`);
  }

  let googleRefreshToken: string | null = null;
  let metaAccessToken: string | null = null;

  for (const row of data ?? []) {
    if (row.platform === "google_ads" && row.refresh_token) {
      googleRefreshToken = row.refresh_token as string;
    }
    if (row.platform === "meta" && row.access_token) {
      metaAccessToken = row.access_token as string;
    }
  }

  return { googleRefreshToken, metaAccessToken };
}
