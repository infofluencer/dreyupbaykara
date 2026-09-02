import type { GoogleLeadsSummary } from "@/lib/marketing/types";

const CATEGORY_LABEL: Record<string, string> = {
  LEAD: "Lead",
  PURCHASE: "Satın alma",
  SIGNUP: "Kayıt",
  PAGE_VIEW: "Sayfa görüntüleme",
  DOWNLOAD: "İndirme",
  DEFAULT: "Varsayılan",
};

function formatFieldValue(
  fields: GoogleLeadsSummary["recentSubmissions"][0]["form_fields"],
): string {
  if (!fields?.length) return "—";
  return fields
    .map((f) => `${f.fieldType}: ${f.fieldValue}`)
    .join(" · ")
    .slice(0, 120);
}

export function MarketingGoogleLeadsSection({
  summary,
  crmLeads,
}: {
  summary: GoogleLeadsSummary;
  crmLeads: number;
}) {
  const hasData =
    summary.leadFormCount > 0 ||
    summary.conversionByAction.length > 0 ||
    summary.configuredActions.length > 0;

  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
        Google Ads — lead vs dönüşüm
      </h2>
      <p className="mt-1 text-sm text-[#466254]">
        Üç farklı kavram: Google&apos;ın saydığı olaylar (dönüşüm), Google Lead
        Form kayıtları (varsa) ve CRM WhatsApp lead&apos;leri.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[#1a56db]/15 bg-[#f0f6ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-[#1a56db]">
            Google dönüşüm
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#123524]">
            {summary.conversionTotal.toLocaleString("tr-TR")}
          </p>
          <p className="mt-1 text-[11px] text-[#466254]">
            Tag ile sayılan olaylar — tıklama, arama, site formu vb. (toplu)
          </p>
        </article>
        <article className="rounded-xl border border-[#7c3aed]/15 bg-[#f5f0ff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-[#7c3aed]">
            Google Lead Form
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#123524]">
            {summary.leadFormCount.toLocaleString("tr-TR")}
          </p>
          <p className="mt-1 text-[11px] text-[#466254]">
            Google&apos;da açılan lead formu — isim/telefon (bireysel kayıt)
          </p>
        </article>
        <article className="rounded-xl border border-[#0b6b45]/15 bg-[#f0faf5] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-[#0b6b45]">
            CRM lead
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#123524]">
            {crmLeads.toLocaleString("tr-TR")}
          </p>
          <p className="mt-1 text-[11px] text-[#466254]">
            Üstteki &quot;Toplam lead (CRM)&quot; kartında — WhatsApp Ref akışı
          </p>
        </article>
      </div>

      {!hasData ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Henüz Google lead form veya dönüşüm aksiyonu detayı yok.{" "}
          <strong>Veriyi şimdi çek (sync)</strong> çalıştırın ve migration{" "}
          <code>20260903150000_google_ad_lead_submissions.sql</code> uygulayın.
          Lead Form Extension kullanmıyorsanız bu tablo 0 kalır — dönüşümler
          yine üstteki mavi kartta görünür.
        </p>
      ) : null}

      {summary.conversionByAction.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[#123524]">
            Dönüşüm aksiyonu kırılımı
          </h3>
          <p className="mt-1 text-xs text-[#466254]">
            Hesabınızda hangi olaylar &quot;dönüşüm&quot; sayılıyor
          </p>
          <ul className="mt-3 space-y-2">
            {summary.conversionByAction.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between rounded-lg border border-[#123524]/06 px-3 py-2 text-sm"
              >
                <span className="font-medium text-[#123524]">{row.name}</span>
                <span className="tabular-nums text-[#1a56db]">
                  {row.conversions.toLocaleString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.configuredActions.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[#123524]">
            Tanımlı dönüşüm aksiyonları
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.configuredActions.map((action) => (
              <span
                key={action.name}
                className="rounded-full border border-[#123524]/10 bg-[#f7f9f8] px-2.5 py-1 text-xs text-[#466254]"
                title={action.actionType ?? undefined}
              >
                {action.name}
                {action.category
                  ? ` · ${CATEGORY_LABEL[action.category] ?? action.category}`
                  : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {summary.recentSubmissions.length ? (
        <div className="mt-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-[#123524]">
            Son Google Lead Form gönderimleri
          </h3>
          <table className="mt-2 w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[#123524]/08 text-[11px] uppercase text-[#466254]">
                <th className="px-2 py-2">Tarih</th>
                <th className="px-2 py-2">Kampanya</th>
                <th className="px-2 py-2">gclid</th>
                <th className="px-2 py-2">Form</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentSubmissions.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#123524]/06 last:border-0"
                >
                  <td className="px-2 py-2 tabular-nums text-[#466254]">
                    {new Date(row.submitted_at).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-2 py-2">{row.campaign_name ?? "—"}</td>
                  <td className="max-w-[8rem] truncate px-2 py-2 font-mono text-xs">
                    {row.gclid ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-[#466254]">
                    {formatFieldValue(row.form_fields)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
