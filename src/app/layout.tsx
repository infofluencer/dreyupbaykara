import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Poppins } from "next/font/google";
import {
  GoogleAnalytics,
  GoogleConsentModeScript,
  MetaPixel,
  MicrosoftClarity,
  TikTokPixel,
} from "@/components/analytics";
import { ClientOnly } from "@/components/layouts/client-only";
import { CookieConsentBanner } from "@/components/layouts/cookie-consent-banner";
import { PAGE_SEO } from "@/data/seo";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://endoskopikbelameliyati.com",
  ),
  title: PAGE_SEO.home.title,
  description: PAGE_SEO.home.description,
  icons: {
    icon: [{ url: "/hero/endospinelogo.ico", type: "image/x-icon" }],
    shortcut: "/hero/endospinelogo.ico",
    apple: "/hero/endospinelogo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${instrumentSans.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Bağlantı kurulumu ilk isteği beklemesin: TLS el sıkışması peşin yapılır. */}
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://endospineistanbul.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
        ) : null}
      </head>
      <body className="min-h-full bg-bg text-text" suppressHydrationWarning>
        <GoogleConsentModeScript />
        <GoogleAnalytics initialConsent={null} />
        <MicrosoftClarity initialConsent={null} />
        <MetaPixel initialConsent={null} />
        <TikTokPixel initialConsent={null} />
        {children}
        <ClientOnly>
          <CookieConsentBanner initialConsent={null} />
        </ClientOnly>
      </body>
    </html>
  );
}
