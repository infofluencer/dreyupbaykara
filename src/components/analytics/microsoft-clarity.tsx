"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import type { CookieConsentPreferences } from "@/lib/cookie-consent";
import { useCookieConsent } from "./use-cookie-consent";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export function MicrosoftClarity({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const consent = useCookieConsent(initialConsent);

  if (!CLARITY_ID || !consent?.analytics || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");`}
    </Script>
  );
}
