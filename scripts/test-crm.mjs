#!/usr/bin/env node
/**
 * CRM / takvim: şema + mutlu yol + hata + güvenlik.
 *   npm run test:crm
 *   BASE_URL=http://localhost:3005 npm run test:crm
 *
 * RLS, anon anahtar, constraint, çakışma, HTTP auth, cron/webhook.
 * UI tıklama / role bazlı (doctor vs agency) burada yok.
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
  /\/$/,
  "",
);

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const TEST_PHONE = "905000009999";
const TEST_PHONE_B = "905000009998";
const TEST_NAME = "__CRM_TEST__";
const TEST_NAME_B = "__CRM_TEST_B__";
const TEST_TC = "99999999990";

let passed = 0;
let failed = 0;
let warned = 0;
const created = { contactId: null, contactBId: null, leadId: null, appointmentIds: [] };

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

async function step(title, fn) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  await fn();
}

function istanbulIso(ymd, hour, minute, durationMinutes = 30) {
  const start = new Date(
    `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`,
  );
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function tomorrowYmd() {
  const now = new Date();
  const istanbul = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  istanbul.setUTCDate(istanbul.getUTCDate() + 1);
  return istanbul.toISOString().slice(0, 10);
}

function intervalsOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

function expectsError(error, data) {
  return Boolean(error) || data == null;
}

async function cleanup() {
  const { data: contacts } = await admin
    .from("contacts")
    .select("id")
    .or(
      `phone.in.(${TEST_PHONE},${TEST_PHONE_B}),name.in.(${TEST_NAME},${TEST_NAME_B}),national_id.eq.${TEST_TC}`,
    );
  const ids = (contacts ?? []).map((row) => row.id);
  if (!ids.length) return;
  const { data: leads } = await admin
    .from("leads")
    .select("id")
    .in("contact_id", ids);
  const leadIds = (leads ?? []).map((row) => row.id);
  if (leadIds.length) {
    await admin.from("appointments").delete().in("lead_id", leadIds);
    await admin.from("tasks").delete().in("lead_id", leadIds);
    await admin.from("lead_status_history").delete().in("lead_id", leadIds);
    await admin.from("conversations").update({ lead_id: null }).in("lead_id", leadIds);
    await admin.from("leads").delete().in("id", leadIds);
  }
  await admin.from("patient_notes").delete().in("contact_id", ids);
  await admin.from("contacts").delete().in("id", ids);
}

try {
  console.log(`Supabase: ${url}`);
  if (baseUrl) console.log(`Site:     ${baseUrl}`);
  console.log("Not: UI tıklama ve rol (agency/editor) bu scriptte yok.\n");

  await step("0. Temizlik", async () => {
    await cleanup();
    ok("eski test kayıtları silindi");
  });

  await step("1. Şema", async () => {
    const checks = [
      ["contacts", "patient_no,birth_date,national_id,summary,allergies,gender"],
      ["patient_notes", "id,contact_id,body,kind"],
      ["appointments", "title,status,appointment_type,starts_at,ends_at"],
      ["leads", "id,contact_id,stage"],
    ];
    for (const [table, columns] of checks) {
      const { error } = await admin.from(table).select(columns).limit(1);
      if (error) fail(`${table}`, error.message);
      else ok(`${table} hazır`);
    }
  });

  await step("2. Güvenlik — anon RLS (giriş yok)", async () => {
    if (!anon) {
      fail("NEXT_PUBLIC_SUPABASE_ANON_KEY yok, RLS test edilemedi");
      return;
    }
    const tables = ["contacts", "leads", "appointments", "patient_notes", "profiles"];
    for (const table of tables) {
      const { data, error } = await anon.from(table).select("id").limit(5);
      if (error) ok(`anon SELECT ${table} reddedildi`);
      else if (!data?.length) ok(`anon SELECT ${table} boş (policy)`);
      else fail(`anon ${table} okuyabildi (${data.length} satır)`, "RLS sızıntısı");
    }

    const { error: insertContact } = await anon.from("contacts").insert({
      phone: "905000000000",
      name: "Hacker",
    });
    if (insertContact) ok("anon hasta ekleyemedi");
    else fail("anon hasta EKLEYEBİLDİ", "RLS insert açık");

    const { error: insertAppt } = await anon.from("appointments").insert({
      lead_id: "00000000-0000-0000-0000-000000000001",
      title: "hack",
      starts_at: new Date().toISOString(),
    });
    if (insertAppt) ok("anon randevu ekleyemedi");
    else fail("anon randevu EKLEYEBİLDİ");

    const { error: insertNote } = await anon.from("patient_notes").insert({
      contact_id: "00000000-0000-0000-0000-000000000001",
      body: "hack note",
      kind: "clinical",
    });
    if (insertNote) ok("anon klinik not ekleyemedi");
    else fail("anon not EKLEYEBİLDİ");
  });

  await step("3. HTTP güvenlik (auth yok)", async () => {
    if (!baseUrl) {
      warn("BASE_URL yok, HTTP testleri atlandı");
      return;
    }
    const expectLoginRedirect = async (path) => {
      const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      const location = res.headers.get("location") || "";
      if ([301, 302, 303, 307, 308].includes(res.status) && location.includes("/admin/login")) {
        ok(`${path} → login (${res.status})`);
      } else if (res.status === 200 && path === "/admin/login") {
        ok(`/admin/login açık (${res.status})`);
      } else {
        fail(`${path} korumasız`, `status=${res.status} location=${location}`);
      }
    };
    await expectLoginRedirect("/admin/login");
    await expectLoginRedirect("/admin/leads");
    await expectLoginRedirect("/admin/patients");
    await expectLoginRedirect("/admin/patients/new");
    await expectLoginRedirect("/admin/calendar");

    const cron = await fetch(`${baseUrl}/api/cron/reminders`, { method: "POST" });
    if (cron.status === 401) ok("cron secretsiz 401");
    else fail(`cron secretsiz ${cron.status}`, "CRON_SECRET kontrolü zayıf olabilir");

    const wa = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry: [] }),
    });
    if (wa.status === 401 || wa.status === 403) ok(`whatsapp imzasız ${wa.status}`);
    else fail(`whatsapp imzasız ${wa.status}`, "imza doğrulama zayıf olabilir");

    const waGet = await fetch(
      `${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=yanlis&hub.challenge=1`,
    );
    if (waGet.status === 403) ok("whatsapp verify token yanlış → 403");
    else fail(`whatsapp verify ${waGet.status}`);
  });

  await step("4. Hasta oluştur (mutlu yol)", async () => {
    const { data, error } = await admin
      .from("contacts")
      .insert({
        phone: TEST_PHONE,
        name: TEST_NAME,
        city: "İstanbul",
        national_id: TEST_TC,
        gender: "male",
        summary: "Otomatik test",
      })
      .select("id, patient_no")
      .single();
    if (error || !data) {
      fail("hasta insert", error?.message);
      return;
    }
    created.contactId = data.id;
    if (data.patient_no) ok(`hasta no HST-${String(data.patient_no).padStart(4, "0")}`);
    else fail("patient_no yok");
  });

  await step("5. Hata — hasta kısıtları", async () => {
    const dupPhone = await admin.from("contacts").insert({
      phone: TEST_PHONE,
      name: TEST_NAME_B,
    });
    if (dupPhone.error) ok("aynı telefon reddedildi");
    else fail("aynı telefon kabul edildi");

    const badGender = await admin.from("contacts").insert({
      phone: TEST_PHONE_B,
      name: TEST_NAME_B,
      gender: "alien",
    });
    if (badGender.error) ok("geçersiz cinsiyet reddedildi");
    else fail("geçersiz cinsiyet kabul edildi");

    const noPhone = await admin.from("contacts").insert({ name: TEST_NAME_B });
    if (noPhone.error) ok("telefonsuz hasta reddedildi");
    else fail("telefonsuz hasta kabul edildi");

    const { data: other, error: otherErr } = await admin
      .from("contacts")
      .insert({ phone: TEST_PHONE_B, name: TEST_NAME_B, national_id: TEST_TC })
      .select("id")
      .single();
    if (otherErr) ok("aynı TC reddedildi");
    else {
      created.contactBId = other.id;
      fail("aynı TC kabul edildi");
    }

    const fakeFk = await admin.from("patient_notes").insert({
      contact_id: "00000000-0000-0000-0000-000000000001",
      body: "yok",
      kind: "clinical",
    });
    if (fakeFk.error) ok("olmayan hastaya not reddedildi");
    else fail("olmayan hastaya not yazılabildi");

    const badKind = await admin.from("patient_notes").insert({
      contact_id: created.contactId,
      body: "x",
      kind: "secret",
    });
    if (badKind.error) ok("geçersiz not türü reddedildi");
    else fail("geçersiz not türü kabul edildi");

    const emptyNote = await admin.from("patient_notes").insert({
      contact_id: created.contactId,
      body: null,
      kind: "clinical",
    });
    if (emptyNote.error) ok("boş not reddedildi");
    else fail("null not kabul edildi");
  });

  await step("6. Lead + not + randevular", async () => {
    if (!created.contactId) {
      fail("hasta yok, atlandı");
      return;
    }
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .insert({
        contact_id: created.contactId,
        stage: "appointment",
        site: "manual",
        channel: "test",
      })
      .select("id")
      .single();
    if (leadError || !lead) {
      fail("lead", leadError?.message);
      return;
    }
    created.leadId = lead.id;
    ok("lead oluşturuldu");

    const { error: noteError } = await admin.from("patient_notes").insert({
      contact_id: created.contactId,
      body: "Test klinik notu",
      kind: "clinical",
    });
    if (noteError) fail("not", noteError.message);
    else ok("klinik not");

    const ymd = tomorrowYmd();
    const exam = istanbulIso(ymd, 11, 0, 60);
    const surgery = istanbulIso(ymd, 14, 0, 180);

    const { data: a1, error: e1 } = await admin
      .from("appointments")
      .insert({
        lead_id: lead.id,
        title: "Muayene",
        appointment_type: "consultation",
        status: "scheduled",
        starts_at: exam.start,
        ends_at: exam.end,
      })
      .select("id")
      .single();
    if (e1 || !a1) fail("1s muayene", e1?.message);
    else {
      created.appointmentIds.push(a1.id);
      ok("11:00–12:00 muayene");
    }

    const { data: a2, error: e2 } = await admin
      .from("appointments")
      .insert({
        lead_id: lead.id,
        title: "Ameliyat",
        appointment_type: "procedure",
        status: "scheduled",
        starts_at: surgery.start,
        ends_at: surgery.end,
      })
      .select("id")
      .single();
    if (e2 || !a2) fail("3s ameliyat", e2?.message);
    else {
      created.appointmentIds.push(a2.id);
      ok("14:00–17:00 ameliyat");
    }
  });

  await step("7. Hata — randevu kısıtları", async () => {
    if (!created.leadId) {
      fail("lead yok");
      return;
    }
    const ymd = tomorrowYmd();

    const badStatus = await admin.from("appointments").insert({
      lead_id: created.leadId,
      title: "x",
      status: "maybe",
      starts_at: istanbulIso(ymd, 8, 0, 30).start,
      ends_at: istanbulIso(ymd, 8, 0, 30).end,
    });
    if (badStatus.error) ok("geçersiz status reddedildi");
    else fail("geçersiz status kabul edildi");

    const badType = await admin.from("appointments").insert({
      lead_id: created.leadId,
      title: "x",
      appointment_type: "laser",
      starts_at: istanbulIso(ymd, 8, 0, 30).start,
      ends_at: istanbulIso(ymd, 8, 0, 30).end,
    });
    if (badType.error) ok("geçersiz tür reddedildi");
    else fail("geçersiz tür kabul edildi");

    const inverted = istanbulIso(ymd, 8, 0, 30);
    const badOrder = await admin.from("appointments").insert({
      lead_id: created.leadId,
      title: "x",
      starts_at: inverted.end,
      ends_at: inverted.start,
    });
    if (badOrder.error) ok("bitiş < başlangıç reddedildi");
    else fail("ters saat kabul edildi");

    const fakeLead = await admin.from("appointments").insert({
      lead_id: "00000000-0000-0000-0000-000000000001",
      title: "x",
      starts_at: istanbulIso(ymd, 8, 0, 30).start,
      ends_at: istanbulIso(ymd, 8, 0, 30).end,
    });
    if (fakeLead.error) ok("olmayan lead’e randevu reddedildi");
    else fail("olmayan lead’e randevu yazılabildi");

    const overlapSlot = istanbulIso(ymd, 15, 0, 30);
    const dbOverlap = await admin
      .from("appointments")
      .insert({
        lead_id: created.leadId,
        title: "Çakışan",
        appointment_type: "consultation",
        status: "scheduled",
        starts_at: overlapSlot.start,
        ends_at: overlapSlot.end,
      })
      .select("id")
      .single();
    if (dbOverlap.error) ok("DB çakışan randevuyu reddetti");
    else {
      created.appointmentIds.push(dbOverlap.data.id);
      fail(
        "DB çakışan randevuya izin verdi",
        "20260808180000_appointment_no_overlap.sql çalıştırın",
      );
    }

    const adjacentSlot = istanbulIso(ymd, 17, 0, 30);
    const adjacent = await admin
      .from("appointments")
      .insert({
        lead_id: created.leadId,
        title: "Bitişik",
        appointment_type: "consultation",
        status: "scheduled",
        starts_at: adjacentSlot.start,
        ends_at: adjacentSlot.end,
      })
      .select("id")
      .single();
    if (adjacent.error) fail("bitişik saat reddedildi", adjacent.error.message);
    else {
      created.appointmentIds.push(adjacent.data.id);
      ok("17:00 bitişik slota izin var");
    }

    const cancelledOverlap = await admin
      .from("appointments")
      .insert({
        lead_id: created.leadId,
        title: "İptal çakışma",
        appointment_type: "consultation",
        status: "cancelled",
        starts_at: overlapSlot.start,
        ends_at: overlapSlot.end,
      })
      .select("id")
      .single();
    if (cancelledOverlap.error) {
      fail("iptal edilmiş çakışma reddedildi", cancelledOverlap.error.message);
    } else {
      created.appointmentIds.push(cancelledOverlap.data.id);
      ok("iptal edilmiş çakışmaya izin var");
    }
  });

  await step("8. Çakışma kuralı (uygulama)", async () => {
    const { data, error } = await admin
      .from("appointments")
      .select("id, starts_at, ends_at, status")
      .eq("lead_id", created.leadId ?? "00000000-0000-0000-0000-000000000000");
    if (error) {
      fail("okunamadı", error.message);
      return;
    }
    const ymd = tomorrowYmd();
    const rows = data ?? [];
    const active = rows.filter((item) => item.status !== "cancelled");

    const hitSurgery = active.some((item) =>
      intervalsOverlap(
        istanbulIso(ymd, 15, 0, 30).start,
        istanbulIso(ymd, 15, 0, 30).end,
        item.starts_at,
        item.ends_at || item.starts_at,
      ),
    );
    if (hitSurgery) ok("15:00 ameliyatla çakışıyor");
    else fail("15:00 çakışması bulunamadı");

    const adjacent = active.some((item) =>
      intervalsOverlap(
        istanbulIso(ymd, 12, 0, 30).start,
        istanbulIso(ymd, 12, 0, 30).end,
        item.starts_at,
        item.ends_at || item.starts_at,
      ),
    );
    if (!adjacent) ok("12:00 bitişe bitişik, çakışma yok");
    else fail("12:00 yanlışlıkla çakışıyor");

    if (!created.appointmentIds[0]) {
      warn("iptal senaryosu atlandı");
      return;
    }
    await admin
      .from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", created.appointmentIds[0]);
    const { data: after } = await admin
      .from("appointments")
      .select("id, starts_at, ends_at, status")
      .eq("lead_id", created.leadId);
    const stillBlocks = (after ?? [])
      .filter((item) => item.status !== "cancelled")
      .some((item) =>
        intervalsOverlap(
          istanbulIso(ymd, 11, 0, 60).start,
          istanbulIso(ymd, 11, 0, 60).end,
          item.starts_at,
          item.ends_at || item.starts_at,
        ),
      );
    if (!stillBlocks) ok("iptal randevu çakışmayı bırakıyor");
    else fail("iptal randevu hâlâ dolu sayılıyor");
  });

  await step("9. Hasta ↔ randevu ilişkisi", async () => {
    if (!created.contactId) {
      fail("hasta yok");
      return;
    }
    const { data: leads } = await admin
      .from("leads")
      .select("id")
      .eq("contact_id", created.contactId);
    const { data: appts } = await admin
      .from("appointments")
      .select("id")
      .in(
        "lead_id",
        (leads ?? []).map((row) => row.id),
      );
    if ((appts ?? []).length >= 2) ok(`${appts.length} randevu hasta üzerinden okundu`);
    else fail("hastada yeterli randevu yok");
  });

  await step("10. Temizlik", async () => {
    await cleanup();
    const { data } = await admin
      .from("contacts")
      .select("id")
      .in("phone", [TEST_PHONE, TEST_PHONE_B]);
    if (data?.length) fail("test hastası kaldı");
    else ok("test kayıtları silindi");
  });
} catch (error) {
  fail("beklenmeyen hata", error.message);
  try {
    await cleanup();
  } catch {
    /* ignore */
  }
}

console.log(
  `\n${failed ? "\x1b[31m" : warned ? "\x1b[33m" : "\x1b[32m"}${passed} geçti, ${failed} kaldı, ${warned} uyarı\x1b[0m\n`,
);
if (warned) {
  console.log("Uyarı = bilinen boşluk (ör. DB’de çakışma kilidi yok).\n");
}
process.exit(failed ? 1 : 0);
