export type AutomationTimingMode = "before_start" | "calendar_day";

export type MessageRuleTiming = {
  offset_minutes: number;
  send_at_local_time: string | null;
  timing_mode?: AutomationTimingMode | null;
};

export type TemplateBodyParameter = {
  type: "text";
  text: string;
};

export type TemplateBodyComponent = {
  type: "body";
  parameters: TemplateBodyParameter[];
};

const TIME_ZONE = "Europe/Istanbul";

function istanbulYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function istanbulHm(d: Date): { hour: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    hour: Number(parts.hour ?? 0),
    minute: Number(parts.minute ?? 0),
  };
}

function formatTimeTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTimeTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseLocalTime(
  value: string | null,
): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Istanbul gününün UTC aralığı (cron aday sorgusu). */
export function istanbulDayBoundsUtc(now = new Date()): {
  from: Date;
  to: Date;
} {
  const ymd = istanbulYmd(now);
  // Europe/Istanbul yıl boyu UTC+3 (DST yok)
  const from = new Date(`${ymd}T00:00:00+03:00`);
  const to = new Date(`${ymd}T23:59:59.999+03:00`);
  return { from, to };
}

/** Randevu başlangıcından offset kadar önce (UTC ms). */
export function offsetDueAtMs(startsAt: string, offsetMinutes: number): number {
  return new Date(startsAt).getTime() - offsetMinutes * 60 * 1000;
}

/**
 * Kural şu an gönderilmeli mi?
 * Idempotency `message_dispatches` ile; burada sadece due zamanı.
 * - before_start + offset > 0: starts_at - offset ≤ now < starts_at
 * - calendar_day: aynı Istanbul günü, local saat ≥ send_at (randevu sonrası da OK)
 */
export function isRuleDueNow(
  rule: MessageRuleTiming,
  startsAt: string,
  now = new Date(),
): boolean {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const t = now.getTime();
  const mode = rule.timing_mode || "before_start";

  if (mode === "calendar_day") {
    const local = parseLocalTime(rule.send_at_local_time);
    if (!local) return false;
    if (istanbulYmd(now) !== istanbulYmd(start)) return false;
    const { hour, minute } = istanbulHm(now);
    const nowMinutes = hour * 60 + minute;
    const sendMinutes = local.hour * 60 + local.minute;
    return nowMinutes >= sendMinutes;
  }

  if (t >= start.getTime()) return false;

  if (rule.offset_minutes > 0) {
    const dueAt = offsetDueAtMs(startsAt, rule.offset_minutes);
    return t >= dueAt;
  }

  const local = parseLocalTime(rule.send_at_local_time);
  if (!local) return false;
  if (istanbulYmd(now) !== istanbulYmd(start)) return false;

  const { hour, minute } = istanbulHm(now);
  const nowMinutes = hour * 60 + minute;
  const sendMinutes = local.hour * 60 + local.minute;
  return nowMinutes >= sendMinutes;
}

export function buildTemplateBodyComponents(
  contactName: string | null | undefined,
  startsAt: string,
): TemplateBodyComponent[] {
  const name = (contactName ?? "").trim() || "Değerli hastamız";
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(startsAt));
  const timeLabel = formatTimeTr(startsAt);

  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: dateLabel },
        { type: "text", text: timeLabel },
      ],
    },
  ];
}

export function normalizePhoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function previewAutomationBody(
  contactName: string | null,
  startsAt: string,
): string {
  const name = (contactName ?? "").trim() || "Değerli hastamız";
  return `${name} — ${formatDateTimeTr(startsAt)}`;
}
