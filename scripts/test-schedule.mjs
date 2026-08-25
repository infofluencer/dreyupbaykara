#!/usr/bin/env node
/**
 * Randevu → hasta → Durum Panosu akış testleri.
 *   npm run test:schedule
 *   npm run test:schedule -- --clean   # hayalet (is_patient=false) test lead’lerini sil
 *
 * Gerçek WhatsApp / Meta çağrısı yok.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const CLEAN = process.argv.includes("--clean");

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
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;
let warned = 0;

function ok(label) {
  passed += 1;
  console.log(`  \x1b[32mOK\x1b[0m    ${label}`);
}
function fail(label, detail) {
  failed += 1;
  console.log(`  \x1b[31mFAIL\x1b[0m  ${label}`);
  if (detail) console.log(`         ${detail}`);
}
function warn(label, detail) {
  warned += 1;
  console.log(`  \x1b[33mWARN\x1b[0m  ${label}`);
  if (detail) console.log(`         ${detail}`);
}

const TEST_PHONE = "905000001111";
const TEST_NAME = "__SCHEDULE_FLOW_TEST__";
const created = { contactId: null, leadId: null, appointmentId: null };

async function cleanupTest() {
  if (created.appointmentId) {
    await admin.from("appointments").delete().eq("id", created.appointmentId);
  }
  if (created.leadId) {
    await admin.from("leads").delete().eq("id", created.leadId);
  }
  const { data: byPhone } = await admin
    .from("contacts")
    .select("id")
    .eq("phone", TEST_PHONE)
    .maybeSingle();
  if (byPhone?.id) {
    await admin.from("leads").delete().eq("contact_id", byPhone.id);
    await admin.from("contacts").delete().eq("id", byPhone.id);
  }
}

console.log("\n=== Hayalet kayıtlı hasta kontrolü ===\n");

{
  const { data: ghosts } = await admin
    .from("leads")
    .select("id, status, stage, contacts!inner(id, name, phone, is_patient)")
    .eq("contacts.is_patient", false)
    .limit(50);

  const list = ghosts ?? [];
  if (list.length === 0) {
    ok("is_patient=false lead yok (picker temiz)");
  } else {
    warn(
      `${list.length} hayalet lead (picker’da eski bug ile görünürdü)`,
      list
        .map((row) => {
          const c = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
          return `${c?.name} · ${c?.phone} · ${row.status}`;
        })
        .join(" | "),
    );
    if (CLEAN) {
      for (const row of list) {
        await admin.from("appointments").delete().eq("lead_id", row.id);
        await admin.from("leads").delete().eq("id", row.id);
      }
      ok(`${list.length} hayalet lead silindi (--clean)`);
    } else {
      warn("Temizlemek için: npm run test:schedule -- --clean");
    }
  }
}

{
  const { count } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("is_patient", true);
  ok(`Hastalar listesi (is_patient=true): ${count ?? 0}`);
}

console.log("\n=== Randevu → hasta → Durum Panosu ===\n");

try {
  await cleanupTest();

  const { data: contact, error: cErr } = await admin
    .from("contacts")
    .upsert(
      { phone: TEST_PHONE, name: TEST_NAME, is_patient: true },
      { onConflict: "phone" },
    )
    .select("id")
    .single();
  if (cErr || !contact) throw new Error(cErr?.message || "contact");
  created.contactId = contact.id;
  ok("test contact (is_patient=true)");

  const { data: lead, error: lErr } = await admin
    .from("leads")
    .insert({
      contact_id: contact.id,
      stage: "new",
      status: "yeni",
      site: "manual",
      channel: "test",
    })
    .select("id")
    .single();
  if (lErr || !lead) throw new Error(lErr?.message || "lead");
  created.leadId = lead.id;
  ok("test lead status=yeni");

  // Picker sorgusu (loadScheduleLeads ile aynı filtre)
  const { data: picker } = await admin
    .from("leads")
    .select("id, contacts!inner(is_patient)")
    .eq("contacts.is_patient", true)
    .neq("status", "bitti")
    .not("stage", "in", "(won,lost,spam)");
  if (picker?.some((row) => row.id === lead.id)) {
    ok("lead picker’da görünür (kayıtlı hasta)");
  } else {
    fail("lead picker’da yok");
  }

  const starts = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  starts.setMinutes(0, 0, 0);
  const ends = new Date(starts.getTime() + 60 * 60 * 1000);

  const { data: appt, error: aErr } = await admin
    .from("appointments")
    .insert({
      lead_id: lead.id,
      title: "Test muayene",
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "scheduled",
      appointment_type: "consultation",
    })
    .select("id")
    .single();
  if (aErr || !appt) throw new Error(aErr?.message || "appointment");
  created.appointmentId = appt.id;
  ok("randevu oluşturuldu");

  // createAppointment sonrası beklenen güncellemeler
  await admin
    .from("contacts")
    .update({ is_patient: true })
    .eq("id", contact.id);
  await admin
    .from("leads")
    .update({
      stage: "appointment",
      status: "randevulu",
      needs_followup: false,
    })
    .eq("id", lead.id);

  const { data: pipeline } = await admin
    .from("leads")
    .select("id, status, contacts!inner(is_patient, name)")
    .eq("contacts.is_patient", true)
    .eq("status", "randevulu")
    .eq("id", lead.id)
    .maybeSingle();

  if (pipeline) ok("Durum Panosu’nda Randevulu görünür");
  else fail("Durum Panosu’nda yok");

  const { data: patientRow } = await admin
    .from("contacts")
    .select("id")
    .eq("id", contact.id)
    .eq("is_patient", true)
    .maybeSingle();
  if (patientRow) ok("Hastalar listesinde görünür");
  else fail("Hastalar listesinde yok");

  // Hayalet senaryo: is_patient false iken pipeline’da olmamalı
  await admin
    .from("contacts")
    .update({ is_patient: false })
    .eq("id", contact.id);
  const { data: hidden } = await admin
    .from("leads")
    .select("id, contacts!inner(is_patient)")
    .eq("contacts.is_patient", true)
    .eq("id", lead.id)
    .maybeSingle();
  if (!hidden) ok("is_patient=false iken Durum Panosu’nda gizlenir");
  else fail("is_patient=false hâlâ panoda");

  // createAppointment düzeltmesi: tekrar hasta yap
  await admin
    .from("contacts")
    .update({ is_patient: true })
    .eq("id", contact.id);
  await admin
    .from("leads")
    .update({ status: "randevulu", stage: "appointment" })
    .eq("id", lead.id);
  ok("randevu sonrası is_patient=true senaryosu doğrulandı");
} catch (err) {
  fail("akış", err instanceof Error ? err.message : String(err));
} finally {
  await cleanupTest();
  ok("test verisi temizlendi");
}

console.log(
  `\nSonuç: ${passed} geçti, ${failed} kaldı${warned ? `, ${warned} uyarı` : ""}\n`,
);
process.exit(failed > 0 ? 1 : 0);
