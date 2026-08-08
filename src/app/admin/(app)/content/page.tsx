import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  published: "Yayında",
  archived: "Arşiv",
};

export default async function AdminContentPage() {
  await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const { data: pages, error } = await supabase
    .from("content_pages")
    .select("id, slug, page_type, title, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
            Site içerikleri
          </h1>
          <p className="mt-2 text-sm text-[#466254]">
            Sayfa metinleri, SEO bilgileri ve görsel seçimleri.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/content/settings"
            className="rounded-full border border-[#0b6b45]/25 px-5 py-2.5 text-sm font-semibold text-[#0b6b45]"
          >
            Site ayarları
          </Link>
          <Link
            href="/admin/content/new"
            className="rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Yeni içerik
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
      ) : !pages?.length ? (
        <div className="rounded-2xl border border-dashed border-[#123524]/15 bg-white p-10 text-center">
          <p className="text-sm text-[#466254]">
            Henüz içerik kaydı yok. Mevcut site şu an statik veriyi kullanmaya
            devam ediyor.
          </p>
          <Link
            href="/admin/content/new"
            className="mt-4 inline-flex text-sm font-semibold text-[#0b6b45]"
          >
            İlk içeriği oluştur →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/admin/content/${page.id}`}
              className="flex items-center justify-between gap-4 border-b border-[#123524]/8 px-5 py-4 last:border-0 hover:bg-[#f7f9f8]"
            >
              <div>
                <p className="font-medium">{page.title}</p>
                <p className="mt-1 text-xs text-[#466254]">
                  {page.slug} · {page.page_type}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-[#e7f5ed] px-2.5 py-1 text-xs font-medium text-[#0b6b45]">
                  {STATUS_LABEL[page.status] ?? page.status}
                </span>
                <p className="mt-1 text-[11px] text-[#466254]">
                  {new Date(page.updated_at).toLocaleString("tr-TR")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

