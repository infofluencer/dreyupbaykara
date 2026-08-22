import {
  addDaysYmd,
  formatTimeTr,
  istanbulYmd,
} from "@/lib/date/tr";

const AVATAR_COLORS = [
  "#0b6b45",
  "#123524",
  "#1b4332",
  "#2d6a4f",
  "#40916c",
  "#52796f",
];

const TIME_ZONE = "Europe/Istanbul";

export function avatarColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#0b6b45";
}

export function avatarInitial(name: string | null, phone: string | null): string {
  const source = (name || phone || "?").trim();
  const letter = source.charAt(0).toLocaleUpperCase("tr-TR");
  return letter || "?";
}

function istanbulDayDiff(iso: string): number {
  const today = istanbulYmd();
  const day = istanbulYmd(iso);
  if (day === today) return 0;
  if (day === addDaysYmd(today, -1)) return 1;
  const todayMs = new Date(`${today}T12:00:00+03:00`).getTime();
  const dayMs = new Date(`${day}T12:00:00+03:00`).getTime();
  return Math.round((todayMs - dayMs) / 86_400_000);
}

export function listTimeLabel(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = istanbulDayDiff(iso);
  if (diffDays === 0) return formatTimeTr(date);
  if (diffDays === 1) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function threadDayLabel(iso: string): string {
  const date = new Date(iso);
  const diffDays = istanbulDayDiff(iso);
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function dayKey(iso: string): string {
  return istanbulYmd(iso);
}

export function clockLabel(iso: string): string {
  return formatTimeTr(iso);
}

export function isWithin24hFromMessages(
  messages: Array<{ direction: string; created_at: string }>,
): boolean {
  const lastInbound = [...messages]
    .reverse()
    .find((message) => message.direction === "inbound");
  if (!lastInbound) return false;
  return Date.now() - new Date(lastInbound.created_at).getTime() < 24 * 60 * 60 * 1000;
}
