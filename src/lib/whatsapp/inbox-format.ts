const AVATAR_COLORS = [
  "#0b6b45",
  "#123524",
  "#1b4332",
  "#2d6a4f",
  "#40916c",
  "#52796f",
];

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

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function listTimeLabel(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays === 0) {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Dün";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

export function threadDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
