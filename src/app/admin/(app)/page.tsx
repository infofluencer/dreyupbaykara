import Link from "next/link";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
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
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

export default async function AdminHomePage() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let leadCount: number | null = null;
  let newLeadCount: number | null = null;
  let patientCount: number | null = null;
  let appointmentCount: number | null = null;
  let conversationCount: number | null = null;
  let contentCount: number | null = null;
  let userEmail: string | null = null;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      { count: total },
      { count: fresh },
      { count: patients },
      { count: appointments },
      { count: conversations },
      { count: contents },
      { data: sourceRows },
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
        .from("conversations")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("content_pages")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("lead_source_report")
        .select(
          "channel, utm_source, utm_medium, utm_campaign, campaign, gclid, fbclid",
        )
        .limit(5000),
    ]);

    leadCount = total ?? 0;
    newLeadCount = fresh ?? 0;
    patientCount = patients ?? 0;
    appointmentCount = appointments ?? 0;
    conversationCount = conversations ?? 0;
    contentCount = contents ?? 0;

    for (const row of sourceRows ?? []) {
      platformCounts[classifyAdPlatform(row)] += 1;
      eventCounts[classifySourceEvent(row.channel)] += 1;
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Hasta" value={String(patientCount ?? 0)} />
          <StatCard label="Toplam talep" value={String(leadCount ?? 0)} />
          <StatCard label="Yeni talep" value={String(newLeadCount ?? 0)} />
          <StatCard
            label="Bugünkü randevu"
            value={String(appointmentCount ?? 0)}
          />
          <StatCard
            label="Konuşma"
            value={String(conversationCount ?? 0)}
          />
          <StatCard label="İçerik" value={String(contentCount ?? 0)} />
        </div>
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
          href="/admin/inbox"
          title="WhatsApp gelen kutusu"
          desc="Mesajları görüntüle ve cevapla"
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
