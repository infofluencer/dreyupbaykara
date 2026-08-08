import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Op. Dr. Eyüp Baykara",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#123524]">{children}</div>
  );
}
