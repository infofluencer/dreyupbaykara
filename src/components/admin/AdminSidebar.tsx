"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  FileText,
  Gauge,
  Inbox,
  Megaphone,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminSignOut } from "@/components/admin/AdminSignOut";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Özet", icon: Gauge },
  { href: "/admin/leads", label: "Takvim", icon: CalendarDays },
  { href: "/admin/patients", label: "Hastalar", icon: UserRound },
  { href: "/admin/sources", label: "Kaynaklar", icon: Megaphone },
  { href: "/admin/inbox", label: "WhatsApp", icon: Inbox },
  { href: "/admin/bot", label: "Bot", icon: Bot },
  { href: "/admin/content", label: "İçerik", icon: FileText },
  { href: "/admin/team", label: "Ekip", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#123524] text-white shadow-[12px_0_36px_rgba(18,53,36,0.12)] lg:flex">
      <Link
        href="/admin"
        className="flex h-24 items-center justify-center border-b border-white/10 px-5"
        aria-label="Yönetim paneli ana sayfası"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/endospinelogo.png"
          alt="Endoskopik Bel Ameliyatı"
          width={942}
          height={382}
          className="h-14 w-auto max-w-full object-contain"
          decoding="async"
        />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : item.href === "/admin/leads"
                ? pathname.startsWith("/admin/leads") ||
                  pathname.startsWith("/admin/calendar")
                : item.href === "/admin/patients"
                  ? pathname.startsWith("/admin/patients")
                  : item.href === "/admin/content"
                    ? pathname.startsWith("/admin/content") ||
                      pathname.startsWith("/admin/media")
                    : pathname.startsWith(item.href);
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

