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
import { requireAdminSession } from "@/lib/admin/auth";
import {
  classifyAdPlatform,
  classifySourceEvent,
  EVENT_LABEL,
  PLATFORM_LABEL,
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";
import { formatDateTimeTr } from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

type PlatformFilter = "all" | AdPlatform;
type EventFilter = "all" | SourceEvent;

function sourcesHref(opts: {
  platform?: PlatformFilter;
  event?: EventFilter;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (opts.platform && opts.platform !== "all") {
    params.set("platform", opts.platform);
  }
  if (opts.event && opts.event !== "all") params.set("event", opts.event);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const query = params.toString();
  return query ? `/admin/sources?${query}` : "/admin/sources";
}

function parsePlatform(raw?: string): PlatformFilter {
  return PLATFORMS.includes(raw as AdPlatform) ? (raw as AdPlatform) : "all";
}

function parseEvent(raw?: string): EventFilter {
  return EVENTS.includes(raw as SourceEvent) ? (raw as SourceEvent) : "all";
}

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

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; event?: string; q?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant", "agency"]);
  const query = await searchParams;
  const platform = parsePlatform(query.platform);
  const event = parseEvent(query.event);
  const search = query.q?.trim() || "";

  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <p className="text-sm text-[#466254]">
        Supabase yapılandırılınca tıklama kayıtları burada listelenir.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("lead_source_report")
    .select(
      "id, lead_ref, site, page_path, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, gbraid, wbraid, msclkid, ttclid, matched_lead_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const classified = (rows ?? []).map((row) => ({
    ...row,
    platform: classifyAdPlatform(row),
    sourceEvent: classifySourceEvent(row.channel),
  }));

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
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr");
    return haystack.includes(needle);
  });

  const hasFilter = platform !== "all" || event !== "all" || Boolean(search);
  const filterLabel = [
    platform === "all" ? null : PLATFORM_LABEL[platform],
    event === "all" ? null : EVENT_LABEL[event],
    search ? `“${search}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
          Kaynaklar
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Reklamdan mı, organik mi geldi? Siteyi mi gördü, WhatsApp’a mı yazdı?
          Son 200 kayıt.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLATFORMS.map((id) => {
          const meta = PLATFORM_META[id];
          const Icon = meta.icon;
          const active = platform === id;
          return (
            <Link
              key={id}
              href={sourcesHref({
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
              <p className="mt-1 text-[11px] text-[#466254]/70">
                {active ? "Seçili · tekrar tıkla, kaldır" : "Filtrele"}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-[#466254] uppercase">
              Ne yaptı?
              {platform !== "all" ? ` · ${PLATFORM_LABEL[platform]}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={sourcesHref({ platform, event: "all", q: search })}
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
                    href={sourcesHref({
                      platform,
                      event: event === id ? "all" : id,
                      q: search,
                    })}
                    className={eventChip(event === id)}
                    title={EVENT_META[id].hint}
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
            action="/admin/sources"
            className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-80"
          >
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
            ) : (
              <span className="text-[#466254]/80"> · tümü</span>
            )}
          </p>
          {hasFilter ? (
            <Link
              href="/admin/sources"
              className="inline-flex items-center gap-1 rounded-full border border-[#123524]/12 px-3 py-1 text-xs font-semibold text-[#466254] hover:border-[#123524]/25"
            >
              <X className="h-3 w-3" />
              Filtreyi temizle
            </Link>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Liste alınamadı: {error.message}
        </p>
      ) : !classified.length ? (
        <p className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-10 text-center text-sm text-[#466254]">
          Henüz kayıt yok. Ads bağlanınca Google / Meta burada görünür; şimdilik
          siteden WhatsApp tıklamaları organik olarak düşer.
        </p>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-10 text-center">
          <p className="text-sm font-semibold text-[#123524]">
            Bu kombinasyonda kayıt yok
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#466254]">
            {platform !== "all" && event !== "all"
              ? `${PLATFORM_LABEL[platform]} + ${EVENT_LABEL[event]} henüz yok. Ads açılınca veya hasta WhatsApp’a basınca burada belirir.`
              : search
                ? "Arama ile eşleşen satır yok."
                : "Bu filtrede kayıt yok."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {platform !== "all" && platformCounts.organic > 0 ? (
              <Link
                href={sourcesHref({ platform: "organic", event: "all" })}
                className="rounded-full bg-[#e7f5ed] px-3 py-1.5 text-xs font-semibold text-[#0b6b45]"
              >
                Organik kayıtlara bak ({platformCounts.organic})
              </Link>
            ) : null}
            <Link
              href="/admin/sources"
              className="rounded-full border border-[#123524]/12 px-3 py-1.5 text-xs font-semibold text-[#466254]"
            >
              Tümünü göster
            </Link>
          </div>
        </div>
      ) : (
        <>
        <div className="space-y-3 sm:hidden">
          {visible.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-[#123524]/10 bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[row.platform]}`}
                >
                  {PLATFORM_LABEL[row.platform]}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${EVENT_BADGE[row.sourceEvent]}`}
                >
                  {EVENT_LABEL[row.sourceEvent]}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-[#123524]">
                {row.lead_ref}
                {row.matched_lead_id ? (
                  <span className="ml-2 font-sans text-[10px] font-medium text-[#0b6b45]">
                    eşleşti
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[#466254]">
                {row.utm_campaign || row.campaign || "Kampanya yok"}
              </p>
              <p className="mt-1 text-xs text-[#466254]/80">
                {row.page_path || "—"} · {formatDateTimeTr(row.created_at)}
              </p>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-[#123524]/08 bg-white sm:block">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-[#123524]/08 bg-[#f7f9f8] text-[#466254]">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Olay</th>
                <th className="px-4 py-3 font-medium">Kampanya</th>
                <th className="px-4 py-3 font-medium">Sayfa</th>
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLATFORM_BADGE[row.platform]}`}
                    >
                      {PLATFORM_LABEL[row.platform]}
                    </span>
                    <p className="mt-1 text-[11px] text-[#466254]/80">
                      {[row.utm_source, row.utm_medium]
                        .filter(Boolean)
                        .join(" / ") ||
                        row.site ||
                        "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${EVENT_BADGE[row.sourceEvent]}`}
                    >
                      {EVENT_LABEL[row.sourceEvent]}
                    </span>
                    {row.channel && row.channel !== "landing" ? (
                      <p className="mt-1 text-[11px] text-[#466254]/80">
                        {row.channel}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {row.utm_campaign || row.campaign || "—"}
                    {row.gclid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        gclid: {row.gclid}
                      </span>
                    ) : null}
                    {row.gbraid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        gbraid: {row.gbraid}
                      </span>
                    ) : null}
                    {row.wbraid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        wbraid: {row.wbraid}
                      </span>
                    ) : null}
                    {row.fbclid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        fbclid: {row.fbclid}
                      </span>
                    ) : null}
                    {row.msclkid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        msclkid: {row.msclkid}
                      </span>
                    ) : null}
                    {row.ttclid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        ttclid: {row.ttclid}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {row.page_path || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#466254]">
                    {formatDateTimeTr(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function eventChip(active: boolean) {
  return `inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
    active
      ? "bg-[#123524] text-white"
      : "border border-[#123524]/12 bg-[#f7f9f8] text-[#466254] hover:border-[#123524]/25 hover:bg-white"
  }`;
}
