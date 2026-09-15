import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Inbox,
  LineChart,
  ListTodo,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  AdminHomeInsights,
  AdminHomeInsightsFallback,
} from "@/components/admin/AdminHomeInsights";
import {
  AdminHomeWorklist,
  AdminHomeWorklistFallback,
} from "@/components/admin/AdminHomeWorklist";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import { requireAdminSession } from "@/lib/admin/auth";
import { loadAdminHomeHeaderCounts } from "@/lib/crm/admin-home-stats";
import { pickMarketingQueryParam } from "@/lib/marketing/date-range";

/** Mobilde daha sıkı dikey ritim + iOS home indicator payı. */
const PAGE_CLASS =
  "space-y-6 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:space-y-8";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <div className={PAGE_CLASS}>
        <Header email={null} counts={null} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 sm:px-5">
          <p className="font-semibold">Supabase henüz yapılandırılmadı</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Supabase’te proje oluşturun</li>
            <li>
              <code className="rounded bg-white/80 px-1">.env.example</code> →{" "}
              <code className="rounded bg-white/80 px-1">.env.local</code>{" "}
              kopyalayıp URL ve anon key girin
            </li>
            <li>
              <code className="inline-block max-w-full break-all rounded bg-white/80 px-1">
                supabase/migrations/20260807180000_crm_init.sql
              </code>{" "}
              dosyasını SQL Editor’da çalıştırın
            </li>
            <li>Authentication → Users’tan ilk kullanıcıyı ekleyin</li>
          </ol>
        </div>
        <QuickLinks />
      </div>
    );
  }

  const session = await requireAdminSession();
  const raw = await searchParams;
  const siteFilter = pickMarketingQueryParam(raw.site) || null;

  return (
    <div className={PAGE_CLASS}>
      <Suspense
        fallback={
          <Header
            email={session.email}
            counts={null}
            countsLoading
          />
        }
      >
        <HeaderWithCounts email={session.email} />
      </Suspense>

      <Suspense fallback={<AdminHomeWorklistFallback />}>
        <AdminHomeWorklist />
      </Suspense>

      <Suspense fallback={<AdminHomeInsightsFallback />}>
        <AdminHomeInsights siteFilter={siteFilter} />
      </Suspense>

      <QuickLinks />
    </div>
  );
}

async function HeaderWithCounts({ email }: { email: string | null }) {
  const counts = await loadAdminHomeHeaderCounts();
  return <Header email={email} counts={counts} />;
}

function Header({
  email,
  counts,
  countsLoading = false,
}: {
  email: string | null;
  counts: { appointmentCount: number; newLeadCount: number } | null;
  countsLoading?: boolean;
}) {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight sm:text-3xl">
        Özet
      </h1>
      {countsLoading ? (
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      ) : counts ? (
        <p className="mt-2 text-sm text-balance text-[#466254]">
          Bugün: {counts.appointmentCount} ameliyat · {counts.newLeadCount} yeni
          talep
          {email ? (
            <span className="hidden break-all sm:inline"> · {email}</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[#466254]">
          Supabase bağlandığında burada özet görünecek.
        </p>
      )}
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <QuickLink
        href="/admin/pipeline"
        icon={ListTodo}
        title="Durum Panosu"
        short="Durum Panosu"
        desc="Hastanın hangi aşamada olduğunun genel görünümü"
      />
      <QuickLink
        href="/admin/patients"
        icon={UserRound}
        title="Hastalar"
        short="Hastalar"
        desc="Hasta kimliği, notlar ve dosya"
      />
      <QuickLink
        href="/admin/leads"
        icon={CalendarDays}
        title="Ameliyat"
        short="Ameliyat"
        desc="Ameliyat ekle / sil, gün-ay-yıl planı"
      />
      <QuickLink
        href="/admin/messages"
        icon={Inbox}
        title="WhatsApp mesajları"
        short="WhatsApp"
        desc="Konuşmaları görüntüle ve cevapla"
      />
      <QuickLink
        href="/admin/content"
        icon={FileText}
        title="Site içerikleri"
        short="İçerik"
        desc="Section metinleri, medya ve iletişim ayarları"
      />
      <QuickLink
        href="/admin/marketing"
        icon={LineChart}
        title="Reklam"
        short="Reklam"
        desc="Harcama, CPL, kampanya ve tıklama kayıtları"
      />
    </div>
  );
}

/**
 * Mobilde ikon + kısa başlıklı 2'li eylem ızgarası, sm+ üstünde açıklamalı
 * kart. Açıklamalar dar ekranda 4-5 satıra taşıyordu.
 */
function QuickLink({
  href,
  icon: Icon,
  title,
  short,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  short: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 flex-col justify-center gap-2 rounded-2xl border border-[#123524]/08 bg-white px-3.5 py-3 transition active:border-[#0b6b45]/30 sm:min-h-16 sm:gap-0 sm:px-5 sm:py-4"
    >
      <Icon className="h-5 w-5 shrink-0 text-[#0b6b45] sm:hidden" aria-hidden />
      <p className="text-sm font-semibold text-[#123524] sm:text-base">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{title}</span>
      </p>
      <p className="mt-1 hidden text-sm text-[#466254] sm:block">{desc}</p>
    </Link>
  );
}
