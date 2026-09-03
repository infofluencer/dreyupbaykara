import { PLATFORM_LABEL } from "@/lib/crm/source-kind";
import type {
  CampaignPerformanceResult,
  CampaignPerformanceRow,
} from "@/lib/marketing/types";
import { formatTry } from "@/lib/marketing/format";

function MetricCell({
  value,
  emptyHint,
}: {
  value: string;
  emptyHint?: string;
}) {
  if (value === "—" && emptyHint) {
    return (
      <span className="text-[#466254]/70" title={emptyHint}>
        —
      </span>
    );
  }
  return <span>{value}</span>;
}

function CampaignRow({ row }: { row: CampaignPerformanceRow }) {
  const isActive = row.spend > 0 || row.clicks > 0;

  return (
    <tr
      className={`border-b border-[#123524]/06 last:border-0 ${
        isActive ? "" : "opacity-60"
      }`}
    >
      <td className="max-w-[14rem] px-3 py-2.5 font-medium text-[#123524]">
        <span className="line-clamp-2">{row.name}</span>
      </td>
      <td className="px-3 py-2.5 text-[#466254]">
        {row.site || <span className="text-amber-700">eşleşmedi</span>}
      </td>
      <td className="px-3 py-2.5">{PLATFORM_LABEL[row.platform]}</td>
      <td className="px-3 py-2.5 tabular-nums">{formatTry(row.spend)}</td>
      <td className="px-3 py-2.5 tabular-nums">
        {row.clicks.toLocaleString("tr-TR")}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-[#1a56db]">
        <MetricCell
          value={
            row.googleConversions > 0
              ? row.googleConversions.toLocaleString("tr-TR")
              : "—"
          }
          emptyHint="Google Ads dönüşüm tag'i — API'den"
        />
      </td>
      <td className="px-3 py-2.5 tabular-nums text-[#0b6b45]">
        <MetricCell
          value={row.crmLeads > 0 ? String(row.crmLeads) : "—"}
          emptyHint="CRM lead — utm_campaign adı eşleşmedi veya kayıt yok"
        />
      </td>
      <td className="px-3 py-2.5 tabular-nums">
        {formatTry(row.googleCpa)}
      </td>
      <td className="px-3 py-2.5 tabular-nums">{formatTry(row.cpl)}</td>
    </tr>
  );
}

export function MarketingCampaignTable({
  performance,
}: {
  performance: CampaignPerformanceResult;
}) {
  const { rows, attribution } = performance;
  const activeRows = rows.filter((row) => row.spend > 0 || row.clicks > 0);
  const inactiveRows = rows.filter((row) => row.spend === 0 && row.clicks === 0);

  if (!rows.length) {
    return (
      <p className="mt-4 text-sm text-[#466254]">
        Kampanya verisi yok. Sync sonrası burada görünür.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl bg-[#f7f9f8] px-4 py-3 text-sm text-[#466254]">
        <p className="font-semibold text-[#123524]">Lead sütunu neden boş?</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[13px]">
          <li>
            <strong className="text-[#1a56db]">Google dönüşüm</strong> — reklam
            panelindeki conversion (form, arama vb.), API&apos;den gelir.
          </li>
          <li>
            <strong className="text-[#0b6b45]">CRM lead</strong> — form/WhatsApp
            kaydı; reklam sitesi filtresinde{" "}
            <code className="text-xs">utm_campaign</code> ile o sitedeki kampanya
            adına eşleşir (lead kaydı ana sitede olsa bile).
          </li>
        </ul>
        {attribution.crmGoogleUnmatched > 0 ? (
          <p className="mt-2 text-[13px] text-amber-900">
            {attribution.crmGoogleUnmatched} CRM kaydı Google tıklaması var ama
            kampanya adı eşleşmedi (farklı site veya utm boş).
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[#466254]/80">
          Özet kartındaki toplam lead: platform bazlı CRM sayımı (gclid / fbclid /
          Click-to-WhatsApp). Kampanya satırındaki CRM lead: utm eşleşmesi —
          farklı metrikler.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-[#123524]/08 bg-[#f7f9f8] text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
            <tr>
              <th className="px-3 py-2">Kampanya</th>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Harcama</th>
              <th className="px-3 py-2">Tıklama</th>
              <th className="px-3 py-2 text-[#1a56db]">Google dön.</th>
              <th className="px-3 py-2 text-[#0b6b45]">CRM lead</th>
              <th className="px-3 py-2">Google CPA</th>
              <th className="px-3 py-2">CRM CPL</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <CampaignRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {inactiveRows.length ? (
        <details className="rounded-xl border border-[#123524]/08 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#466254]">
            Harcaması olmayan {inactiveRows.length} kampanya
          </summary>
          <div className="overflow-x-auto border-t border-[#123524]/08">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <tbody>
                {inactiveRows.map((row) => (
                  <CampaignRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
