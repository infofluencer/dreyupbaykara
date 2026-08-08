import { appointmentEndIso } from "@/lib/crm/schedule";

export const DURATION_OPTIONS = [
  { minutes: 30, label: "30 dk · kısa muayene / kontrol" },
  { minutes: 45, label: "45 dk" },
  { minutes: 60, label: "1 saat · muayene" },
  { minutes: 90, label: "1,5 saat" },
  { minutes: 120, label: "2 saat" },
  { minutes: 180, label: "3 saat · ameliyat" },
  { minutes: 240, label: "4 saat · ameliyat" },
  { minutes: 300, label: "5 saat" },
  { minutes: 360, label: "6 saat · uzun ameliyat" },
  { minutes: 480, label: "8 saat · tam gün" },
] as const;

export function defaultDurationForType(type?: string | null): number {
  if (type === "procedure") return 180;
  if (type === "control" || type === "online") return 30;
  if (type === "consultation") return 60;
  return 60;
}

export function durationMinutes(
  startsAt: string,
  endsAt?: string | null,
): number {
  const start = new Date(startsAt).getTime();
  const end = new Date(appointmentEndIso(startsAt, endsAt)).getTime();
  return Math.max(15, Math.round((end - start) / 60_000));
}

export function formatDurationTr(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return `${hours} saat`;
  return `${hours} saat ${rest} dk`;
}

export function titleFromType(type?: string | null): string {
  if (type === "procedure") return "Ameliyat randevusu";
  if (type === "control") return "Kontrol randevusu";
  if (type === "online") return "Online görüşme";
  return "Muayene randevusu";
}
