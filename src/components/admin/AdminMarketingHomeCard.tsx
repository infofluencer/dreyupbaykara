import Link from "next/link";
import { loadMonthToDateSummary } from "@/lib/marketing/admin-stats";
import { formatMarketingDateRangeTr } from "@/lib/marketing/date-range";
import { formatTry } from "@/lib/marketing/format";

export async function AdminMarketingHomeCard() {
  try {
    const mtd = await loadMonthToDateSummary();
    if (!mtd || (mtd.spend === 0 && mtd.cpl == null)) {
      return null;
    }

    const rangeLabel = formatMarketingDateRangeTr(mtd.startDate, mtd.endDate);

    return (
      <Link
        href="/admin/marketing"
        className="block rounded-2xl border border-[#123524]/08 bg-white px-4 py-4 transition active:border-[#0b6b45]/30 sm:px-5 sm:py-5"
      >
        <p className="text-sm font-semibold text-[#1a56db]">Reklam</p>
        <p className="mt-1 text-sm text-pretty text-[#466254]">
          Google + Meta harcama · {rangeLabel}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[#466254]">Harcama</p>
            <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tabular-nums text-[#123524] sm:text-2xl">
              {formatTry(mtd.spend)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#466254]">CPL</p>
            <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tabular-nums text-[#123524] sm:text-2xl">
              {formatTry(mtd.cpl)}
            </p>
          </div>
        </div>
      </Link>
    );
  } catch (err) {
    console.error("[marketing] home card:", err);
    return null;
  }
}
