#!/usr/bin/env node
/**
 * Tüm randevuları (appointments) siler.
 *
 *   npm run db:reset-appointments -- --dry-run   # sadece say
 *   npm run db:reset-appointments -- --confirm   # gerçekten sil
 *
 * - message_dispatches satırları CASCADE ile gider
 * - leads / contacts / WhatsApp mesajları DOKUNULMAZ
 * - Lead durumu (randevulu vb.) otomatik geri alınmaz
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm");

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

loadEnvLocal();

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik (.env.local).");
  process.exit(1);
}

if (!DRY_RUN && !CONFIRM) {
  console.error(`
Kullanım:
  npm run db:reset-appointments -- --dry-run    # kaç randevu var
  npm run db:reset-appointments -- --confirm    # hepsini sil

Uyarı: geri alınamaz. Lead / hasta / WhatsApp kayıtları kalır.
`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE = 500;

async function listAllAppointmentIds() {
  const ids = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("appointments")
      .select("id")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    ids.push(...data.map((row) => row.id));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

async function countDispatches() {
  const { count, error } = await admin
    .from("message_dispatches")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.warn("  (message_dispatches sayısı alınamadı:", error.message + ")");
    return null;
  }
  return count ?? 0;
}

console.log("\n=== Randevu sıfırlama ===\n");
console.log(`  Supabase: ${url}`);

const ids = await listAllAppointmentIds();
const dispatchCount = await countDispatches();

console.log(`  appointments: ${ids.length}`);
if (dispatchCount != null) {
  console.log(`  message_dispatches (CASCADE silinir): ${dispatchCount}`);
}

if (DRY_RUN) {
  console.log("\n  --dry-run: silinmedi.\n");
  process.exit(0);
}

if (ids.length === 0) {
  console.log("\n  Silinecek randevu yok.\n");
  process.exit(0);
}

let deleted = 0;
for (let i = 0; i < ids.length; i += PAGE) {
  const chunk = ids.slice(i, i + PAGE);
  const { error } = await admin.from("appointments").delete().in("id", chunk);
  if (error) {
    console.error(`\n  FAIL chunk ${i / PAGE + 1}: ${error.message}\n`);
    process.exit(1);
  }
  deleted += chunk.length;
  console.log(`  silindi ${deleted}/${ids.length}`);
}

console.log(`\n  Tamam: ${deleted} randevu silindi.\n`);
process.exit(0);
