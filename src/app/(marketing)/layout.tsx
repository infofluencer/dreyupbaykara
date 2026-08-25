import { Suspense } from "react";
import { AttributionCapture } from "@/components/AttributionCapture";
import { Footer } from "@/components/Footer";
import {
  GoogleAnalytics,
  GoogleConsentModeScript,
  GoogleGtagLoader,
  GoogleTagManager,
  MetaPixel,
  MicrosoftClarity,
  TikTokPixel,
} from "@/components/analytics";
import { ClientOnly } from "@/components/layouts/client-only";
import { CookieConsentBanner } from "@/components/layouts/cookie-consent-banner";
import { SectionReveal } from "@/components/SectionReveal";
import { SectionPagination } from "@/components/SectionPagination";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <GoogleConsentModeScript />
      <GoogleTagManager />
      <GoogleGtagLoader />
      <GoogleAnalytics initialConsent={null} />
      <MicrosoftClarity initialConsent={null} />
      <MetaPixel initialConsent={null} />
      <TikTokPixel initialConsent={null} />
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <SectionReveal />
      <SectionPagination />
      {children}
      <Footer />
      <ClientOnly>
        <CookieConsentBanner initialConsent={null} />
      </ClientOnly>
    </>
  );
}
