export type BotHoursSettings = {
  timezone: string;
  business_days: number[];
  business_start: string;
  business_end: string;
};

function localParts(timezone: string, at: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(at)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    day: weekdayMap[parts.weekday] ?? 1,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** Mesai içi = bot susar. `at` ile birim testte sabitlenir. */
export function isWithinBusinessHours(
  settings: BotHoursSettings,
  at: Date = new Date(),
): boolean {
  const local = localParts(settings.timezone, at);
  return (
    settings.business_days.includes(local.day) &&
    local.time >= settings.business_start.slice(0, 5) &&
    local.time < settings.business_end.slice(0, 5)
  );
}
