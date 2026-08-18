"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  Ellipsis,
  FileText,
  Gauge,
  Inbox,
  ListTodo,
  Megaphone,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminSignOut } from "@/components/admin/AdminSignOut";

const PRIMARY: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Özet", icon: Gauge },
  { href: "/admin/leads", label: "Takvim", icon: CalendarDays },
  { href: "/admin/patients", label: "Hastalar", icon: UserRound },
  { href: "/admin/messages", label: "WhatsApp", icon: Inbox },
];

const MORE: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin/pipeline", label: "Talepler", icon: ListTodo },
  { href: "/admin/sources", label: "Kaynaklar", icon: Megaphone },
  { href: "/admin/bot", label: "Bot", icon: Bot },
  { href: "/admin/content", label: "İçerik", icon: FileText },
  { href: "/admin/team", label: "Ekip", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/leads") {
    return (
      pathname.startsWith("/admin/leads") ||
      pathname.startsWith("/admin/calendar")
    );
  }
  if (href === "/admin/patients") return pathname.startsWith("/admin/patients");
  if (href === "/admin/content") {
    return (
      pathname.startsWith("/admin/content") ||
      pathname.startsWith("/admin/media")
    );
  }
  if (href === "/admin/messages" || href === "/admin/inbox") {
    return (
      pathname.startsWith("/admin/messages") ||
      pathname.startsWith("/admin/inbox")
    );
  }
  return pathname.startsWith(href);
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#123524]/45"
            aria-label="Menüyü kapat"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#123524]/15" />
            <p className="px-1 text-sm font-semibold text-[#123524]">Daha fazla</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MORE.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                      active
                        ? "bg-[#e7f5ed] text-[#0b6b45]"
                        : "bg-[#f4f6f5] text-[#123524]"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3">
              <AdminSignOut />
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#123524] pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Mobil menü"
      >
        <div className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold ${
                  active ? "text-white" : "text-white/55"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-[#73df68]" : ""}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold ${
              moreOpen || moreActive ? "text-white" : "text-white/55"
            }`}
            aria-expanded={moreOpen}
          >
            <Ellipsis
              className={`h-5 w-5 ${moreOpen || moreActive ? "text-[#73df68]" : ""}`}
              aria-hidden
            />
            Daha
          </button>
        </div>
      </nav>
    </>
  );
}
