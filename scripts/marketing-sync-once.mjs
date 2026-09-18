#!/usr/bin/env node
/**
 * Lokal Meta/Google marketing sync (cron endpoint olmadan).
 *
 *   node --experimental-strip-types scripts/marketing-sync-once.mjs
 *   DAYS=7 node --experimental-strip-types scripts/marketing-sync-once.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

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

const days = Number(process.env.DAYS || "14");
if (!Number.isFinite(days) || days < 1) {
  console.error("DAYS geçerli bir sayı olmalı");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`[marketing-sync] son ${days} gün çekiliyor…`);
const started = Date.now();

const { runMarketingSync } = await import(
  "../src/lib/marketing/sync/sync-daily-stats.ts"
);

const result = await runMarketingSync(supabase, { mode: "full", days });
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

console.log(JSON.stringify({ ok: true, elapsedSec: elapsed, ...result }, null, 2));
