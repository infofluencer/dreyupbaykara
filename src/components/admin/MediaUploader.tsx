"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const altText = String(formData.get("alt_text") ?? "").trim();

    if (!(file instanceof File) || !file.size) {
      setMessage("Bir görsel seçin.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage("JPEG, PNG, WebP, AVIF veya GIF yükleyebilirsiniz.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Dosya 10 MB’dan küçük olmalıdır.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const safeName = file.name
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9.-]+/g, "-");
    const objectPath = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("site-media")
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setBusy(false);
      setMessage(uploadError.message);
      return;
    }

    const { error: metadataError } = await supabase
      .from("media_assets")
      .insert({
        bucket_id: "site-media",
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: altText || null,
        uploaded_by: user?.id ?? null,
      });

    if (metadataError) {
      await supabase.storage.from("site-media").remove([objectPath]);
      setBusy(false);
      setMessage(metadataError.message);
      return;
    }

    form.reset();
    setBusy(false);
    setMessage("Görsel yüklendi.");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <label className="block text-sm font-medium">
        Görsel
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          required
          className="mt-1.5 block w-full text-sm text-[#466254] file:mr-3 file:rounded-full file:border-0 file:bg-[#e7f5ed] file:px-4 file:py-2 file:font-semibold file:text-[#0b6b45]"
        />
      </label>
      <label className="block text-sm font-medium">
        Alternatif metin
        <input
          name="alt_text"
          className="mt-1.5 w-full rounded-xl border border-[#123524]/15 px-3 py-2.5 outline-none focus:border-[#0b6b45]"
          placeholder="Görseli kısa biçimde tarif edin"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Yükleniyor…" : "Yükle"}
      </button>
      {message ? (
        <p className="text-sm text-[#466254] sm:col-span-3">{message}</p>
      ) : null}
    </form>
  );
}

