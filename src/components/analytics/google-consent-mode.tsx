import Script from "next/script";
import { COOKIE_CONSENT_NAME } from "@/lib/cookie-consent";

/** Default denied; cookie varsa aynı tick'te update. cookies() layout'u dinamik yapmasın. */
export function GoogleConsentModeScript() {
  return (
    <Script id="google-consent-default" strategy="beforeInteractive">
      {`(function(){
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        var denied = {
          analytics_storage:'denied',
          ad_storage:'denied',
          ad_user_data:'denied',
          ad_personalization:'denied',
          functionality_storage:'denied',
          personalization_storage:'denied',
          security_storage:'granted',
          wait_for_update:500
        };
        gtag('consent','default',denied);
        try {
          var prefix = '${COOKIE_CONSENT_NAME}=';
          var row = document.cookie.split('; ').find(function(r){ return r.indexOf(prefix) === 0; });
          if (!row) return;
          var c = JSON.parse(decodeURIComponent(row.slice(prefix.length)));
          if (!c) return;
          gtag('consent','update',{
            analytics_storage: c.analytics ? 'granted' : 'denied',
            ad_storage: c.marketing ? 'granted' : 'denied',
            ad_user_data: c.marketing ? 'granted' : 'denied',
            ad_personalization: c.marketing ? 'granted' : 'denied',
            functionality_storage: c.functional ? 'granted' : 'denied',
            personalization_storage: c.functional ? 'granted' : 'denied',
            security_storage:'granted'
          });
        } catch (e) {}
      })();`}
    </Script>
  );
}
