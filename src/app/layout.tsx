import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Instrument_Sans, Poppins } from "next/font/google";
import {
  GoogleAnalytics,
  GoogleConsentModeScript,
  GoogleTagManager,
  MetaPixel,
  MicrosoftClarity,
  TikTokPixel,
} from "@/components/analytics";
import { ClientOnly } from "@/components/layouts/client-only";
import { CookieConsentBanner } from "@/components/layouts/cookie-consent-banner";
import {
  COOKIE_CONSENT_NAME,
  parseCookieConsent,
} from "@/lib/cookie-consent";
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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      "https://endoskopikbelameliyati.com",
  ),
  title: "Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı",
  description:
    "Full endoskopik tam kapalı bel fıtığı ameliyatı ve minimal invaziv beyin & omurga cerrahisi. Op. Dr. Eyüp Baykara — Silivri, İstanbul.",
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialConsent = parseCookieConsent(
    cookieStore.get(COOKIE_CONSENT_NAME)?.value,
  );

  return (
    <html
      lang="tr"
      className={`${instrumentSans.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-bg text-text" suppressHydrationWarning>
        <GoogleConsentModeScript consent={initialConsent} />
        <GoogleTagManager />
        <GoogleAnalytics initialConsent={initialConsent} />
        <MicrosoftClarity initialConsent={initialConsent} />
        <MetaPixel initialConsent={initialConsent} />
        <TikTokPixel initialConsent={initialConsent} />
        {children}
        <ClientOnly>
          <CookieConsentBanner initialConsent={initialConsent} />
        </ClientOnly>
      </body>
    </html>
  );
}
