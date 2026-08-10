"use client";

import {
  COOKIE_CONSENT_NAME,
  parseCookieConsent,
  readBrowserCookie,
} from "@/lib/cookie-consent";

export function hasMarketingConsent(): boolean {
  return Boolean(
    parseCookieConsent(readBrowserCookie(COOKIE_CONSENT_NAME))?.marketing,
  );
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  if (typeof window.fbq !== "function") return;
  if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}
