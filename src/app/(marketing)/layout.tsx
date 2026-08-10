import { Suspense } from "react";
import { AttributionCapture } from "@/components/AttributionCapture";
import { Footer } from "@/components/Footer";
import { GoogleGtagLoader, GoogleTagManager } from "@/components/analytics";
import { SectionReveal } from "@/components/SectionReveal";
import { SectionPagination } from "@/components/SectionPagination";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GoogleTagManager />
      <GoogleGtagLoader />
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <SectionReveal />
      <SectionPagination />
      {children}
      <Footer />
    </>
  );
}
