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

/** Meta: mesaj teslim edilemedi (numara WhatsApp'ta değil, eski sürüm vb.). */
export const UNDELIVERABLE_CODE = 131026;

/** Meta teslim / gönderim hatasının panelde okunacak Türkçe karşılığı. */
export function deliveryErrorLabel(
  code: number | null,
  raw: string | null,
): string {
  switch (code) {
    case UNDELIVERABLE_CODE:
      return "Bu numaraya WhatsApp mesajı ulaşmıyor. Numara WhatsApp'ta olmayabilir ya da hasta başka bir numara kullanıyor olabilir.";
    case 130403:
      return "Bu numara telefondaki WhatsApp Business uygulamasından engellenmiş.";
    case 131049:
      return "Meta bu kişiye pazarlama şablonu limitini uyguladı; en az 24 saat sonra tekrar deneyin.";
    case 131042:
      return "Meta ödeme / uygunluk sorunu; WhatsApp Business hesabını kontrol edin.";
    case 131047:
      return "24 saatlik serbest mesaj penceresi kapalı; şablon mesaj gerekir.";
    case 130429:
    case 131056:
      return "WhatsApp gönderim limiti aşıldı; kısa süre sonra tekrar deneyin.";
    default:
      return raw || "Mesaj iletilemedi.";
  }
}

export type MessageErrorInfo = {
  error: string | null;
  error_code: number | null;
};

/**
 * Mesaj satırından hata bilgisi. Sunucu sorgusu alias'larla (delivery_error,
 * delivery_code, error_message) gelir; realtime payload'ında ise ham
 * raw_payload bulunur. İkisini de okur.
 */
export function messageErrorFromRow(
  row: Record<string, unknown>,
): MessageErrorInfo {
  const payload = (
    row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {}
  ) as Record<string, unknown>;
  const nested =
    payload.error && typeof payload.error === "object"
      ? (payload.error as Record<string, unknown>)
      : null;

  const codeRaw =
    row.delivery_code ?? payload.delivery_code ?? nested?.code ?? null;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string" && /^\d+$/.test(codeRaw)
        ? Number(codeRaw)
        : null;

  const textRaw =
    row.delivery_error ??
    payload.delivery_error ??
    row.error_message ??
    nested?.message ??
    (typeof payload.error === "string" ? payload.error : null);

  return {
    error: typeof textRaw === "string" && textRaw ? textRaw : null,
    error_code: code,
  };
}

/**
 * Son giden mesaj "iletilemez" (131026) ile düştüyse ve hasta o tarihten sonra
 * yazmadıysa, konuşma başlığında uyarı göstermek için tarihi döner.
 */
export function undeliverableNotice(
  messages: Array<{
    direction: string;
    status: string;
    created_at: string;
    error_code: number | null;
  }>,
): { at: string } | null {
  let lastFailedAt: string | null = null;
  for (const message of messages) {
    if (
      message.direction === "outbound" &&
      message.status === "failed" &&
      message.error_code === UNDELIVERABLE_CODE
    ) {
      lastFailedAt = message.created_at;
    } else if (
      message.direction === "inbound" &&
      lastFailedAt &&
      message.created_at > lastFailedAt
    ) {
      lastFailedAt = null;
    }
  }
  return lastFailedAt ? { at: lastFailedAt } : null;
}
