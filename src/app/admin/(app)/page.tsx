import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    ]);

    leadCount = total ?? 0;
    newLeadCount = fresh ?? 0;
    patientCount = patients ?? 0;
    appointmentCount = appointments ?? 0;
    conversationCount = conversations ?? 0;
    contentCount = contents ?? 0;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight sm:text-3xl">
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
          desc="Metin, SEO ve görsel yönetimi"
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
    <div className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-4">
      <p className="text-sm text-[#466254]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold">
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
      className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-4 transition hover:border-[#0b6b45]/30"
    >
      <p className="font-semibold text-[#123524]">{title}</p>
      <p className="mt-1 text-sm text-[#466254]">{desc}</p>
    </Link>
  );
}
