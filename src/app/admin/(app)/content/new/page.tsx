import Link from "next/link";
import { ContentPageForm } from "@/components/admin/ContentPageForm";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewContentPage() {
  await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const { data: mediaAssets } = await supabase
    .from("media_assets")
    .select("object_path, file_name")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/content"
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← İçerikler
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Yeni içerik
        </h1>
      </div>
      <div className="rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7">
        <ContentPageForm mediaAssets={mediaAssets ?? []} />
      </div>
    </div>
  );
}

