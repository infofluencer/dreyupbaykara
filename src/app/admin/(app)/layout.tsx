import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen pl-[4.75rem] lg:pl-64">
      <AdminSidebar />
      <main className="mx-auto max-w-[92rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
