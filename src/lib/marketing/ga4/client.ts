import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdPlatform } from "@/lib/crm/source-kind";
import { googleAdsConfig } from "@/lib/marketing/config";
import {
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";

export type Ga4TrafficSourceStats = {
  total: number;
  platforms: Record<AdPlatform, number>;
  startDate: string;
  endDate: string;
  /** Virgülle birleştirilmiş property ID'ler */
  propertyId: string | null;
  error?: string;
  /** OAuth yeniden bağlama gerekir (Analytics scope yok) */
  needsReconnect?: boolean;
};

const emptyPlatforms = (): Record<AdPlatform, number> => ({
  google_ads: 0,
  meta: 0,
  other: 0,
  organic: 0,
});

/** GA4 sessionDefaultChannelGroup → pasta dilimi */
export function mapGa4ChannelToPlatform(channel: string): AdPlatform {
  const c = channel.trim().toLowerCase();
  if (
    c.includes("paid search") ||
    c.includes("paid shopping") ||
    c.includes("cross-network") ||
    c.includes("display") ||
    c.includes("video") ||
    c === "paid other"
  ) {
    return "google_ads";
  }
  if (c.includes("paid social")) return "meta";
  if (
    c.includes("organic search") ||
    c === "direct" ||
    c.includes("organic shopping") ||
    c.includes("organic video")
  ) {
    return "organic";
  }
  if (c.includes("organic social")) {
    return "meta";
  }
  return "other";
}

/** Tek veya virgüllü çoklu: GA4_PROPERTY_ID=474676141,524968102,549325905 */
export function ga4PropertyIdsFromEnv(): string[] {
  const raw =
    process.env.GA4_PROPERTY_ID?.trim() ||
    process.env.GA4_PROPERTY_IDS?.trim() ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim() ||
    "";
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((part) => part.replace(/^properties\//, "").replace(/\D/g, ""))
        .filter(Boolean),
    ),
  ];
}

async function getGoogleAccessToken(
  supabase: SupabaseClient,
): Promise<{ accessToken: string } | { error: string; needsReconnect?: boolean }> {
  const account = await getActiveAdAccount(supabase, "google_ads");
  if (!account) {
    const { clientId } = googleAdsConfig();
    if (!clientId) {
      return { error: "Google OAuth yapılandırılmamış." };
    }
    return {
      error: "Google hesabı bağlı değil.",
      needsReconnect: true,
    };
  }

  try {
    const accessToken = await ensureValidAccessToken(supabase, account);
    return { accessToken };
  } catch (err) {
    const message =
      err instanceof MarketingTokenError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Google token alınamadı";
    return { error: message, needsReconnect: true };
  }
}

type RunReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

async function runPropertyReport(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<
  | { ok: true; platforms: Record<AdPlatform, number> }
  | { ok: false; message: string; needsReconnect?: boolean }
> {
  const platforms = emptyPlatforms();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "activeUsers" }],
        limit: 50,
      }),
    },
  );

  const json = (await res.json()) as {
    rows?: RunReportRow[];
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    const message = json.error?.message || `GA4 hata (${res.status})`;
    const needsReconnect =
      res.status === 403 &&
      (message.includes("scope") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("insufficient"));
    return { ok: false, message, needsReconnect };
  }

  for (const row of json.rows ?? []) {
    const channel = row.dimensionValues?.[0]?.value || "(not set)";
    const users = Number(row.metricValues?.[0]?.value || 0);
    if (!Number.isFinite(users) || users <= 0) continue;
    platforms[mapGa4ChannelToPlatform(channel)] += Math.round(users);
  }

  return { ok: true, platforms };
}

/**
 * GA4 aktif kullanıcılar — tüm property'ler toplanır (3 site).
 * Mevcut Google OAuth token'ı — Analytics readonly scope gerekir.
 */
export async function loadGa4TrafficSourceStats(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<Ga4TrafficSourceStats> {
  const platforms = emptyPlatforms();
  const propertyIds = ga4PropertyIdsFromEnv();

  if (!propertyIds.length) {
    return {
      total: 0,
      platforms,
      startDate,
      endDate,
      propertyId: null,
      error:
        "GA4_PROPERTY_ID eksik. Virgülle: 474676141,524968102,549325905",
    };
  }

  const token = await getGoogleAccessToken(supabase);
  if ("error" in token) {
    return {
      total: 0,
      platforms,
      startDate,
      endDate,
      propertyId: propertyIds.join(","),
      error: token.error,
      needsReconnect: token.needsReconnect,
    };
  }

  const errors: string[] = [];
  let needsReconnect = false;

  for (const propertyId of propertyIds) {
    const result = await runPropertyReport(
      token.accessToken,
      propertyId,
      startDate,
      endDate,
    );
    if (!result.ok) {
      console.error(`[ga4] property ${propertyId}:`, result.message);
      errors.push(`${propertyId}: ${result.message}`);
      if (result.needsReconnect) needsReconnect = true;
      continue;
    }
    for (const key of Object.keys(platforms) as AdPlatform[]) {
      platforms[key] += result.platforms[key];
    }
  }

  const total =
    platforms.google_ads + platforms.meta + platforms.other + platforms.organic;

  if (total === 0 && errors.length) {
    return {
      total: 0,
      platforms,
      startDate,
      endDate,
      propertyId: propertyIds.join(","),
      error: needsReconnect
        ? "Google token’da Analytics yetkisi yok. Reklam → Hesap bağla’dan Google’ı yeniden bağlayın."
        : errors[0],
      needsReconnect,
    };
  }

  return {
    total,
    platforms,
    startDate,
    endDate,
    propertyId: propertyIds.join(","),
  };
}
