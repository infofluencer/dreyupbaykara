"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { CookieConsentPreferences } from "@/lib/cookie-consent";
import { useCookieConsent } from "./use-cookie-consent";
import { OPENAI_ADS_PIXEL_ID, trackOpenAiPageViewed } from "./track-openai";

export function OpenAiAdsPixel({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const consent = useCookieConsent(initialConsent);
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    if (
      !OPENAI_ADS_PIXEL_ID ||
      !consent?.marketing ||
      pathname.startsWith("/admin")
    ) {
      return;
    }
    if (!hasTrackedInitialPage.current) return;
    trackOpenAiPageViewed();
  }, [pathname, consent?.marketing]);

  if (
    !OPENAI_ADS_PIXEL_ID ||
    !consent?.marketing ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <Script
      id="openai-ads-pixel"
      strategy="afterInteractive"
      onReady={() => {
        hasTrackedInitialPage.current = true;
        trackOpenAiPageViewed();
      }}
    >
      {`(function (w, d, s, u) {
  if (w.oaiq) return;
  var q = function () { q.q.push(arguments); };
  q.q = [];
  w.oaiq = q;
  var js = d.createElement(s);
  js.async = true;
  js.src = u;
  var f = d.getElementsByTagName(s)[0];
  f.parentNode.insertBefore(js, f);
})(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
oaiq("init", { pixelId: "${OPENAI_ADS_PIXEL_ID}" });`}
    </Script>
  );
}
