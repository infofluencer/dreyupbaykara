import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Poppins } from "next/font/google";
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
  applicationName: "Op. Dr. Eyüp Baykara",
  authors: [{ name: "Op. Dr. Eyüp Baykara", url: "https://endoskopikbelameliyati.com" }],
  creator: "Op. Dr. Eyüp Baykara",
  publisher: "Op. Dr. Eyüp Baykara",
  category: "health",
  keywords: [
    "endoskopik bel ameliyatı",
    "full endoskopik bel fıtığı ameliyatı",
    "kapalı bel fıtığı ameliyatı",
    "bel fıtığı ameliyatı",
    "boyun fıtığı ameliyatı",
    "kanal darlığı ameliyatı",
    "Op. Dr. Eyüp Baykara",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://endoskopikbelameliyati.com",
    siteName: "Op. Dr. Eyüp Baykara | Endoskopik Bel Ameliyatı",
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    images: [
      {
        url: "/hero/hero_dr.webp",
        width: 1200,
        height: 630,
        alt: "Op. Dr. Eyüp Baykara — Full endoskopik omurga cerrahisi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    images: ["/hero/hero_dr.webp"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [{ url: "/hero/endospinelogo.ico", type: "image/x-icon" }],
    shortcut: "/hero/endospinelogo.ico",
    apple: "/hero/endospinelogo.png",
  },
  alternates: {
    canonical: "/",
    languages: {
      tr: "https://endoskopikbelameliyati.com",
      "tr-TR": "https://endoskopikbelameliyati.com",
      "x-default": "https://endoskopikbelameliyati.com",
    },
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
        <link rel="dns-prefetch" href="https://endospineistanbul.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
        ) : null}
      </head>
      <body className="min-h-full bg-bg text-text" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
