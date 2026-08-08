import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import catalog from "../src/lib/cms/legacy-media.json" with { type: "json" };

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function mimeFromFileName(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    default:
      throw new Error(`Desteklenmeyen görsel türü: ${fileName}`);
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let uploaded = 0;
let linked = 0;
const failures = [];

for (const item of catalog.images) {
  const filePath = path.join(process.cwd(), "public", item.publicPath);
  let buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    failures.push(`${item.publicPath} bulunamadı`);
    continue;
  }

  const mime = mimeFromFileName(item.publicPath);
  const { error: uploadError } = await supabase.storage
    .from("site-media")
    .upload(item.objectPath, buffer, {
      contentType: mime,
      upsert: true,
    });
  if (uploadError) {
    failures.push(`${item.publicPath}: ${uploadError.message}`);
    continue;
  }

  const { error: metaError } = await supabase.from("media_assets").upsert(
    {
      bucket_id: "site-media",
      object_path: item.objectPath,
      file_name: item.publicPath.split("/").pop(),
      mime_type: mime,
      size_bytes: buffer.length,
      alt_text: item.alt,
    },
    { onConflict: "bucket_id,object_path" },
  );
  if (metaError) {
    failures.push(`${item.publicPath}: ${metaError.message}`);
    continue;
  }

  uploaded += 1;

  for (const slug of item.pageSlugs ?? []) {
    const { data, error } = await supabase
      .from("content_pages")
      .update({
        featured_image_path: item.objectPath,
        featured_image_alt: item.alt,
      })
      .eq("slug", slug)
      .is("featured_image_path", null)
      .select("id");
    if (error) {
      failures.push(`${slug}: ${error.message}`);
      continue;
    }
    linked += data?.length ?? 0;
  }
}

console.log(
  JSON.stringify({ uploaded, linked, failures }, null, 2),
);
if (failures.length) process.exitCode = 1;
