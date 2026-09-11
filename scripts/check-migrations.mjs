#!/usr/bin/env node
/**
 * Canlı Supabase'de durum taşıma + mesaj sistemi için gereken şema
 * değişikliklerinin uygulanıp uygulanmadığını doğrular.
 *
 *   npm run db:check
 *
 * Geçici test kaydı oluşturur ve sonunda siler. Mesaj göndermez.
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
const todo = [];

const ok = (label) => {
  passed += 1;
  console.log(`  \x1b[32mOK\x1b[0m    ${label}`);
};
const fail = (label, migration, detail) => {
  failed += 1;
  console.log(`  \x1b[31mEKSİK\x1b[0m ${label}`);
  if (detail) console.log(`         ${detail}`);
  if (migration && !todo.includes(migration)) todo.push(migration);
};

const TEST_PHONE = "905000000199";
const created = {};

async function cleanup() {
  if (created.appointmentId) {
    await admin
      .from("message_dispatches")
      .delete()
      .eq("appointment_id", created.appointmentId);
    await admin.from("appointments").delete().eq("id", created.appointmentId);
  }
  if (created.leadId) {
    await admin.from("lead_status_history").delete().eq("lead_id", created.leadId);
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

console.log("\n=== Migration durumu (canlı Supabase) ===\n");

try {
  await cleanup();

  const { data: contact, error: cErr } = await admin
    .from("contacts")
    .upsert(
      { phone: TEST_PHONE, name: "ZZ Migration Test", is_patient: true },
      { onConflict: "phone" },
    )
    .select("id")
    .single();
  if (cErr) throw new Error(`contact: ${cErr.message}`);
  created.contactId = contact.id;

  const { data: lead, error: lErr } = await admin
    .from("leads")
    .insert({
      contact_id: contact.id,
      stage: "new",
      status: "yeni",
      site: "manual",
      channel: "migration-check",
    })
    .select("id")
    .single();
  if (lErr) throw new Error(`lead: ${lErr.message}`);
  created.leadId = lead.id;

  // ── 1) leads_status_check: yeni durumlar ────────────────────────────────
  for (const status of ["muayene_edildi", "ameliyat_olacak", "ameliyat_edildi"]) {
    const { error } = await admin
      .from("leads")
      .update({ status })
      .eq("id", lead.id);
    if (error) {
      fail(
        `leads.status '${status}' kabul edilmiyor`,
        "20260911140000_lead_statuses_surgery_exam.sql",
        error.message,
      );
    } else {
      ok(`leads.status '${status}' kabul ediliyor`);
    }
  }

  // ── 2) lead_status_history trigger'ı to_status yazıyor mu ───────────────
  const { data: history } = await admin
    .from("lead_status_history")
    .select("to_status, created_at")
    .eq("lead_id", lead.id)
    .eq("to_status", "ameliyat_edildi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (history?.to_status === "ameliyat_edildi") {
    ok("lead_status_history trigger'ı ameliyat_edildi geçişini yazıyor");
  } else {
    fail(
      "lead_status_history'ye ameliyat_edildi geçişi yazılmadı",
      "20260818120000_lead_status_machine.sql",
      "Ameliyat sonrası mesajın tetikleyicisi bu kayıt — trigger olmadan mesaj gitmez.",
    );
  }

  // ── 3) message_dispatches.status = 'pending' ────────────────────────────
  const starts = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  starts.setMinutes(0, 0, 0);
  const { data: appt, error: aErr } = await admin
    .from("appointments")
    .insert({
      lead_id: lead.id,
      title: "ZZ Migration Test",
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + 30 * 60 * 1000).toISOString(),
      status: "scheduled",
      appointment_type: "consultation",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`appointment: ${aErr.message}`);
  created.appointmentId = appt.id;

  // rule_key → message_rules.key FK'si var; gerçek bir kural anahtarı gerekir.
  // Satır bu geçici randevuya bağlı ve sonunda siliniyor.
  const { error: dErr } = await admin.from("message_dispatches").insert({
    appointment_id: appt.id,
    rule_key: "appt_1d",
    phone: TEST_PHONE,
    template_name: "check",
    status: "pending",
    sent_at: new Date().toISOString(),
  });
  if (dErr) {
    fail(
      "message_dispatches 'pending' durumu kabul edilmiyor",
      "20260911120000_message_dispatches_pending_claim.sql",
      `${dErr.message} — kilit yazılamazsa HİÇBİR otomatik mesaj gönderilmez.`,
    );
  } else {
    ok("message_dispatches 'pending' kilidi yazılabiliyor");
  }

  // ── 4) message_rules ayarları ───────────────────────────────────────────
  const { data: rules } = await admin
    .from("message_rules")
    .select("key, enabled, timing_mode, send_at_local_time, lead_statuses, appointment_types");

  const byKey = Object.fromEntries((rules ?? []).map((r) => [r.key, r]));

  for (const key of ["surgery_day", "surgery_google_review"]) {
    const rule = byKey[key];
    if (!rule) {
      fail(`kural yok: ${key}`, "20260911150000_surgery_postop_ameliyat_edildi.sql");
      continue;
    }
    const good =
      rule.timing_mode === "calendar_day" &&
      String(rule.send_at_local_time ?? "").startsWith("16:00") &&
      (rule.lead_statuses ?? []).includes("ameliyat_edildi") &&
      (rule.appointment_types ?? []).includes("procedure");
    if (good) ok(`${key}: ameliyat_edildi · 16:00 · procedure`);
    else
      fail(
        `${key} ayarları güncel değil`,
        "20260911150000_surgery_postop_ameliyat_edildi.sql",
        JSON.stringify({
          timing_mode: rule.timing_mode,
          send_at_local_time: rule.send_at_local_time,
          lead_statuses: rule.lead_statuses,
        }),
      );
  }

  for (const key of ["appt_1d", "appt_1h"]) {
    const rule = byKey[key];
    if (!rule) {
      fail(`kural yok: ${key}`, "20260823200000_wa_message_automations.sql");
      continue;
    }
    const statuses = rule.lead_statuses ?? [];
    if (statuses.includes("ameliyat_edildi") && statuses.includes("randevulu")) {
      ok(`${key}: ameliyat olmuş hastaya da hatırlatma gider`);
    } else {
      fail(
        `${key} lead_statuses dar (${JSON.stringify(statuses)})`,
        "20260911150000_surgery_postop_ameliyat_edildi.sql",
        "Ameliyat sonrası kontrol randevusunun hatırlatması gitmez.",
      );
    }
  }
} catch (err) {
  fail("kontrol akışı", null, err instanceof Error ? err.message : String(err));
} finally {
  await cleanup();
  console.log("  \x1b[32mOK\x1b[0m    test verisi temizlendi");
}

console.log(`\nSonuç: ${passed} geçti, ${failed} eksik\n`);
if (todo.length) {
  console.log("Supabase SQL Editor'da çalıştırılacak migration dosyaları:");
  for (const m of todo) console.log(`  • supabase/migrations/${m}`);
  console.log("");
  process.exit(1);
}
console.log("Şema hazır — sistem canlıda çalışabilir.\n");
