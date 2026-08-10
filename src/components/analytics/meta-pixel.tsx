"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { CookieConsentPreferences } from "@/lib/cookie-consent";
import { useCookieConsent } from "./use-cookie-consent";
import { trackMetaEvent } from "./track-meta";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const consent = useCookieConsent(initialConsent);
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    if (!PIXEL_ID || !consent?.marketing || pathname.startsWith("/admin")) {
      return;
    }

    const isInitial = !hasTrackedInitialPage.current;
    hasTrackedInitialPage.current = true;

    if (!isInitial) {
      window.fbq?.("track", "PageView");
    }

    if (pathname.startsWith("/tedaviler/")) {
      trackMetaEvent("ViewContent", {
        content_name: pathname,
        content_category: "treatment",
      });
    }
  }, [pathname, consent?.marketing]);

  useEffect(() => {
    if (!PIXEL_ID || !consent?.marketing || pathname.startsWith("/admin")) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        trackMetaEvent("Contact", { content_name: "phone" });
      } else if (href.startsWith("mailto:")) {
        trackMetaEvent("Contact", { content_name: "email" });
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [consent?.marketing, pathname]);

  if (!PIXEL_ID || !consent?.marketing || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
    </Script>
  );
}
