import Link from "next/link";
import {
  classifyAdPlatform,
  classifySourceEvent,
  EVENT_LABEL,
  PLATFORM_LABEL,
  type AdPlatform,
} from "@/lib/crm/source-kind";
import { formatDateTimeTr } from "@/lib/date/tr";

export type LeadAttribution = {
  id: string;
  site: string | null;
  channel: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
  lead_ref: string | null;
  created_at: string;
};

export type ClickAttribution = {
  lead_ref: string | null;
  site: string | null;
  page_path: string | null;
  channel: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
  created_at: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  footer: "Footer WhatsApp",
  hero: "Hero WhatsApp",
  website: "Site WhatsApp",
  lead_form: "Site formu",
  landing: "Sayfa inişi",
  whatsapp: "WhatsApp",
  meta_ctwa: "Meta → WhatsApp",
  manual: "Panel / takvim",
  test: "Test",
};

const PLATFORM_BADGE: Record<AdPlatform | "manual", string> = {
  google_ads: "bg-[#e8f0fe] text-[#1a56db]",
  meta: "bg-[#ebe4ff] text-[#5b21b6]",
  other: "bg-[#fff4e5] text-[#9a3412]",
  organic: "bg-[#f4f6f5] text-[#466254]",
  manual: "bg-[#f4f6f5] text-[#466254]",
};

function isManual(row: {
  site?: string | null;
  channel?: string | null;
  utm_source?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
}) {
  if (
    row.gclid ||
    row.fbclid ||
    row.gbraid ||
    row.wbraid ||
    row.msclkid ||
    row.ttclid ||
    row.utm_source
  ) {
    return false;
  }
  return row.site === "manual" || row.channel === "manual";
}

function byCreatedAt<T extends { created_at: string }>(a: T, b: T) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function resolveFirstSource(
  leads: LeadAttribution[],
  clicks: ClickAttribution[],
) {
  const firstClick = [...clicks].sort(byCreatedAt)[0];
  if (firstClick) return firstClick;
  return [...leads].sort(byCreatedAt)[0] ?? null;
}

export function PatientSourceCard({
  leads,
  clicks,
}: {
  leads: LeadAttribution[];
  clicks: ClickAttribution[];
}) {
  const source = resolveFirstSource(leads, clicks);

  if (!source) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-[#123524]/15 bg-[#f7f9f8] px-4 py-3">
        <p className="text-sm font-semibold text-[#123524]">İlk kaynak</p>
        <p className="mt-1 text-sm text-[#466254]">
          Henüz kaynak yok. Reklam veya WhatsApp ile gelince burada görünür.
        </p>
      </div>
    );
  }

  const manual = isManual(source);
  const platform: AdPlatform | "manual" = manual
    ? "manual"
    : classifyAdPlatform(source);
  const event = classifySourceEvent(source.channel);
  const channelLabel =
    (source.channel && CHANNEL_LABEL[source.channel]) ||
    (manual ? "Panel / takvim" : EVENT_LABEL[event]);
  const campaign =
    source.utm_campaign || source.campaign || null;
  const pagePath = "page_path" in source ? source.page_path : null;
  const leadRef = source.lead_ref;
  const utmLine = [source.utm_source, source.utm_medium]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="mt-6 rounded-xl border border-[#123524]/10 bg-[#f7f9f8] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#123524]">İlk kaynak</p>
          <p className="mt-0.5 text-xs text-[#466254]">
            Hastanın sisteme ilk hangi kanaldan geldiği.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[platform]}`}
        >
          {platform === "manual" ? "Manuel" : PLATFORM_LABEL[platform]}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Item label="Olay" value={channelLabel} />
        <Item label="Kampanya" value={campaign || "—"} />
        <Item label="UTM" value={utmLine || "—"} />
        <Item label="Sayfa" value={pagePath || "—"} />
        <Item label="Tarih" value={formatDateTimeTr(source.created_at)} />
        <Item label="Ref" value={leadRef || "—"} mono />
      </dl>

      {source.gclid ? (
        <p className="mt-2 truncate text-[11px] text-[#466254]/70">
          gclid: {source.gclid}
        </p>
      ) : null}
      {"gbraid" in source && source.gbraid ? (
        <p className="mt-1 truncate text-[11px] text-[#466254]/70">
          gbraid: {source.gbraid}
        </p>
      ) : null}
      {"wbraid" in source && source.wbraid ? (
        <p className="mt-1 truncate text-[11px] text-[#466254]/70">
          wbraid: {source.wbraid}
        </p>
      ) : null}
      {source.fbclid ? (
        <p className="mt-1 truncate text-[11px] text-[#466254]/70">
          fbclid: {source.fbclid}
        </p>
      ) : null}

      {leadRef ? (
        <Link
          href={`/admin/marketing?q=${encodeURIComponent(leadRef)}`}
          className="mt-3 inline-block text-xs font-semibold text-[#0b6b45]"
        >
          Reklam&apos;da aç →
        </Link>
      ) : (
        <Link
          href="/admin/marketing"
          className="mt-3 inline-block text-xs font-semibold text-[#0b6b45]"
        >
          Tüm kaynaklar →
        </Link>
      )}
    </div>
  );
}

function Item({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-[#466254]">{label}</dt>
      <dd className={`mt-0.5 text-[#123524] ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
