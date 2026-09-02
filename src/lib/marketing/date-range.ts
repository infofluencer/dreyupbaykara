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

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isMarketingPeriod(value: string): value is MarketingPeriod {
  return MARKETING_PERIOD_OPTIONS.some((option) => option.value === value);
}

export function marketingDateRangeForPeriod(period: Exclude<MarketingPeriod, "custom">): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const endDate = formatYmd(end);

  if (period === "mtd") {
    const month = String(end.getMonth() + 1).padStart(2, "0");
    return {
      startDate: `${end.getFullYear()}-${month}-01`,
      endDate,
    };
  }

  const months = Number.parseInt(period, 10);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return { startDate: formatYmd(start), endDate };
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
  if (
    query.period === "custom" &&
    query.start?.trim() &&
    query.end?.trim()
  ) {
    return {
      startDate: query.start.trim(),
      endDate: query.end.trim(),
      period: "custom",
    };
  }

  if (query.period && isMarketingPeriod(query.period) && query.period !== "custom") {
    const range = marketingDateRangeForPeriod(query.period);
    return { ...range, period: query.period };
  }

  if (query.start?.trim() && query.end?.trim()) {
    return {
      startDate: query.start.trim(),
      endDate: query.end.trim(),
      period: "custom",
    };
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
