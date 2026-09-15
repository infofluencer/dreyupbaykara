import "server-only";

import type { AdPlatform } from "@/lib/crm/source-kind";
import { googleAdsConfig } from "@/lib/marketing/config";
import {
  ensureValidAccessToken,
  getActiveAdAccount,
  MarketingTokenError,
} from "@/lib/marketing/tokens";
import { createServiceClient } from "@/lib/supabase/admin";

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
  /** Cloud Console’da Analytics Data API kapalı */
  apiDisabled?: boolean;
  enableApiUrl?: string;
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

/** Env sırası (bare ID listesi): endospine | fıtık | bel */
export const GA4_DEFAULT_SITE_ORDER = [
  "endospineistanbul",
  "fitikameliyati",
  "endoskopikbelameliyati",
] as const;

/**
 * GA4_PROPERTY_ID parse:
 * - `474,524,549` → sırayla GA4_DEFAULT_SITE_ORDER
 * - `endospineistanbul:474,fitikameliyati:524` → açık eşleme
 */
export function ga4SitePropertyMapFromEnv(): Record<string, string> {
  const raw =
    process.env.GA4_PROPERTY_ID?.trim() ||
    process.env.GA4_PROPERTY_IDS?.trim() ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim() ||
    "";
  if (!raw) return {};

  const map: Record<string, string> = {};
  const parts = raw.split(/[,;\s]+/).filter(Boolean);
  const bareIds: string[] = [];

  for (const part of parts) {
    const named = part.match(/^([a-z0-9_]+):(\d+)$/i);
    if (named) {
      map[named[1]!.toLowerCase()] = named[2]!;
      continue;
    }
    const id = part.replace(/^properties\//, "").replace(/\D/g, "");
    if (id) bareIds.push(id);
  }

  bareIds.forEach((id, index) => {
    const site = GA4_DEFAULT_SITE_ORDER[index];
    if (site && !map[site]) map[site] = id;
  });

  return map;
}

/** Tek veya virgüllü çoklu: GA4_PROPERTY_ID=474676141,524968102,549325905 */
export function ga4PropertyIdsFromEnv(): string[] {
  return [...new Set(Object.values(ga4SitePropertyMapFromEnv()))];
}

function propertyIdsForSiteFilter(siteFilter: string | null): string[] {
  const map = ga4SitePropertyMapFromEnv();
  const all = [...new Set(Object.values(map))];
  if (!siteFilter?.trim()) return all;
  const id = map[siteFilter.trim()];
  return id ? [id] : all;
}

async function getGoogleAccessToken(): Promise<
  { accessToken: string } | { error: string; needsReconnect?: boolean }
> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY eksik." };
  }

  try {
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

    const accessToken = await ensureValidAccessToken(supabase, account);
    return { accessToken };
  } catch (err) {
    const message =
      err instanceof MarketingTokenError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Google token alınamadı";
    return {
      error: message,
      needsReconnect:
        message.includes("permission denied") ||
        message.includes("refresh") ||
        message.includes("bağlı değil"),
    };
  }
}

type RunReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

export type Ga4ReportFailure = {
  ok: false;
  message: string;
  needsReconnect?: boolean;
  /** Cloud Console’da Analytics Data API kapalı */
  apiDisabled?: boolean;
  enableApiUrl?: string;
};

const ANALYTICS_DATA_API_ENABLE =
  "https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview";

/** OAuth client ID’den Cloud proje numarası (…apps.googleusercontent.com öncesi). */
export function googleCloudProjectNumberFromClientId(
  clientId: string | null | undefined,
): string | null {
  const match = (clientId ?? "").match(/^(\d+)-/);
  return match?.[1] ?? null;
}

function classifyGa4HttpError(
  status: number,
  message: string,
): Omit<Ga4ReportFailure, "ok"> {
  const lower = message.toLowerCase();
  const apiDisabled =
    lower.includes("has not been used") ||
    lower.includes("is disabled") ||
    lower.includes("service_disabled") ||
    lower.includes("access not configured");

  const { clientId } = googleAdsConfig();
  const projectNumber = googleCloudProjectNumberFromClientId(clientId);
  const enableApiUrl = projectNumber
    ? `${ANALYTICS_DATA_API_ENABLE}?project=${projectNumber}`
    : ANALYTICS_DATA_API_ENABLE;

  if (apiDisabled) {
    return {
      message:
        "Google Analytics Data API bu Cloud projesinde kapalı. Aşağıdaki linkten Enable’a basın; 1–2 dk sonra Özet’i yenileyin.",
      apiDisabled: true,
      enableApiUrl,
    };
  }

  const needsReconnect =
    status === 403 &&
    (lower.includes("scope") ||
      lower.includes("insufficient authentication") ||
      lower.includes("access_token_scope"));

  const propertyDenied =
    lower.includes("sufficient permissions for this property") ||
    lower.includes("caller does not have permission");

  if (propertyDenied) {
    return {
      message:
        "OAuth ile bağlanan Google hesabının bu GA4 property’sinde Viewer yetkisi yok. Analytics → Admin → Property access management’tan ekleyin.",
    };
  }

  return { message, needsReconnect };
}

async function runPropertyReport(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ ok: true; platforms: Record<AdPlatform, number> } | Ga4ReportFailure> {
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
    const raw = json.error?.message || `GA4 hata (${res.status})`;
    return { ok: false, ...classifyGa4HttpError(res.status, raw) };
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
 * GA4 aktif kullanıcılar — tüm property'ler veya tek site.
 * Token: service role ile ad_accounts (RLS bypass).
 */
export async function loadGa4TrafficSourceStats(
  startDate: string,
  endDate: string,
  siteFilter: string | null = null,
): Promise<Ga4TrafficSourceStats> {
  const platforms = emptyPlatforms();
  const propertyIds = propertyIdsForSiteFilter(siteFilter);

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

  const token = await getGoogleAccessToken();
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
  let apiDisabled = false;
  let enableApiUrl: string | undefined;

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
      if (result.apiDisabled) {
        apiDisabled = true;
        enableApiUrl = result.enableApiUrl;
      }
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
      error: apiDisabled
        ? errors[0]!.replace(/^\d+:\s*/, "")
        : needsReconnect
          ? "Google token’da Analytics yetkisi yok. Reklam → Hesap bağla’dan Google’ı yeniden bağlayın."
          : errors[0],
      needsReconnect,
      apiDisabled,
      enableApiUrl,
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
