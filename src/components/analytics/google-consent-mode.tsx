import Script from "next/script";
import {
  toGoogleConsentState,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

export function GoogleConsentModeScript({
  consent,
}: {
  consent: CookieConsentPreferences | null;
}) {
  const state = toGoogleConsentState(consent);

  return (
    <Script id="google-consent-default" strategy="beforeInteractive">
      {`(function(){
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('consent', 'default', ${JSON.stringify(state)});
      })();`}
    </Script>
  );
}
