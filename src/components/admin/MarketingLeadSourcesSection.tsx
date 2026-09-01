import Link from "next/link";
import {
  ClipboardList,
  Globe,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Search,
  Share2,
  X,
} from "lucide-react";
import {
  EVENT_LABEL,
  PLATFORM_LABEL,
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";
import { formatDateTimeTr } from "@/lib/date/tr";
import { loadClassifiedLeadSources } from "@/lib/marketing/lead-sources";
import { buildMarketingHref } from "@/lib/marketing/urls";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

type PlatformFilter = "all" | AdPlatform;
type EventFilter = "all" | SourceEvent;

const PLATFORM_META: Record<
  AdPlatform,
  { hint: string; icon: typeof Megaphone; card: string; active: string }
> = {
  google_ads: {
    hint: "gclid / gbraid / google UTM",
    icon: MousePointerClick,
    card: "border-[#c5d8fc] bg-[#f3f7ff]",
    active: "border-[#1a56db] bg-[#e8f0fe] ring-2 ring-[#1a56db]/25",
  },
  meta: {
    hint: "Facebook & Instagram",
    icon: Share2,
    card: "border-[#ddd6fe] bg-[#f6f3ff]",
    active: "border-[#5b21b6] bg-[#ebe4ff] ring-2 ring-[#5b21b6]/20",
  },
  other: {
    hint: "Diğer kampanyalar",
    icon: Megaphone,
    card: "border-[#fed7aa] bg-[#fff8f0]",
    active: "border-[#9a3412] bg-[#fff4e5] ring-2 ring-[#9a3412]/15",
  },
  organic: {
    hint: "Reklamsız giriş",
    icon: Globe,
    card: "border-[#123524]/10 bg-white",
    active: "border-[#0b6b45] bg-[#e7f5ed] ring-2 ring-[#0b6b45]/20",
  },
};

const EVENT_META: Record<
  SourceEvent,
  { hint: string; icon: typeof MessageCircle }
> = {
  landing: { hint: "Siteye indi", icon: MousePointerClick },
  whatsapp: { hint: "Sohbete geçti", icon: MessageCircle },
  form: { hint: "Form gönderdi", icon: ClipboardList },
};

const PLATFORM_BADGE: Record<AdPlatform, string> = {
  google_ads: "bg-[#e8f0fe] text-[#1a56db]",
  meta: "bg-[#ebe4ff] text-[#5b21b6]",
  other: "bg-[#fff4e5] text-[#9a3412]",
  organic: "bg-[#f4f6f5] text-[#466254]",
};

const EVENT_BADGE: Record<SourceEvent, string> = {
  landing: "bg-[#e7f5ed] text-[#0b6b45]",
  whatsapp: "bg-[#dcfce7] text-[#166534]",
  form: "bg-[#e0f2fe] text-[#075985]",
};

export async function MarketingLeadSourcesSection({
  startDate,
  endDate,
  siteFilter,
  platform,
  event,
  search,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  platform: PlatformFilter;
  event: EventFilter;
  search: string;
}) {
  const { classified, error } = await loadClassifiedLeadSources(siteFilter);

  const platformCounts = {
    google_ads: classified.filter((row) => row.platform === "google_ads").length,
    meta: classified.filter((row) => row.platform === "meta").length,
    other: classified.filter((row) => row.platform === "other").length,
    organic: classified.filter((row) => row.platform === "organic").length,
  };

  const inPlatform =
    platform === "all"
      ? classified
      : classified.filter((row) => row.platform === platform);

  const eventCounts = {
    all: inPlatform.length,
    landing: inPlatform.filter((row) => row.sourceEvent === "landing").length,
    whatsapp: inPlatform.filter((row) => row.sourceEvent === "whatsapp").length,
    form: inPlatform.filter((row) => row.sourceEvent === "form").length,
  };

  const needle = search.toLocaleLowerCase("tr");
  const visible = inPlatform.filter((row) => {
    if (event !== "all" && row.sourceEvent !== event) return false;
    if (!needle) return true;
    const haystack = [
      row.lead_ref,
      row.utm_source,
      row.utm_medium,
      row.utm_campaign,
      row.campaign,
      row.page_path,
      row.channel,
      row.gclid,
      row.fbclid,
      row.gbraid,
      row.wbraid,
      row.msclkid,
      row.ttclid,
      row.site,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr");
    return haystack.includes(needle);
  });

  const baseHref = {
    start: startDate,
    end: endDate,
    site: siteFilter ?? undefined,
  };

  const hasFilter =
    platform !== "all" || event !== "all" || Boolean(search) || Boolean(siteFilter);
  const filterLabel = [
    siteFilter || null,
    platform === "all" ? null : PLATFORM_LABEL[platform],
    event === "all" ? null : EVENT_LABEL[event],
    search ? `“${search}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Tıklama kayıtları
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Reklamdan mı organik mi? Landing, WhatsApp veya form — son 200 kayıt.
          {siteFilter ? ` Site: ${siteFilter}.` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLATFORMS.map((id) => {
          const meta = PLATFORM_META[id];
          const Icon = meta.icon;
          const active = platform === id;
          return (
            <Link
              key={id}
              href={buildMarketingHref({
                ...baseHref,
                platform: active ? "all" : id,
                event,
                q: search,
              })}
              className={`rounded-2xl border px-4 py-4 transition ${
                active ? meta.active : meta.card
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#123524]">
                    {PLATFORM_LABEL[id]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#466254]/80">
                    {meta.hint}
                  </p>
                </div>
                <Icon className="h-4 w-4 shrink-0 text-[#466254]/70" />
              </div>
              <p className="mt-3 font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tabular-nums text-[#123524]">
                {platformCounts[id]}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-[#466254] uppercase">
              Ne yaptı?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildMarketingHref({
                  ...baseHref,
                  platform,
                  event: "all",
                  q: search,
                })}
                className={eventChip(event === "all")}
              >
                Tümü
                <span className="tabular-nums opacity-70">{eventCounts.all}</span>
              </Link>
              {EVENTS.map((id) => {
                const Icon = EVENT_META[id].icon;
                return (
                  <Link
                    key={id}
                    href={buildMarketingHref({
                      ...baseHref,
                      platform,
                      event: event === id ? "all" : id,
                      q: search,
                    })}
                    className={eventChip(event === id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {EVENT_LABEL[id]}
                    <span className="tabular-nums opacity-70">
                      {eventCounts[id]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <form
            action="/admin/marketing"
            className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-80"
          >
            <input type="hidden" name="start" value={startDate} />
            <input type="hidden" name="end" value={endDate} />
            {siteFilter ? (
              <input type="hidden" name="site" value={siteFilter} />
            ) : null}
            {platform !== "all" ? (
              <input type="hidden" name="platform" value={platform} />
            ) : null}
            {event !== "all" ? (
              <input type="hidden" name="event" value={event} />
            ) : null}
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#466254]/50" />
              <input
                name="q"
                defaultValue={search}
                placeholder="Ref, kampanya, sayfa…"
                className="min-h-11 w-full rounded-xl border border-[#123524]/12 bg-[#f7f9f8] py-2.5 pr-3 pl-10 text-base outline-none focus:border-[#0b6b45]/40 focus:bg-white sm:text-sm"
              />
            </label>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white sm:shrink-0">
              Ara
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#123524]/08 pt-3 text-sm">
          <p className="text-[#466254]">
            <span className="font-semibold text-[#123524] tabular-nums">
              {visible.length}
            </span>{" "}
            kayıt
            {filterLabel ? (
              <span className="text-[#466254]/80"> · {filterLabel}</span>
            ) : null}
          </p>
          {hasFilter ? (
            <Link
              href={buildMarketingHref({ start: startDate, end: endDate })}
              className="inline-flex items-center gap-1 rounded-full border border-[#123524]/12 px-3 py-1 text-xs font-semibold text-[#466254]"
            >
              <X className="h-3 w-3" />
              Filtreyi temizle
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Liste alınamadı: {error.message}
        </p>
      ) : !visible.length ? (
        <p className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-10 text-center text-sm text-[#466254]">
          Bu filtrede kayıt yok.
        </p>
      ) : (
        <div className="hidden overflow-x-auto rounded-2xl border border-[#123524]/08 bg-white sm:block">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-[#123524]/08 bg-[#f7f9f8] text-[#466254]">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Olay</th>
                <th className="px-4 py-3 font-medium">Kampanya</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#123524]/06 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {row.lead_ref}
                    {row.matched_lead_id ? (
                      <span className="ml-2 font-sans text-[10px] font-medium text-[#0b6b45]">
                        eşleşti
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">{row.site || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[row.platform]}`}
                    >
                      {PLATFORM_LABEL[row.platform]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${EVENT_BADGE[row.sourceEvent]}`}
                    >
                      {EVENT_LABEL[row.sourceEvent]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {row.utm_campaign || row.campaign || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#466254]">
                    {formatDateTimeTr(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function eventChip(active: boolean) {
  return `inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
    active
      ? "bg-[#123524] text-white"
      : "border border-[#123524]/12 bg-[#f7f9f8] text-[#466254] hover:border-[#123524]/25 hover:bg-white"
  }`;
}
