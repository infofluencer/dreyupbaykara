import {
  deleteContentPage,
  saveContentPage,
} from "@/app/admin/actions";

type ContentPageValue = {
  id?: string;
  slug?: string;
  page_type?: string;
  title?: string;
  excerpt?: string | null;
  status?: string;
  featured_image_path?: string | null;
  featured_image_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
};

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

export function ContentPageForm({
  page,
  mediaAssets = [],
}: {
  page?: ContentPageValue;
  mediaAssets?: Array<{ object_path: string; file_name: string }>;
}) {
  return (
    <form action={saveContentPage} className="space-y-5">
      {page?.id ? <input type="hidden" name="id" value={page.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başlık">
          <input
            name="title"
            required
            defaultValue={page?.title}
            className={input}
          />
        </Field>
        <Field label="Sayfa yolu">
          <input
            name="slug"
            required
            defaultValue={page?.slug ?? "/"}
            placeholder="/hakkimizda"
            className={input}
          />
        </Field>
        <Field label="İçerik türü">
          <select
            name="page_type"
            defaultValue={page?.page_type ?? "page"}
            className={input}
          >
            <option value="page">Standart sayfa</option>
            <option value="home">Ana sayfa</option>
            <option value="treatment">Tedavi</option>
            <option value="blog">Blog</option>
            <option value="experience">Hasta deneyimi</option>
          </select>
        </Field>
        <Field label="Durum">
          <select
            name="status"
            defaultValue={page?.status ?? "draft"}
            className={input}
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
            <option value="archived">Arşiv</option>
          </select>
        </Field>
      </div>

      <Field label="Kısa açıklama">
        <textarea
          name="excerpt"
          rows={3}
          defaultValue={page?.excerpt ?? ""}
          className={input}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Öne çıkan görsel yolu">
          <select
            name="featured_image_path"
            defaultValue={page?.featured_image_path ?? ""}
            className={input}
          >
            <option value="">Görsel yok</option>
            {page?.featured_image_path &&
            !mediaAssets.some(
              (asset) => asset.object_path === page.featured_image_path,
            ) ? (
              <option value={page.featured_image_path}>
                {page.featured_image_path}
              </option>
            ) : null}
            {mediaAssets.map((asset) => (
              <option key={asset.object_path} value={asset.object_path}>
                {asset.file_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Görsel alternatif metni">
          <input
            name="featured_image_alt"
            defaultValue={page?.featured_image_alt ?? ""}
            className={input}
          />
        </Field>
        <Field label="SEO başlığı">
          <input
            name="seo_title"
            defaultValue={page?.seo_title ?? ""}
            maxLength={70}
            className={input}
          />
        </Field>
        <Field label="Canonical URL">
          <input
            name="canonical_url"
            defaultValue={page?.canonical_url ?? ""}
            className={input}
          />
        </Field>
      </div>

      <Field label="SEO açıklaması">
        <textarea
          name="seo_description"
          rows={3}
          maxLength={170}
          defaultValue={page?.seo_description ?? ""}
          className={input}
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b6b45] px-6 text-sm font-semibold text-white"
        >
          Kaydet
        </button>
        {page?.id ? (
          <button
            type="submit"
            formAction={deleteContentPage}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-5 text-sm font-semibold text-red-700"
          >
            Sayfayı sil
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-[#123524]">
      {label}
      {children}
    </label>
  );
}

