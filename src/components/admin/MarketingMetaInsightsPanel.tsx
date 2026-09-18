"use client";

import type {
  MetaCrmBreakdown,
  MetaMarketingInsights,
} from "@/lib/marketing/admin-stats";
import {
  META_PLATFORM_COLORS,
} from "@/lib/marketing/meta/actions";
import { LEAD_STATUS_LABEL } from "@/lib/crm/lead-status";
import {
  formatMarketingDateRangeTr,
  marketingPeriodLabel,
  type MarketingPeriod,
} from "@/lib/marketing/date-range";
import { formatPct, formatTry } from "@/lib/marketing/format";
import {
  MarketingDailyChart,
  MarketingDonut,
  MarketingFunnel,
  MarketingShareBars,
} from "@/components/admin/MarketingCharts";
import { KpiCard, KpiHelpButton } from "@/components/admin/KpiCard";

function formatCount(value: number): string {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

export function MarketingMetaInsightsPanel({
  insights,
  crm,
  period,
  startDate,
  endDate,
  siteFilter,
}: {
  insights: MetaMarketingInsights;
  crm: MetaCrmBreakdown;
  period: MarketingPeriod;
  startDate: string;
  endDate: string;
  siteFilter: string | null;
}) {
  const filterLabel = [
    marketingPeriodLabel(period),
    formatMarketingDateRangeTr(startDate, endDate),
    siteFilter ? `Site: ${siteFilter}` : "Tüm siteler · tüm act_ hesapları",
  ].join(" · ");

  const hasData =
    insights.totalSpend > 0 ||
    insights.totalImpressions > 0 ||
    insights.daily.length > 0 ||
    crm.leads > 0;

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-dashed border-[#123524]/15 bg-white p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Meta Ads detay
        </h2>
        <p className="mt-2 text-sm text-[#466254]">
          Seçili filtre için Meta verisi yok. Site filtresi boşsa bağlı tüm
          act_ hesapları toplanır; cron henüz bu aralığı doldurmamış olabilir.
        </p>
      </section>
    );
  }

  const costPerSurgery =
    crm.surgeryDone > 0
      ? Math.round((insights.totalSpend / crm.surgeryDone) * 100) / 100
      : null;
  const surgeryRate =
    crm.leads > 0 ? crm.surgeryDone / crm.leads : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Meta Ads detay
          </h2>
          <p className="mt-1 text-sm text-[#466254]">{filterLabel}</p>
        </div>
        <div className="rounded-xl bg-[#ebe4ff] px-3 py-2 text-xs font-semibold text-[#5b21b6]">
          Meta harcama {formatTry(insights.totalSpend)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Harcama"
          value={formatTry(insights.totalSpend)}
          hint={`${formatCount(insights.totalClicks)} tıklama`}
          help={{
            meaning:
              "Seçili tarih ve sitedeki tüm bağlı Meta act_ hesaplarının reklam harcaması.",
            formula: "Σ Insights spend (kampanya × gün)",
          }}
        />
        <KpiCard
          label="Gösterim"
          value={formatCount(insights.totalImpressions)}
          hint={
            insights.avgCpm != null
              ? `CPM ${formatTry(insights.avgCpm)}`
              : "Kaç kez görüldü"
          }
          help={{
            meaning:
              "Reklamın kaç kez ekrana geldiği. Aynı kişi birden fazla kez sayılır.",
            formula: "Σ impressions",
          }}
        />
        <KpiCard
          label="Reach (günlük ort.)"
          value={
            insights.avgDailyReach != null
              ? formatCount(insights.avgDailyReach)
              : "—"
          }
          hint={
            insights.avgFrequency != null
              ? `Frekans ${insights.avgFrequency.toLocaleString("tr-TR")}`
              : "Benzersiz kişi, günler toplanmaz"
          }
          help={{
            meaning:
              "Bir günde reklamı gören tahmini benzersiz kişi. Günler toplanmaz; aralıkta günlük ortalama gösterilir. Kampanyalar üst üste binebilir.",
            formula: "ortalama(günlük Σ campaign reach)",
          }}
        />
        <KpiCard
          label="CPP"
          value={insights.avgCpp != null ? formatTry(insights.avgCpp) : "—"}
          hint="1000 kişiye ulaşma maliyeti"
          help={{
            meaning:
              "Günlük ortalama reach başına 1000 kişi maliyeti. Unique dönem reach olmadığı için yaklaşık değerdir.",
            formula: "harcama / günlük ortalama reach × 1000",
          }}
        />
        <KpiCard
          label="Ort. CPC"
          value={insights.avgCpc != null ? formatTry(insights.avgCpc) : "—"}
          hint={
            insights.avgCtr != null
              ? `CTR ${formatPct(insights.avgCtr)}`
              : "Tıklama başına maliyet"
          }
          help={{
            meaning: "Bir tıklamanın ortalama maliyeti (tüm tıklama türleri).",
            formula: "harcama ÷ tıklama",
          }}
        />
        <KpiCard
          label="Link tıklama"
          value={formatCount(insights.totalInlineLinkClicks)}
          hint={
            insights.linkCtr != null
              ? `Link CTR ${formatPct(insights.linkCtr)}`
              : "Reklamdaki linke tıklama"
          }
          help={{
            meaning:
              "Reklamdaki bağlantıya tıklama. Beğeni/profil tıklamasını içermez.",
            formula: "Σ inline_link_clicks",
          }}
        />
        <KpiCard
          label="Meta sonuç"
          value={formatCount(insights.totalConversions)}
          hint={
            insights.costPerConversion != null
              ? `CPA ${formatTry(insights.costPerConversion)}`
              : "Sohbet + lead (Ads Manager)"
          }
          help={{
            meaning:
              "Ads Manager sonuçları: WhatsApp sohbet (7 gün) + lead formu + pixel lead. CRM kaydı değildir.",
            formula:
              "Σ messaging_conversation_started_7d + lead + leadgen_grouped + pixel lead",
          }}
        />
        <KpiCard
          label="WhatsApp sohbet"
          value={formatCount(insights.messagingConversations)}
          hint={
            insights.costPerConversation != null
              ? `Sohbet maliyeti ${formatTry(insights.costPerConversation)}`
              : "Click-to-WhatsApp 7 gün"
          }
          help={{
            meaning:
              "Reklamdan başlayan WhatsApp konuşması (7 gün). Ads Manager CTWA sonucu. Bir sonraki sync’te dolar.",
            formula: "Σ onsite_conversion.messaging_conversation_started_7d",
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="İlk yanıt"
          value={formatCount(insights.messagingFirstReply)}
          hint={
            insights.messagingConversations > 0
              ? `Sohbetten %${Math.round((insights.messagingFirstReply / insights.messagingConversations) * 100)}`
              : "Kullanıcı ilk mesajı yazdı"
          }
          help={{
            meaning:
              "Sohbet açıldıktan sonra kullanıcının ilk mesajı. Sohbetten düşükse bot/yanıt gecikmesi olabilir.",
            formula: "Σ onsite_conversion.messaging_first_reply",
          }}
        />
        <KpiCard
          label="CRM lead"
          value={String(crm.leads)}
          hint={
            crm.leads > 0
              ? `CPL ${formatTry(insights.totalSpend / crm.leads)}`
              : "fbclid / CTWA / Meta UTM"
          }
          help={{
            meaning:
              "CRM’de Meta izi olan kayıt. Ads Manager sohbet sayısından düşüktür; her sohbet form/WhatsApp kaydı olmaz.",
            formula:
              "fbclid veya ctwa_clid veya channel=meta_ctwa veya Meta UTM",
          }}
        />
        <KpiCard
          label="Ameliyat (yapılan)"
          value={String(crm.surgeryDone)}
          hint={
            surgeryRate != null
              ? `Lead → ameliyat ${formatPct(surgeryRate)}`
              : "ameliyat_edildi + bitti"
          }
          help={{
            meaning:
              "Meta CRM lead’lerden ameliyatı yapılanlar. “Ameliyat olacak” dahil değildir.",
            formula: "status ∈ {ameliyat_edildi, bitti} ve platform = meta",
          }}
        />
        <KpiCard
          label="Ameliyat başına maliyet"
          value={formatTry(costPerSurgery)}
          hint={
            crm.appointmentLeads > 0
              ? `${crm.appointmentLeads} ameliyat/plan`
              : "Yapılan ameliyata bölünen harcama"
          }
          help={{
            meaning:
              "Meta harcamasının, gerçekten ameliyat olan Meta lead’e maliyeti. Planlanan (ameliyat olacak) sayılmaz.",
            formula: "Meta harcama ÷ (ameliyat_edildi + bitti)",
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#123524]">
                Günlük harcama vs Meta sonuç
              </h3>
              <p className="mt-1 text-xs text-[#466254]">
                Ads Manager sonuçları — CRM değil
              </p>
            </div>
            <KpiHelpButton
              label="Günlük grafik"
              help={{
                meaning:
                  "Düz çizgi harcama, kesik çizgi Ads sonuç (sohbet + lead).",
                formula: "günlük Σ spend ve Σ conversions",
              }}
            />
          </div>
          <div className="mt-4">
            <MarketingDailyChart
              daily={insights.daily.map((row) => ({
                date: row.date,
                spend: row.spend,
                leads: row.conversions,
              }))}
              seriesLabel="Meta sonuç"
            />
          </div>
        </article>

        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#123524]">
                Mesaj ve CRM hunisi
              </h3>
              <p className="mt-1 text-xs text-[#466254]">
                Tıklama → sohbet → yanıt → CRM → ameliyat
              </p>
            </div>
            <KpiHelpButton
              label="Huni"
              help={{
                meaning:
                  "İlk üç basamak Ads Manager, son ikisi CRM. Sohbet/yanıt bir sonraki sync’te dolabilir.",
                formula:
                  "tıklama → messaging_conversation → first_reply → CRM meta lead → ameliyat_edildi+bitti",
              }}
            />
          </div>
          <div className="mt-4">
            <MarketingFunnel
              steps={[
                {
                  id: "clicks",
                  label: "Tıklama",
                  value: insights.totalClicks,
                },
                {
                  id: "chat",
                  label: "WhatsApp sohbet",
                  value: Math.round(insights.messagingConversations),
                },
                {
                  id: "reply",
                  label: "İlk yanıt",
                  value: Math.round(insights.messagingFirstReply),
                },
                { id: "crm", label: "CRM lead", value: crm.leads },
                {
                  id: "exam",
                  label: "Muayene",
                  value: crm.funnel.muayene_edildi + crm.funnel.ameliyat_olacak + crm.funnel.ameliyat_edildi + crm.funnel.bitti,
                },
                {
                  id: "surgery",
                  label: "Ameliyat",
                  value: crm.surgeryDone,
                },
              ]}
            />
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#123524]">
                Facebook vs Instagram
              </h3>
              <p className="mt-1 text-xs text-[#466254]">
                publisher_platform harcama payı
              </p>
            </div>
            <KpiHelpButton
              label="Platform"
              help={{
                meaning:
                  "Harcamanın Facebook, Instagram, Messenger veya Audience Network’te dağılımı. Tüm act_ hesapları toplanır.",
                formula: "Insights breakdowns=publisher_platform → Σ spend",
              }}
            />
          </div>
          <div className="mt-4">
            <MarketingShareBars
              rows={insights.platforms.map((row) => ({
                id: row.key,
                label: row.label,
                value: row.spend,
                color: META_PLATFORM_COLORS[row.key] ?? "#5b21b6",
                hint: `${row.clicks.toLocaleString("tr-TR")} tık · ${row.conversions.toLocaleString("tr-TR")} sonuç`,
              }))}
              formatValue={formatTry}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#123524]">
                Cihaz
              </h3>
              <p className="mt-1 text-xs text-[#466254]">
                impression_device harcama payı
              </p>
            </div>
            <KpiHelpButton
              label="Cihaz"
              help={{
                meaning: "Reklamın hangi cihazda gösterildiği (harcama payı).",
                formula: "Insights breakdowns=impression_device → Σ spend",
              }}
            />
          </div>
          <div className="mt-4">
            <MarketingShareBars
              rows={insights.devices.map((row) => ({
                id: row.key,
                label: row.label,
                value: row.spend,
                color: "#0b6b45",
                hint: `${row.clicks.toLocaleString("tr-TR")} tık`,
              }))}
              formatValue={formatTry}
            />
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MarketingDonut
          title="CRM lead kaynağı"
          hint="Aynı lead’de CTWA, fbclid’den önce gelir"
          totalLabel="Meta CRM"
          slices={[
            {
              id: "ctwa",
              label: "Click-to-WhatsApp",
              value: crm.attribution.ctwa,
              color: "#16a34a",
            },
            {
              id: "fbclid",
              label: "fbclid",
              value: crm.attribution.fbclid,
              color: "#1877F2",
            },
            {
              id: "utm",
              label: "Meta UTM",
              value: crm.attribution.utm,
              color: "#E1306C",
            },
            {
              id: "other",
              label: "Diğer Meta izi",
              value: crm.attribution.other,
              color: "#94a3b8",
            },
          ]}
        />

        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#123524]">
                CRM durum hunisi
              </h3>
              <p className="mt-1 text-xs text-[#466254]">
                Yalnızca Meta’ya atfedilen lead’ler
              </p>
            </div>
            <KpiHelpButton
              label="CRM durum"
              help={{
                meaning:
                  "Meta CRM lead’lerin güncel pipeline status’ü. Dönem içinde oluşan kayıtların şu anki hali.",
                formula: "leads.status grupla, platform = meta",
              }}
            />
          </div>
          <div className="mt-4">
            <MarketingFunnel
              steps={(
                [
                  "yeni",
                  "arandi",
                  "muayene_edildi",
                  "ameliyat_olacak",
                  "ameliyat_edildi",
                  "bitti",
                ] as const
              ).map((status) => ({
                id: status,
                label: LEAD_STATUS_LABEL[status],
                value: crm.funnel[status],
              }))}
            />
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[#123524]">Sonuç kırılımı</h3>
        <p className="mt-1 text-xs text-[#466254]">
          Meta Insights action tipleri. Kırılım sync sonrası dolar.
        </p>
        <div className="mt-4">
          {insights.actions.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#123524]/08 text-left text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
                    <th className="pb-2 pr-3">Aksiyon</th>
                    <th className="pb-2 pr-3 text-right">Sonuç</th>
                    <th className="pb-2 text-right">Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.actions.map((row) => (
                    <tr key={row.key} className="border-t border-[#123524]/06">
                      <td className="py-2.5 pr-3 font-medium text-[#123524]">
                        {row.name}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#466254]">
                        {formatCount(row.conversions)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-[#466254]">
                        {row.spend > 0 ? formatTry(row.spend) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl bg-[#f7f9f8] px-4 py-3 text-sm text-[#466254]">
              Action kırılımı henüz yok. Toplam Meta sonuç:{" "}
              <strong className="text-[#123524]">
                {formatCount(insights.totalConversions)}
              </strong>
              .
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
