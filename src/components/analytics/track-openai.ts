"use client";

import { hasMarketingConsent } from "./track-meta";
import { OPENAI_ADS_PIXEL_ID } from "@/lib/marketing/openai-ads/pixel";

export { OPENAI_ADS_PIXEL_ID };

export type OpenAiMeasureEvent =
  | "page_viewed"
  | "contents_viewed"
  | "lead_created";

export function createOpenAiEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function trackOpenAiEvent(
  event: OpenAiMeasureEvent,
  data: Record<string, unknown>,
  options?: { event_id?: string },
): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  if (typeof window.oaiq !== "function") return;
  if (options) window.oaiq("measure", event, data, options);
  else window.oaiq("measure", event, data);
}
