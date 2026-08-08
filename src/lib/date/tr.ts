const TIME_ZONE = "Europe/Istanbul";

function istanbulParts(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      ...options,
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
}

export function formatDateTimeTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTimeTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateLongTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatWeekdayLongTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(new Date(value));
}

export function formatMonthYearTr(value: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTimeRangeTr(
  start: string | Date,
  end: string | Date,
): string {
  return `${formatTimeTr(start)} – ${formatTimeTr(end)}`;
}

export function dayOfMonthTr(value: string | Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      day: "numeric",
    }).format(new Date(value)),
  );
}

export function istanbulYmd(value: Date | string = new Date()): string {
  const parts = istanbulParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function istanbulHourMinute(value: Date | string): {
  hour: number;
  minute: number;
} {
  const parts = istanbulParts(value, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return { hour: Number(parts.hour), minute: Number(parts.minute) };
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return istanbulYmd(date);
}

export function startOfWeekMonday(ymd: string): string {
  const date = new Date(`${ymd}T12:00:00+03:00`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addDaysYmd(ymd, -mondayOffset);
}

export function datetimeLocalValue(
  ymd: string,
  hour: number,
  minute: number,
): string {
  return `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseYmd(raw?: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return istanbulYmd();
}

