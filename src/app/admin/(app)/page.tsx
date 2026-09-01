import { Suspense } from "react";
import Link from "next/link";
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

export default async function AdminHomePage() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <div className="space-y-8">
        <Header email={null} counts={null} />
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
        <QuickLinks />
      </div>
    );
  }

  const session = await requireAdminSession();

  return (
    <div className="space-y-8">
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
        <AdminHomeInsights />
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
      <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-3xl">
        Özet
      </h1>
      {countsLoading ? (
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      ) : counts ? (
        <p className="mt-2 text-sm text-[#466254]">
          Bugün: {counts.appointmentCount} randevu · {counts.newLeadCount} yeni
          hasta
          {email ? (
            <span className="hidden sm:inline"> · {email}</span>
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
    <div className="grid gap-3 sm:grid-cols-2">
      <QuickLink
        href="/admin/pipeline"
        title="Durum Panosu"
        desc="Dört durumun genel görünümü"
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
        href="/admin/marketing"
        title="Reklam performansı"
        desc="Google + Meta harcama, CPL, kampanya tablosu"
      />
      <QuickLink
        href="/admin/sources"
        title="Kaynaklar"
        desc="UTM, site ve kanal performansı"
      />
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
