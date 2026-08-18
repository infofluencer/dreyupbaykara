import Link from "next/link";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
import { TodayLeadWorklist } from "@/components/admin/TodayLeadWorklist";
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
import { asLeadStatus } from "@/lib/crm/lead-status";
import { loadTodayLeadWorklist } from "@/lib/crm/today-leads";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import { startOfWeekMonday } from "@/lib/date/tr";
import { isWhatsAppEnabled } from "@/lib/whatsapp/enabled";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

export default async function AdminHomePage() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const apiEnabled = isWhatsAppEnabled();

  let leadCount: number | null = null;
  let newLeadCount: number | null = null;
  let patientCount: number | null = null;
  let appointmentCount: number | null = null;
  let contentCount: number | null = null;
  let userEmail: string | null = null;
  let waOpen = 0;
  let waUnread = 0;
  let waTodayInbound = 0;
  let waAwaiting = 0;
  let weekNewLeads = 0;
  let convertedLeads = 0;
  const statusBar = { yeni: 0, randevulu: 0, donustu: 0, kayip: 0 };
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
    const weekStart = startOfWeekMonday(todayYmd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      { count: total },
      { count: fresh },
      { count: patients },
      { count: appointments },
      { count: contents },
      { data: sourceRows },
      { data: pipelineRows, error: pipelineError },
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("stage", "new"),
      supabase.from("contacts").select("*", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", today.toISOString())
        .lt("starts_at", tomorrow.toISOString())
        .neq("status", "cancelled"),
      supabase
        .from("content_pages")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("lead_source_report")
        .select(
          "channel, utm_source, utm_medium, utm_campaign, campaign, gclid, fbclid",
        )
        .limit(5000),
      supabase.from("leads").select("status, created_at").limit(5000),
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

    leadCount = total ?? 0;
    newLeadCount = fresh ?? 0;
    patientCount = patients ?? 0;
    appointmentCount = appointments ?? 0;
    contentCount = contents ?? 0;
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

    if (!pipelineError) {
      for (const row of pipelineRows ?? []) {
        const status = asLeadStatus(row.status);
        if (status === "yeni") statusBar.yeni += 1;
        if (status === "muayene_randevusu") statusBar.randevulu += 1;
        if (status === "donustu") {
          statusBar.donustu += 1;
          convertedLeads += 1;
        }
        if (status === "kayip" || status === "iptal") statusBar.kayip += 1;
        if (row.created_at) {
          const created = new Date(row.created_at).toLocaleDateString("en-CA", {
            timeZone: "Europe/Istanbul",
          });
          if (created >= weekStart) weekNewLeads += 1;
        }
      }
      try {
        todayWork = await loadTodayLeadWorklist(todayYmd);
      } catch {
        /* migration henüz yoksa özet yine açılsın */
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-3xl">
          Özet
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          {userEmail
            ? `Giriş: ${userEmail}`
            : "Supabase bağlandığında burada özet görünecek."}
        </p>
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Hasta" value={String(patientCount ?? 0)} />
            <StatCard label="Toplam talep" value={String(leadCount ?? 0)} />
            <StatCard label="Yeni talep" value={String(newLeadCount ?? 0)} />
            <StatCard
              label="Bugünkü randevu"
              value={String(appointmentCount ?? 0)}
            />
            <StatCard label="İçerik" value={String(contentCount ?? 0)} />
          </div>

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

          <div className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#0b6b45]">Talepler</p>
                <p className="mt-1 text-sm text-[#466254]">
                  Bu hafta {weekNewLeads} yeni · dönüşüm{" "}
                  {leadCount
                    ? Math.round((convertedLeads / leadCount) * 100)
                    : 0}
                  %
                </p>
              </div>
              <Link
                href="/admin/pipeline"
                className="text-sm font-semibold text-[#0b6b45]"
              >
                Listeye git →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Yeni", statusBar.yeni, "#0b6b45"],
                  ["Randevulu", statusBar.randevulu, "#1d4ed8"],
                  ["Dönüştü", statusBar.donustu, "#166534"],
                  ["Kayıp", statusBar.kayip, "#b91c1c"],
                ] as const
              ).map(([label, value, color]) => {
                const max = Math.max(
                  statusBar.yeni,
                  statusBar.randevulu,
                  statusBar.donustu,
                  statusBar.kayip,
                  1,
                );
                return (
                  <div key={label}>
                    <p className="text-xs text-[#466254]">{label}</p>
                    <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
                      {value}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4f6f5]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((value / max) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <TodayLeadWorklist
            yeni={todayWork.yeni}
            bugun={todayWork.bugun}
            geciken={todayWork.geciken}
          />
        </>
      )}

      {configured ? (
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#123524]/08 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-sm text-[#466254]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold sm:mt-2 sm:text-3xl">
        {value}
      </p>
    </div>
  );
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
