"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isAdminNavActive } from "@/components/admin/admin-nav";
import { AdminSignOut } from "@/components/admin/AdminSignOut";
import { WhatsAppUnreadBadge } from "@/components/admin/WhatsAppUnreadBadge";

function SidebarBrand() {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed) {
    return (
      <div className="text-center leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#73df68]">
          Bel Ameliyatı
        </p>
        <p className="mt-1 text-sm font-semibold text-white">
          Op. Dr. Eyüp Baykara
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center rounded-2xl bg-[#f4f6f5] px-3 py-2.5 ring-1 ring-white/15">
      <Image
        src="/hero/endospinelogo.png"
        alt="Endoskopik Bel Ameliyatı"
        width={942}
        height={382}
        sizes="200px"
        priority
        className="h-12 w-auto max-w-full object-contain"
        onError={() => setLogoFailed(true)}
      />
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#123524] text-white shadow-[12px_0_36px_rgba(18,53,36,0.12)] lg:flex">
      <Link
        href="/admin"
        className="flex min-h-24 items-center justify-center border-b border-white/10 px-4 py-4"
        aria-label="Yönetim paneli ana sayfası"
      >
        <SidebarBrand />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition ${
                active
                  ? "bg-white text-[#123524] shadow-sm"
                  : "text-white/68 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon
                className={`h-[1.15rem] w-[1.15rem] shrink-0 ${
                  active
                    ? "text-[#0b6b45]"
                    : "text-[#73df68] group-hover:text-white"
                }`}
                aria-hidden
              />
              <span className="ml-3">{item.label}</span>
              {item.href === "/admin/messages" ? <WhatsAppUnreadBadge /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <AdminSignOut tone="dark" />
      </div>
    </aside>
  );
}
