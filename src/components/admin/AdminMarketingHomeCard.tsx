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
        className="block rounded-2xl border border-[#123524]/08 bg-white px-5 py-5 transition active:border-[#0b6b45]/30"
      >
        <p className="text-sm font-semibold text-[#1a56db]">Reklam</p>
        <p className="mt-1 text-sm text-[#466254]">
          Google + Meta harcama · {rangeLabel}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#466254]">Harcama</p>
            <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
              {formatTry(mtd.spend)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#466254]">CPL</p>
            <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
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
