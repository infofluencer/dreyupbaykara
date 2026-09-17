"use client";

import { readBrowserCookie } from "@/lib/cookie-consent";
import { hasMarketingConsent } from "./track-meta";
import { OPENAI_ADS_PIXEL_ID } from "@/lib/marketing/openai-ads/pixel";

export { OPENAI_ADS_PIXEL_ID };

export type OpenAiMeasureEvent =
  | "page_viewed"
  | "contents_viewed"
  | "lead_created"
  | "custom";

export type OpenAiMeasureOptions = {
  event_id?: string;
  custom_event_name?: string;
};

export function createOpenAiEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function trackOpenAiEvent(
  event: OpenAiMeasureEvent,
  data: Record<string, unknown>,
  options?: OpenAiMeasureOptions,
): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  if (typeof window.oaiq !== "function") return;
  if (options) window.oaiq("measure", event, data, options);
  else window.oaiq("measure", event, data);
}

function readOppRef(): string | null {
  const fromCookie = readBrowserCookie("__oppref")?.trim();
  if (fromCookie) return fromCookie;
  try {
    return new URLSearchParams(window.location.search).get("oppref")?.trim() || null;
  } catch {
    return null;
  }
}

function sendOpenAiServerEvent(payload: {
  type: "page_viewed" | "contents_viewed";
  event_id: string;
  source_url: string;
  oppref: string | null;
}): void {
  void fetch("/api/track/openai-event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* pixel already sent; CAPI is best-effort */
  });
}

/** Pixel + Conversions API, aynı event_id ile. */
export function trackOpenAiPageViewed(): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;

  const eventId = createOpenAiEventId();
  trackOpenAiEvent("page_viewed", { type: "contents" }, { event_id: eventId });
  sendOpenAiServerEvent({
    type: "page_viewed",
    event_id: eventId,
    source_url: window.location.href,
    oppref: readOppRef(),
  });
}

/** İletişim sayfası — contents_viewed pixel + CAPI. */
export function trackOpenAiContentsViewed(): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;

  const eventId = createOpenAiEventId();
  trackOpenAiEvent(
    "contents_viewed",
    { type: "contents" },
    { event_id: eventId },
  );
  sendOpenAiServerEvent({
    type: "contents_viewed",
    event_id: eventId,
    source_url: window.location.href,
    oppref: readOppRef(),
  });
}

/** WhatsApp / randevu formu — custom wpform (CAPI /r üzerinden). */
export function trackOpenAiWpform(eventId: string): void {
  trackOpenAiEvent(
    "custom",
    { type: "custom" },
    { custom_event_name: "wpform", event_id: eventId },
  );
}
