import type { Viewport } from "next";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#123524",
};

export default function AdminAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-shell min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
      <AdminSidebar />
      <AdminMobileNav />
      <main className="mx-auto max-w-[92rem] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
