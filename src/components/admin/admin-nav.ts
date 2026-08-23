import {
  Bot,
  CalendarDays,
  FileText,
  Gauge,
  Inbox,
  ListTodo,
  Megaphone,
  MessageSquareShare,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ADMIN_NAV: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/admin", label: "Özet", icon: Gauge },
  { href: "/admin/messages", label: "WhatsApp", icon: Inbox },
  { href: "/admin/pipeline", label: "Durum Panosu", icon: ListTodo },
  { href: "/admin/leads", label: "Takvim", icon: CalendarDays },
  { href: "/admin/patients", label: "Hastalar", icon: UserRound },
  { href: "/admin/sources", label: "Kaynaklar", icon: Megaphone },
  { href: "/admin/automations", label: "Otomasyon", icon: MessageSquareShare },
  { href: "/admin/bot", label: "Bot", icon: Bot },
  { href: "/admin/content", label: "İçerik", icon: FileText },
  { href: "/admin/team", label: "Ekip", icon: Users },
];

export function isAdminNavActive(pathname: string, href: string) {
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
  if (href === "/admin/messages") {
    return (
      pathname.startsWith("/admin/messages") ||
      pathname.startsWith("/admin/inbox")
    );
  }
  return pathname.startsWith(href);
}
