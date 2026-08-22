"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ADMIN_NAV, isAdminNavActive } from "@/components/admin/admin-nav";
import { AdminSignOut } from "@/components/admin/AdminSignOut";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-[#123524] px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
          aria-label="Menüyü aç"
          aria-expanded={open}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <Link
          href="/admin"
          className="min-w-0 flex-1 truncate text-sm font-semibold text-white"
        >
          Yönetim paneli
        </Link>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[#123524]/50"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-[#123524] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#f4f6f5] px-2 py-2">
                <Image
                  src="/hero/endospinelogo.png"
                  alt="Endoskopik Bel Ameliyatı"
                  width={942}
                  height={382}
                  sizes="160px"
                  className="h-9 w-auto max-w-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10"
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {ADMIN_NAV.map((item) => {
                const active = isAdminNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-12 items-center rounded-xl px-3 text-sm font-medium transition ${
                      active
                        ? "bg-white text-[#123524] shadow-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        active ? "text-[#0b6b45]" : "text-[#73df68]"
                      }`}
                      aria-hidden
                    />
                    <span className="ml-3">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-3">
              <AdminSignOut tone="dark" />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
