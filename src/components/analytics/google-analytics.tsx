"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { CookieConsentPreferences } from "@/lib/cookie-consent";
import { useCookieConsent } from "./use-cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** SPA route page_view — ilk hit gtag config’te gider. */
export function GoogleAnalytics({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const consent = useCookieConsent(initialConsent);
  const hasTrackedInitialPage = useRef(false);
  const analyticsOk = Boolean(GA_ID && consent?.analytics);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin || !analyticsOk) return;
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true;
      return;
    }
    window.gtag?.("event", "page_view", {
      page_path: window.location.pathname + window.location.search,
    });
  }, [pathname, analyticsOk, isAdmin]);

  return null;
}
