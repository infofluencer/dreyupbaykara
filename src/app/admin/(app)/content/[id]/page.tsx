import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteContentSection,
  saveContentSection,
} from "@/app/admin/actions";
import { ContentPageForm } from "@/components/admin/ContentPageForm";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession(["admin", "editor", "agency"]);
  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: page },
    { data: sections },
    { data: revisions },
    { data: mediaAssets },
  ] =
    await Promise.all([
      supabase.from("content_pages").select("*").eq("id", id).single(),
      supabase
        .from("content_sections")
        .select("*")
        .eq("page_id", id)
        .order("sort_order"),
      supabase
        .from("content_revisions")
        .select("id, entity_type, created_at")
        .eq("page_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("media_assets")
        .select("object_path, file_name")
        .order("created_at", { ascending: false }),
    ]);

  if (!page) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/content"
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← İçerikler
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          {page.title}
        </h1>
        <p className="mt-1 text-sm text-[#466254]">{page.slug}</p>
      </div>

      <section className="rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7">
        <h2 className="mb-5 text-lg font-semibold">Sayfa bilgileri</h2>
        <ContentPageForm page={page} mediaAssets={mediaAssets ?? []} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">İçerik bölümleri</h2>
          <p className="mt-1 text-sm text-[#466254]">
            JSON içeriği, tasarımın tanıdığı güvenli alanlara dönüştürülür;
            script veya çalıştırılabilir HTML kabul edilmez.
          </p>
        </div>

        {sections?.map((section) => (
          <form
            key={section.id}
            action={saveContentSection}
            className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5"
          >
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="page_id" value={page.id} />
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Anahtar">
                <input
                  name="section_key"
                  required
                  defaultValue={section.section_key}
                  className={input}
                />
              </Field>
              <Field label="Bölüm türü">
                <input
                  name="section_type"
                  required
                  defaultValue={section.section_type}
                  className={input}
                />
              </Field>
              <Field label="Başlık">
                <input
                  name="title"
                  defaultValue={section.title ?? ""}
                  className={input}
                />
              </Field>
              <Field label="Sıra">
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={section.sort_order}
                  className={input}
                />
              </Field>
            </div>
            <Field label="İçerik (JSON)">
              <textarea
                name="content"
                rows={8}
                defaultValue={JSON.stringify(section.content, null, 2)}
                className={`${input} font-mono text-xs`}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="is_visible"
                type="checkbox"
                defaultChecked={section.is_visible}
              />
              Görünür
            </label>
            <div className="flex gap-3">
              <button className="rounded-full bg-[#0b6b45] px-5 py-2 text-sm font-semibold text-white">
                Bölümü kaydet
              </button>
              <button
                formAction={deleteContentSection}
                className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700"
              >
                Sil
              </button>
            </div>
          </form>
        ))}

        <form
          action={saveContentSection}
          className="space-y-4 rounded-2xl border border-dashed border-[#123524]/20 bg-white p-5"
        >
          <input type="hidden" name="page_id" value={page.id} />
          <h3 className="font-semibold">Yeni bölüm</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Anahtar">
              <input
                name="section_key"
                required
                placeholder="hero"
                className={input}
              />
            </Field>
            <Field label="Bölüm türü">
              <input
                name="section_type"
                required
                defaultValue="text"
                className={input}
              />
            </Field>
            <Field label="Başlık">
              <input name="title" className={input} />
            </Field>
            <Field label="Sıra">
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={input}
              />
            </Field>
          </div>
          <Field label="İçerik (JSON)">
            <textarea
              name="content"
              rows={6}
              defaultValue={'{\n  "text": ""\n}'}
              className={`${input} font-mono text-xs`}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="is_visible" type="checkbox" defaultChecked />
            Görünür
          </label>
          <button className="rounded-full bg-[#123524] px-5 py-2 text-sm font-semibold text-white">
            Bölüm ekle
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Son değişiklikler</h2>
        <div className="mt-3 rounded-2xl border border-[#123524]/10 bg-white">
          {!revisions?.length ? (
            <p className="p-5 text-sm text-[#466254]">Henüz revizyon yok.</p>
          ) : (
            revisions.map((revision) => (
              <div
                key={revision.id}
                className="border-b border-[#123524]/8 px-5 py-3 text-sm last:border-0"
              >
                {revision.entity_type === "page" ? "Sayfa" : "Bölüm"} ·{" "}
                {new Date(revision.created_at).toLocaleString("tr-TR")}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
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
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

