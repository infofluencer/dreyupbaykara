import "server-only";

import { createHash } from "node:crypto";
import { after } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_CONSENT_NAME,
  parseCookieConsent,
} from "@/lib/cookie-consent";
import { OPENAI_ADS_PIXEL_ID } from "@/lib/marketing/openai-ads/pixel";

const API_KEY = () => process.env.OPENAI_CONVERSIONS_API_KEY?.trim() || "";
const EVENTS_URL = "https://bzr.openai.com/v1/events";
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://endoskopikbelameliyati.com";

type OpenAiUser = {
  obref?: string;
  first_names_sha256?: string[];
  last_names_sha256?: string[];
  countries?: string[];
  ip_address?: string;
  user_agent?: string;
};

export type OpenAiConversionType =
  | "page_viewed"
  | "lead_created"
  | "contents_viewed";

type OpenAiConversionEvent =
  | {
      id: string;
      type: "page_viewed" | "contents_viewed";
      timestamp_ms: number;
      oppref?: string;
      source_url: string;
      action_source: "web";
      user?: OpenAiUser;
      data: { type: "contents" };
    }
  | {
      id: string;
      type: "lead_created";
      timestamp_ms: number;
      oppref?: string;
      source_url: string;
      action_source: "web";
      user?: OpenAiUser;
      data: { type: "customer_action" };
    }
  | {
      id: string;
      type: "custom";
      custom_event_name: string;
      timestamp_ms: number;
      oppref?: string;
      source_url: string;
      action_source: "web";
      user?: OpenAiUser;
      data: { type: "custom" };
    };

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeNamePart(value: string): string {
  return value.toLowerCase().replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "");
}

export function hashPersonName(fullName: string | null | undefined): {
  first_names_sha256?: string[];
  last_names_sha256?: string[];
} {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .map(normalizeNamePart)
    .filter(Boolean);
  if (!parts.length) return {};

  const first = parts[0]!;
  const last = parts.slice(1).join("");
  return {
    first_names_sha256: [sha256Hex(first)],
    ...(last ? { last_names_sha256: [sha256Hex(last)] } : {}),
  };
}

function firstHeader(request: NextRequest, name: string): string | null {
  const raw = request.headers.get(name);
  if (!raw) return null;
  const value = raw.split(",")[0]?.trim();
  return value || null;
}

function cookieValue(request: NextRequest, name: string): string | null {
  const value = request.cookies.get(name)?.value?.trim();
  return value || null;
}

function absoluteSourceUrl(
  sourceUrl: string | null | undefined,
  pagePath?: string | null,
) {
  const raw = sourceUrl?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      /* fall through */
    }
  }
  const path = pagePath?.trim() || "/";
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildUser(
  request: NextRequest,
  fullName?: string | null,
): OpenAiUser {
  const obref = cookieValue(request, "__obref");
  const ip =
    firstHeader(request, "x-forwarded-for") ||
    firstHeader(request, "x-real-ip");
  const userAgent = firstHeader(request, "user-agent");
  const nameHashes = hashPersonName(fullName);

  return {
    ...(obref ? { obref } : {}),
    ...nameHashes,
    countries: ["TR"],
    ...(ip ? { ip_address: ip } : {}),
    ...(userAgent ? { user_agent: userAgent } : {}),
  };
}

async function postConversionEvent(event: OpenAiConversionEvent): Promise<void> {
  const apiKey = API_KEY();
  if (!apiKey) return;

  try {
    const response = await fetch(
      `${EVENTS_URL}?pid=${encodeURIComponent(OPENAI_ADS_PIXEL_ID)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validate_only: false,
          events: [event],
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        "[openai-ads] conversions API failed:",
        response.status,
        body.slice(0, 400),
      );
    }
  } catch (error) {
    console.error("[openai-ads] conversions API error:", error);
  }
}

function resolveSourceAndOpp(
  options: {
    request: NextRequest;
    sourceUrl?: string | null;
    pagePath?: string | null;
    oppref?: string | null;
    preferPageUrl?: boolean;
  },
): { sourceUrl: string; oppref?: string } | null {
  const consent = parseCookieConsent(
    options.request.cookies.get(COOKIE_CONSENT_NAME)?.value,
  );
  if (!consent?.marketing) return null;

  const oppref =
    options.oppref?.trim() || cookieValue(options.request, "__oppref");
  const referer = firstHeader(options.request, "referer");
  const pageUrl = absoluteSourceUrl(null, options.pagePath);
  const sourceUrl = options.preferPageUrl
    ? absoluteSourceUrl(options.sourceUrl, options.pagePath) || pageUrl
    : absoluteSourceUrl(options.sourceUrl || referer, options.pagePath);

  return {
    sourceUrl,
    ...(oppref ? { oppref } : {}),
  };
}

export function scheduleOpenAiConversion(options: {
  request: NextRequest;
  eventId: string;
  type: OpenAiConversionType;
  sourceUrl?: string | null;
  pagePath?: string | null;
  fullName?: string | null;
  oppref?: string | null;
}): void {
  if (!API_KEY()) return;

  const resolved = resolveSourceAndOpp({
    ...options,
    preferPageUrl:
      options.type === "page_viewed" || options.type === "contents_viewed",
  });
  if (!resolved) return;

  const base = {
    id: options.eventId,
    timestamp_ms: Date.now(),
    ...(resolved.oppref ? { oppref: resolved.oppref } : {}),
    source_url: resolved.sourceUrl,
    action_source: "web" as const,
    user: buildUser(options.request, options.fullName),
  };

  const event: OpenAiConversionEvent =
    options.type === "lead_created"
      ? { ...base, type: "lead_created", data: { type: "customer_action" } }
      : {
          ...base,
          type: options.type,
          data: { type: "contents" },
        };

  after(() => {
    void postConversionEvent(event);
  });
}

/** WhatsApp / form → custom wpform CAPI. */
export function scheduleOpenAiWpformConversion(options: {
  request: NextRequest;
  eventId: string;
  pagePath?: string | null;
  fullName?: string | null;
  oppref?: string | null;
  sourceUrl?: string | null;
}): void {
  if (!API_KEY()) return;

  const resolved = resolveSourceAndOpp(options);
  if (!resolved) return;

  const event: OpenAiConversionEvent = {
    id: options.eventId,
    type: "custom",
    custom_event_name: "wpform",
    timestamp_ms: Date.now(),
    ...(resolved.oppref ? { oppref: resolved.oppref } : {}),
    source_url: resolved.sourceUrl,
    action_source: "web",
    user: buildUser(options.request, options.fullName),
    data: { type: "custom" },
  };

  after(() => {
    void postConversionEvent(event);
  });
}

/** WhatsApp / form dönüşümünü yanıt gittikten sonra CAPI’ye yollar. */
export function scheduleOpenAiLeadConversion(options: {
  request: NextRequest;
  eventId: string;
  pagePath?: string | null;
  fullName?: string | null;
  oppref?: string | null;
}): void {
  scheduleOpenAiConversion({
    ...options,
    type: "lead_created",
  });
}

/** İletişim sayfası görüntülenmesi — contents_viewed CAPI. */
export function scheduleOpenAiContentsViewedConversion(options: {
  request: NextRequest;
  eventId: string;
  pagePath?: string | null;
  sourceUrl?: string | null;
  oppref?: string | null;
}): void {
  scheduleOpenAiConversion({
    ...options,
    type: "contents_viewed",
  });
}
