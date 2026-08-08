import { deleteMediaAsset, importExistingSiteMedia } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    linked?: string;
    failed?: string;
  }>;
}) {
  await requireAdminSession(["admin", "editor", "agency"]);
  const query = await searchParams;
  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Medya
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Site görsellerini yükleyin; içerik formunda görsel yolunu kullanın.
        </p>
      </div>

      {query.imported ? (
        <p className="rounded-xl border border-[#0b6b45]/15 bg-[#e7f5ed] px-4 py-3 text-sm text-[#24543e]">
          {query.imported} görsel medya kütüphanesine aktarıldı
          {query.linked ? `, ${query.linked} sayfaya bağlandı` : ""}.
          {query.failed && query.failed !== "0"
            ? ` ${query.failed} dosya aktarılamadı.`
            : ""}
        </p>
      ) : null}

      <form
        action={importExistingSiteMedia}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#123524]/10 bg-white p-5"
      >
        <div>
          <p className="font-semibold">Mevcut site görselleri</p>
          <p className="mt-1 text-sm text-[#466254]">
            Sitede kullanılan tedavi, doktor ve hasta görsellerini medya
            kütüphanesine taşır.
          </p>
        </div>
        <button className="rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white">
          Var olan fotoğrafları aktar
        </button>
      </form>

      <MediaUploader />

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
      ) : !assets?.length ? (
        <p className="rounded-2xl border border-dashed border-[#123524]/15 bg-white p-10 text-center text-sm text-[#466254]">
          Henüz görsel yüklenmedi.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const { data } = supabase.storage
              .from(asset.bucket_id)
              .getPublicUrl(asset.object_path);
            return (
              <article
                key={asset.id}
                className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.publicUrl}
                  alt={asset.alt_text || ""}
                  className="aspect-video w-full bg-[#f4f6f5] object-cover"
                />
                <div className="space-y-2 p-4">
                  <p className="truncate text-sm font-semibold">
                    {asset.file_name}
                  </p>
                  <p className="break-all font-mono text-[10px] text-[#466254]">
                    {asset.object_path}
                  </p>
                  <p className="text-xs text-[#466254]">
                    {asset.alt_text || "Alternatif metin yok"}
                  </p>
                  <form action={deleteMediaAsset}>
                    <input type="hidden" name="id" value={asset.id} />
                    <input
                      type="hidden"
                      name="object_path"
                      value={asset.object_path}
                    />
                    <button className="text-xs font-semibold text-red-700">
                      Sil
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

