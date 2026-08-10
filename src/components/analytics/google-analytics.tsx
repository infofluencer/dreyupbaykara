"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { CookieConsentPreferences } from "@/lib/cookie-consent";
import { useCookieConsent } from "./use-cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/** Tek gtag.js — GA4 (analitik) + Google Ads (pazarlama). */
export function GoogleAnalytics({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const consent = useCookieConsent(initialConsent);
  const hasTrackedInitialPage = useRef(false);
  const configuredIds = useRef(new Set<string>());

  const analyticsOk = Boolean(GA_ID && consent?.analytics);
  const adsOk = Boolean(ADS_ID && consent?.marketing);
  const loaderId = GA_ID || ADS_ID;
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin || typeof window.gtag !== "function") return;

    const ensure = (id: string | undefined, ok: boolean) => {
      if (!id || !ok || configuredIds.current.has(id)) return;
      window.gtag("config", id);
      configuredIds.current.add(id);
    };

    ensure(GA_ID, analyticsOk);
    ensure(ADS_ID, adsOk);
  }, [analyticsOk, adsOk, isAdmin]);

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

  if (isAdmin || !loaderId || (!analyticsOk && !adsOk)) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
      strategy="afterInteractive"
    />
  );
}
