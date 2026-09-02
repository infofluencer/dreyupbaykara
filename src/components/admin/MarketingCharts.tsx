"use client";

import type { MarketingSummary } from "@/lib/marketing/types";
import { formatTry } from "@/lib/marketing/format";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/crm/source-kind";

export function MarketingDailyChart({
  daily,
}: {
  daily: MarketingSummary["daily"];
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
          Lead
        </span>
      </div>
    </div>
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
