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

export type OpenAiConversionType = "page_viewed" | "lead_created";

type OpenAiConversionEvent = {
  id: string;
  type: OpenAiConversionType;
  timestamp_ms: number;
  oppref?: string;
  source_url: string;
  action_source: "web";
  user?: OpenAiUser;
  data: { type: "contents" } | { type: "customer_action" };
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

function absoluteSourceUrl(sourceUrl: string | null | undefined, pagePath?: string | null) {
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

  const consent = parseCookieConsent(
    options.request.cookies.get(COOKIE_CONSENT_NAME)?.value,
  );
  if (!consent?.marketing) return;

  const oppref =
    options.oppref?.trim() || cookieValue(options.request, "__oppref");
  const obref = cookieValue(options.request, "__obref");
  const referer = firstHeader(options.request, "referer");
  const sourceUrl = absoluteSourceUrl(
    options.sourceUrl || referer,
    options.pagePath,
  );
  const ip =
    firstHeader(options.request, "x-forwarded-for") ||
    firstHeader(options.request, "x-real-ip");
  const userAgent = firstHeader(options.request, "user-agent");
  const nameHashes = hashPersonName(options.fullName);

  const user: OpenAiUser = {
    ...(obref ? { obref } : {}),
    ...nameHashes,
    countries: ["TR"],
    ...(ip ? { ip_address: ip } : {}),
    ...(userAgent ? { user_agent: userAgent } : {}),
  };

  const event: OpenAiConversionEvent = {
    id: options.eventId,
    type: options.type,
    timestamp_ms: Date.now(),
    ...(oppref ? { oppref } : {}),
    source_url: sourceUrl,
    action_source: "web",
    user,
    data:
      options.type === "page_viewed"
        ? { type: "contents" }
        : { type: "customer_action" },
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
