import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Poppins } from "next/font/google";
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
  metadataBase: new URL("https://www.eyupbaykara.com"),
  title: "Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı",
  description:
    "Full endoskopik tam kapalı bel fıtığı ameliyatı ve minimal invaziv beyin & omurga cerrahisi. Op. Dr. Eyüp Baykara — Silivri, İstanbul.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { Footer } from "@/components/Footer";
import { SectionPagination } from "@/components/SectionPagination";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${instrumentSans.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-text">
        <SectionPagination />
        {children}
        <Footer />
      </body>
    </html>
  );
}
