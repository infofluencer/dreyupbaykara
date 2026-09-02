import { istanbulYmd } from "@/lib/date/tr";

export type MarketingPeriod = "mtd" | "1" | "2" | "3" | "4" | "5" | "6" | "custom";

export const MARKETING_PERIOD_OPTIONS: {
  value: MarketingPeriod;
  label: string;
}[] = [
  { value: "mtd", label: "Bu ay" },
  { value: "1", label: "Son 1 ay" },
  { value: "2", label: "Son 2 ay" },
  { value: "3", label: "Son 3 ay" },
  { value: "4", label: "Son 4 ay" },
  { value: "5", label: "Son 5 ay" },
  { value: "6", label: "Son 6 ay" },
  { value: "custom", label: "Özel tarih" },
];

export const DEFAULT_MARKETING_PERIOD = "6" as const satisfies Exclude<
  MarketingPeriod,
  "custom"
>;

export function pickMarketingQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[value.length - 1]?.trim() || undefined;
  }
  return value?.trim() || undefined;
}

export function isMarketingPeriod(value: string): value is MarketingPeriod {
  return MARKETING_PERIOD_OPTIONS.some((option) => option.value === value);
}

export function sanitizeMarketingDateRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } {
  const today = istanbulYmd();
  let start = startDate.slice(0, 10);
  let end = endDate.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) end = today;
  if (end > today) end = today;
  if (start > end) [start, end] = [end, start];

  return { startDate: start, endDate: end };
}

export function marketingDateRangeForPeriod(
  period: Exclude<MarketingPeriod, "custom">,
): {
  startDate: string;
  endDate: string;
} {
  const today = istanbulYmd();
  const [year, month, day] = today.split("-").map(Number);
  const endDate = today;

  if (period === "mtd") {
    const monthStr = String(month).padStart(2, "0");
    return {
      startDate: `${year}-${monthStr}-01`,
      endDate,
    };
  }

  const months = Number.parseInt(period, 10);
  const start = new Date(Date.UTC(year, month - 1, day));
  start.setUTCMonth(start.getUTCMonth() - months);
  const startDate = start.toISOString().slice(0, 10);

  return sanitizeMarketingDateRange(startDate, endDate);
}

export function resolveMarketingDateRange(query: {
  period?: string;
  start?: string;
  end?: string;
}): {
  startDate: string;
  endDate: string;
  period: MarketingPeriod;
} {
  const period = query.period;

  if (
    period === "custom" &&
    query.start?.trim() &&
    query.end?.trim()
  ) {
    const range = sanitizeMarketingDateRange(
      query.start.trim(),
      query.end.trim(),
    );
    return { ...range, period: "custom" };
  }

  if (period && isMarketingPeriod(period) && period !== "custom") {
    const range = marketingDateRangeForPeriod(period);
    return { ...range, period };
  }

  if (query.start?.trim() && query.end?.trim()) {
    const range = sanitizeMarketingDateRange(
      query.start.trim(),
      query.end.trim(),
    );
    return { ...range, period: "custom" };
  }

  const range = marketingDateRangeForPeriod(DEFAULT_MARKETING_PERIOD);
  return { ...range, period: DEFAULT_MARKETING_PERIOD };
}

export function marketingPeriodLabel(period: MarketingPeriod): string {
  return (
    MARKETING_PERIOD_OPTIONS.find((option) => option.value === period)?.label ??
    "Özel tarih"
  );
}

export function formatMarketingDateRangeTr(
  startDate: string,
  endDate: string,
): string {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-");
    return `${d}.${m}.${y}`;
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
