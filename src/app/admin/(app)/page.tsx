import Link from "next/link";
import {
  markLeadAppointmentStatus,
  markLeadContacted,
} from "@/app/admin/actions";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import type { TodayLeadRow } from "@/components/admin/TodayLeadWorklist";
import {
  classifyAdPlatform,
  classifySourceEvent,
  EVENT_COLOR,
  EVENT_LABEL,
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";
import { loadTodayLeadWorklist } from "@/lib/crm/today-leads";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import { isWhatsAppEnabled } from "@/lib/whatsapp/enabled";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

export default async function AdminHomePage() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const apiEnabled = isWhatsAppEnabled();

  let newLeadCount = 0;
  let appointmentCount = 0;
  let userEmail: string | null = null;
  let waOpen = 0;
  let waUnread = 0;
  let waTodayInbound = 0;
  let waAwaiting = 0;
  let todayWork = { yeni: [], bugun: [], geciken: [] } as Awaited<
    ReturnType<typeof loadTodayLeadWorklist>
  >;
  const platformCounts: Record<AdPlatform, number> = {
    google_ads: 0,
    meta: 0,
    other: 0,
    organic: 0,
  };
  const eventCounts: Record<SourceEvent, number> = {
    landing: 0,
    whatsapp: 0,
    form: 0,
  };

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    const todayYmd = await getIstanbulTodayYmd();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      { count: fresh },
      { count: appointments },
      { data: sourceRows },
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("stage", "new"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", today.toISOString())
        .lt("starts_at", tomorrow.toISOString())
        .neq("status", "cancelled"),
      supabase
        .from("lead_source_report")
        .select(
          "channel, utm_source, utm_medium, utm_campaign, campaign, gclid, fbclid",
        )
        .limit(5000),
    ]);

    const waStats = await Promise.all([
      supabase
        .from("conversations")
        .select("status, unread_count, last_message_direction")
        .limit(2000),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("direction", "inbound")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString()),
    ]);
    const [{ data: waRows }, { count: todayInbound }] = waStats;

    newLeadCount = fresh ?? 0;
    appointmentCount = appointments ?? 0;
    waTodayInbound = todayInbound ?? 0;

    for (const row of waRows ?? []) {
      if (row.status === "open") waOpen += 1;
      waUnread += Number(row.unread_count ?? 0);
      if (
        row.status === "open" &&
        row.last_message_direction === "inbound"
      ) {
        waAwaiting += 1;
      }
    }

    for (const row of sourceRows ?? []) {
      platformCounts[classifyAdPlatform(row)] += 1;
      eventCounts[classifySourceEvent(row.channel)] += 1;
    }

    try {
      todayWork = await loadTodayLeadWorklist(todayYmd);
    } catch {
      /* migration henüz yoksa özet yine açılsın */
    }
  }

  const callList = mergeTodayCalls(todayWork);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-3xl">
          Özet
        </h1>
        {configured ? (
          <p className="mt-2 text-sm text-[#466254]">
            Bugün: {appointmentCount} randevu · {newLeadCount} yeni talep
            {userEmail ? (
              <span className="hidden sm:inline"> · {userEmail}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#466254]">
            Supabase bağlandığında burada özet görünecek.
          </p>
        )}
      </div>

      {!configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Supabase henüz yapılandırılmadı</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Supabase’te proje oluşturun</li>
            <li>
              <code className="rounded bg-white/80 px-1">.env.example</code> →{" "}
              <code className="rounded bg-white/80 px-1">.env.local</code>{" "}
              kopyalayıp URL ve anon key girin
            </li>
            <li>
              <code className="rounded bg-white/80 px-1">
                supabase/migrations/20260807180000_crm_init.sql
              </code>{" "}
              dosyasını SQL Editor’da çalıştırın
            </li>
            <li>Authentication → Users’tan ilk kullanıcıyı ekleyin</li>
          </ol>
        </div>
      ) : (
        <section className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
                Bugün aranacaklar
              </h2>
              <p className="mt-1 text-sm text-[#466254]">
                Gecikenler üstte. Ara veya randevu olarak işaretleyin.
              </p>
            </div>
            <Link
              href="/admin/pipeline"
              className="text-sm font-semibold text-[#0b6b45]"
            >
              Tüm talepler →
            </Link>
          </div>
          {!callList.length ? (
            <p className="mt-8 pb-2 text-center text-sm text-[#466254]">
              Bugün aranacak kimse yok 👍
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#123524]/08">
              {callList.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/pipeline?lead=${row.id}`}
                        className="font-semibold text-[#123524] hover:text-[#0b6b45]"
                      >
                        {row.contact_name || row.phone || "İsimsiz"}
                      </Link>
                      <LeadStatusBadge status={row.status} />
                      {row.delayed ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          Gecikmiş
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-[#466254]">
                      {row.phone}
                      {row.next_action_note ? ` · ${row.next_action_note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <form action={markLeadContacted}>
                      <input type="hidden" name="lead_id" value={row.id} />
                      <button className="rounded-full bg-[#0b6b45] px-3 py-1.5 text-xs font-semibold text-white">
                        Ara / işaretle
                      </button>
                    </form>
                    <form action={markLeadAppointmentStatus}>
                      <input type="hidden" name="lead_id" value={row.id} />
                      <button className="rounded-full border border-[#0b6b45]/25 px-3 py-1.5 text-xs font-semibold text-[#0b6b45]">
                        Randevu ver
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {configured ? (
        <>
          <Link
            href="/admin/messages"
            className="relative block rounded-2xl border border-[#123524]/08 bg-white px-5 py-5 transition active:border-[#0b6b45]/30"
          >
            {!apiEnabled ? (
              <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
                API bağlı değil
              </span>
            ) : null}
            <p className="text-sm font-semibold text-[#0b6b45]">WhatsApp</p>
            <p className="mt-1 text-sm text-[#466254]">
              Gelen kutusu özeti — tıklayınca mesajlara gidin
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Açık konuşma" value={waOpen} />
              <MiniStat label="Okunmamış" value={waUnread} />
              <MiniStat label="Bugün gelen" value={waTodayInbound} />
              <MiniStat label="Yanıt bekleyen" value={waAwaiting} />
            </div>
          </Link>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminSourcePie
              title="Kaynaklar"
              hint="Reklam / organik dağılım"
              totalLabel="kayıt"
              href="/admin/sources"
              slices={PLATFORMS.map((id) => ({
                id,
                label: PLATFORM_LABEL[id],
                value: platformCounts[id],
                color: PLATFORM_COLOR[id],
                href: `/admin/sources?platform=${id}`,
              }))}
            />
            <AdminSourcePie
              title="Ne yaptı?"
              hint="Site, WhatsApp veya form"
              totalLabel="kayıt"
              href="/admin/sources"
              slices={EVENTS.map((id) => ({
                id,
                label: EVENT_LABEL[id],
                value: eventCounts[id],
                color: EVENT_COLOR[id],
                href: `/admin/sources?event=${id}`,
              }))}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          href="/admin/pipeline"
          title="Talepler"
          desc="Durum takibi, bugün aranacaklar"
        />
        <QuickLink
          href="/admin/patients"
          title="Hastalar"
          desc="Hasta kimliği, notlar ve dosya"
        />
        <QuickLink
          href="/admin/leads"
          title="Takvim"
          desc="Randevu ekle / sil, gün-ay-yıl planı"
        />
        <QuickLink
          href="/admin/messages"
          title="WhatsApp mesajları"
          desc="Konuşmaları görüntüle ve cevapla"
        />
        <QuickLink
          href="/admin/content"
          title="Site içerikleri"
          desc="Section metinleri, medya ve iletişim ayarları"
        />
        <QuickLink
          href="/admin/sources"
          title="Kaynaklar"
          desc="UTM, site ve kanal performansı"
        />
      </div>
    </div>
  );
}

function mergeTodayCalls(todayWork: {
  yeni: TodayLeadRow[];
  bugun: TodayLeadRow[];
  geciken: TodayLeadRow[];
}) {
  const seen = new Set<string>();
  const list: Array<TodayLeadRow & { delayed?: boolean }> = [];
  for (const row of todayWork.geciken) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push({ ...row, delayed: true });
  }
  for (const row of todayWork.bugun) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push(row);
  }
  for (const row of todayWork.yeni) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push(row);
  }
  return list;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-[#466254]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold text-[#123524]">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 flex-col justify-center rounded-2xl border border-[#123524]/08 bg-white px-4 py-4 transition active:border-[#0b6b45]/30 sm:px-5"
    >
      <p className="font-semibold text-[#123524]">{title}</p>
      <p className="mt-1 text-sm text-[#466254]">{desc}</p>
    </Link>
  );
}
