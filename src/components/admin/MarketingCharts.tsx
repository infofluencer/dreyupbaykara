"use client";

import type { MarketingSummary } from "@/lib/marketing/types";
import { formatTry } from "@/lib/marketing/format";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/crm/source-kind";

export function MarketingDailyChart({
  daily,
  seriesLabel = "Lead",
}: {
  daily: MarketingSummary["daily"];
  seriesLabel?: string;
}) {
  if (!daily.length) {
    return (
      <p className="py-8 text-center text-sm text-[#466254]">
        Bu aralıkta günlük veri yok. Hesap bağlayıp sync çalıştırın.
      </p>
    );
  }

  const maxSpend = Math.max(...daily.map((d) => d.spend), 1);
  const maxLeads = Math.max(...daily.map((d) => d.leads), 1);
  const width = 640;
  const height = 200;
  const padX = 8;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = innerW / Math.max(daily.length - 1, 1);

  const spendPoints = daily.map((d, i) => {
    const x = padX + i * step;
    const y = padY + innerH - (d.spend / maxSpend) * innerH;
    return `${x},${y}`;
  });

  const leadPoints = daily.map((d, i) => {
    const x = padX + i * step;
    const y = padY + innerH - (d.leads / maxLeads) * innerH;
    return `${x},${y}`;
  });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full min-w-[20rem]"
        role="img"
        aria-label="Günlük harcama ve lead grafiği"
      >
        <polyline
          fill="none"
          stroke="#1a56db"
          strokeWidth="2"
          points={spendPoints.join(" ")}
        />
        <polyline
          fill="none"
          stroke="#0b6b45"
          strokeWidth="2"
          strokeDasharray="4 3"
          points={leadPoints.join(" ")}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#466254]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-[#1a56db]" />
          Harcama (₺)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-[#0b6b45]" />
          {seriesLabel}
        </span>
      </div>
    </div>
  );
}

export function MarketingShareBars({
  rows,
  valueLabel = "Harcama",
  formatValue,
}: {
  rows: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
    hint?: string;
  }>;
  valueLabel?: string;
  formatValue?: (value: number) => string;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-sm text-[#466254]">
        Kırılım henüz yok — bir sonraki Meta sync sonrası dolar.
      </p>
    );
  }

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...rows.map((row) => row.value), 1);
  const format = formatValue ?? ((value: number) => value.toLocaleString("tr-TR"));

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = Math.max(Math.round((row.value / max) * 100), row.value > 0 ? 4 : 0);
        const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
        return (
          <div key={row.id}>
            <div className="mb-1 flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-[#123524]">{row.label}</p>
                {row.hint ? (
                  <p className="text-[11px] text-[#466254]">{row.hint}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-[#123524]">
                  {format(row.value)}
                </p>
                <p className="text-[11px] tabular-nums text-[#466254]">
                  %{share} {valueLabel.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#eef2f0]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${width}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketingFunnel({
  steps,
}: {
  steps: Array<{ id: string; label: string; value: number; hint?: string }>;
}) {
  const max = Math.max(...steps.map((step) => step.value), 1);
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const width = Math.max(18, Math.round((step.value / max) * 100));
        const prev = index > 0 ? steps[index - 1].value : null;
        const conv =
          prev && prev > 0 ? Math.round((step.value / prev) * 100) : null;
        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className="w-full">
              <div
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-white"
                style={{
                  width: `${width}%`,
                  minWidth: "8.5rem",
                  backgroundColor: `rgba(18, 53, 36, ${0.45 + (index / Math.max(steps.length, 1)) * 0.45})`,
                }}
              >
                <span className="truncate text-sm font-semibold">{step.label}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {step.value.toLocaleString("tr-TR")}
                </span>
              </div>
              {step.hint || conv != null ? (
                <p className="mt-1 text-[11px] text-[#466254]">
                  {conv != null ? `Önceki adımdan %${conv}` : null}
                  {conv != null && step.hint ? " · " : null}
                  {step.hint}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketingDonut({
  title,
  hint,
  totalLabel,
  slices,
}: {
  title: string;
  hint?: string;
  totalLabel: string;
  slices: Array<{ id: string; label: string; value: number; color: string }>;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 196;
  const stroke = 36;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = slices.map((slice) => {
    const length = total > 0 ? (slice.value / total) * circumference : 0;
    const start = offset;
    offset += length;
    return { ...slice, length, start };
  });

  return (
    <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[#123524]">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-[#466254]">{hint}</p> : null}
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-auto w-36 sm:w-44"
          role="img"
          aria-label={`${title}: ${total} ${totalLabel}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#eef2f0"
            strokeWidth={stroke}
          />
          {total > 0
            ? arcs
                .filter((arc) => arc.length > 0)
                .map((arc) => (
                  <circle
                    key={arc.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${arc.length} ${circumference}`}
                    strokeDashoffset={-arc.start}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                ))
            : null}
          <text
            x={size / 2}
            y={size / 2 - 6}
            textAnchor="middle"
            className="fill-[#123524] text-2xl font-semibold"
          >
            {total.toLocaleString("tr-TR")}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 16}
            textAnchor="middle"
            className="fill-[#466254] text-[11px]"
          >
            {totalLabel}
          </text>
        </svg>
        <ul className="w-full flex-1 space-y-2 text-sm">
          {slices.map((slice) => {
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <li key={slice.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[#123524]">
                  {slice.label}
                </span>
                <span className="tabular-nums font-semibold text-[#123524]">
                  {slice.value.toLocaleString("tr-TR")}
                </span>
                <span className="w-10 text-right text-xs tabular-nums text-[#466254]">
                  %{pct}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

export function MarketingPlatformBars({
  summary,
  googleConversions,
}: {
  summary: MarketingSummary;
  googleConversions?: number;
}) {
  const rows = [
    {
      id: "google_ads" as const,
      spend: summary.platforms.google_ads.spend,
      crmLeads: summary.platforms.google_ads.leads,
      googleConversions: googleConversions ?? 0,
    },
    {
      id: "meta" as const,
      spend: summary.platforms.meta.spend,
      crmLeads: summary.platforms.meta.leads,
      googleConversions: 0,
    },
  ];
  const maxSpend = Math.max(...rows.map((r) => r.spend), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const pct = Math.round((row.spend / maxSpend) * 100);
        return (
          <div key={row.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[#123524]">
                {PLATFORM_LABEL[row.id]}
              </span>
              <span className="text-right text-xs leading-relaxed text-[#466254] sm:text-sm">
                <span className="tabular-nums">{formatTry(row.spend)}</span>
                <span className="mx-1.5 text-[#466254]/50">·</span>
                {row.id === "google_ads" && row.googleConversions > 0 ? (
                  <>
                    <span className="text-[#1a56db]">
                      {row.googleConversions.toLocaleString("tr-TR")} Google dön.
                    </span>
                    <span className="mx-1.5 text-[#466254]/50">·</span>
                  </>
                ) : null}
                <span className="text-[#0b6b45]">
                  {row.crmLeads} CRM lead
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f0]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: PLATFORM_COLOR[row.id],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
