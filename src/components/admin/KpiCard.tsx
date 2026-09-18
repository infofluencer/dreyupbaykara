"use client";

import { CircleHelp } from "lucide-react";

export type KpiHelpContent = {
  meaning: string;
  formula: string;
};

export function KpiHelpButton({
  label,
  help,
}: {
  label: string;
  help: KpiHelpContent;
}) {
  return (
    <details className="relative z-20">
      <summary
        className="flex h-8 w-8 cursor-help list-none items-center justify-center rounded-full text-[#466254] hover:bg-white/80 hover:text-[#123524] [&::-webkit-details-marker]:hidden"
        aria-label={`${label}: nasıl hesaplanır`}
      >
        <CircleHelp className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-[#123524]/12 bg-white p-3 text-left shadow-lg">
        <p className="text-sm leading-relaxed text-[#123524]">{help.meaning}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-[#466254]">
          <span className="font-semibold text-[#123524]">Hesap: </span>
          {help.formula}
        </p>
      </div>
    </details>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  help,
}: {
  label: string;
  value: string;
  hint?: string;
  help: KpiHelpContent;
}) {
  return (
    <div className="relative rounded-xl border border-[#123524]/06 bg-[#f7f9f8] px-4 py-3 pr-11">
      <div className="absolute right-1.5 top-1.5">
        <KpiHelpButton label={label} help={help} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-[#466254]/80">{hint}</p>
      ) : null}
    </div>
  );
}
