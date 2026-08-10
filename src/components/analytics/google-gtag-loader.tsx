import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * gtag.js her zaman HTML'de olur (Google kurulum testi bunu arar).
 * Çerez yazımı Consent Mode default denied + banner update ile kontrol edilir.
 */
export function GoogleGtagLoader() {
  const loaderId = GA_ID || ADS_ID;
  if (!loaderId) return null;

  const configs = [
    GA_ID ? `gtag('config', '${GA_ID}');` : "",
    ADS_ID ? `gtag('config', '${ADS_ID}');` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
        strategy="afterInteractive"
      />
      <Script id="google-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          ${configs}
        `}
      </Script>
    </>
  );
}
