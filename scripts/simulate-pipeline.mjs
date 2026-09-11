#!/usr/bin/env node
/**
 * Uçtan uca simülasyon: durum taşıma + WhatsApp otomatik mesajları.
 *
 *   npm run test:pipeline
 *
 * Gerçek üretim kodunu (advanceFinishedAppointments / runAutomationReminders)
 * bellekteki sahte Supabase üzerinde çalıştırır. Hiçbir mesaj gönderilmez,
 * gerçek veritabanına dokunulmaz.
 */
import { createFakeSupabase } from "./lib/fake-supabase.mjs";
import {
  advanceFinishedAppointments,
  isAppointmentFinished,
  leadStatusAfterAppointmentEnds,
  leadStatusForBookedAppointment,
} from "../src/lib/crm/appointment-pipeline.ts";
import { runAutomationReminders } from "../src/lib/whatsapp/run-reminders.ts";
import { LEAD_STATUSES } from "../src/lib/crm/lead-status.ts";

let pass = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    return;
  }
  failures.push(detail ? `${name} — ${detail}` : name);
}

function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? "" : `beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
}

/** Istanbul yerel saatini UTC Date'e çevirir (UTC+3, DST yok). */
function ist(ymd, hm) {
  return new Date(`${ymd}T${hm}:00+03:00`);
}

const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function ymdOffset(days) {
  const base = new Date(`${TODAY}T12:00:00+03:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

const YESTERDAY = ymdOffset(-1);
const TOMORROW = ymdOffset(1);

// ── Kurallar (migration sonrası beklenen hâli) ─────────────────────────────
const RULE_APPT_1D = {
  key: "appt_1d",
  label: "Randevu hatırlatma (1 gün önce)",
  enabled: true,
  template_name: "appointment_reminder_1d",
  language: "tr",
  offset_minutes: 1440,
  send_at_local_time: null,
  timing_mode: "before_start",
  appointment_types: ["consultation", "control", "online", "procedure"],
  appointment_statuses: ["scheduled", "confirmed"],
  lead_statuses: ["randevulu", "muayene_edildi", "ameliyat_olacak", "ameliyat_edildi"],
  include_body_params: true,
  sort_order: 10,
};

const RULE_SURGERY_DAY = {
  key: "surgery_day",
  label: "Ameliyat sonrası bilgilendirme",
  enabled: true,
  template_name: "postop_bilgilendirme",
  language: "tr",
  offset_minutes: 0,
  send_at_local_time: "16:00",
  timing_mode: "calendar_day",
  appointment_types: ["procedure"],
  appointment_statuses: ["scheduled", "confirmed", "completed"],
  lead_statuses: ["ameliyat_edildi"],
  include_body_params: false,
  sort_order: 30,
};

const RULE_GOOGLE_REVIEW = {
  ...RULE_SURGERY_DAY,
  key: "surgery_google_review",
  label: "Google Maps yorum isteği",
  template_name: "google_maps_review",
  sort_order: 31,
};

// ── Dünya kurucu ───────────────────────────────────────────────────────────
function world({ appointments = [], leads = [], contacts = [], extra = {} , leadStatusCheck = LEAD_STATUSES } = {}) {
  const state = { clock: new Date() };
  const supabase = createFakeSupabase(
    {
      contacts,
      leads,
      appointments,
      conversations: [],
      messages: [],
      ...extra,
    },
    { now: () => state.clock, leadStatusCheck },
  );
  return { supabase, state };
}

function patient({ id, status = "randevulu", phone = "905551112233", stage = "appointment" }) {
  return {
    contact: { id: `c-${id}`, phone, name: `Hasta ${id}` },
    lead: { id: `l-${id}`, contact_id: `c-${id}`, status, stage },
  };
}

function appointment({ id, leadId, startsAt, endsAt, type = "consultation", status = "scheduled" }) {
  return {
    id,
    lead_id: leadId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt === undefined ? null : endsAt?.toISOString() ?? null,
    appointment_type: type,
    status,
    reminder_sent_at: null,
  };
}

/** 24 saatlik serbest mesaj penceresini açar (gelen mesaj simülasyonu). */
function openWindow(supabase, contactId, leadId, at = new Date()) {
  const convId = `conv-${contactId}`;
  supabase.__db.conversations.push({ id: convId, contact_id: contactId, lead_id: leadId });
  supabase.__db.messages.push({
    id: `m-${contactId}`,
    conversation_id: convId,
    direction: "inbound",
    created_at: at.toISOString(),
  });
}

function makeSender() {
  const outbox = [];
  return {
    outbox,
    sendText: async (phone, body) => {
      outbox.push({ phone, body });
      return { messageId: `wamid-${outbox.length}` };
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// A. SAF FONKSİYONLAR
// ══════════════════════════════════════════════════════════════════════════
eq("A1 ameliyat randevusu → ameliyat_olacak", leadStatusForBookedAppointment("procedure"), "ameliyat_olacak");
eq("A2 muayene randevusu → randevulu", leadStatusForBookedAppointment("consultation"), "randevulu");
eq("A3 kontrol randevusu → randevulu", leadStatusForBookedAppointment("control"), "randevulu");
eq("A4 ameliyat bitti → ameliyat_edildi", leadStatusAfterAppointmentEnds("procedure"), "ameliyat_edildi");
eq("A5 muayene bitti → muayene_edildi", leadStatusAfterAppointmentEnds("consultation"), "muayene_edildi");

const nowRef = new Date("2026-09-11T12:00:00Z");
check("A6 ends_at geçmiş → bitti", isAppointmentFinished({ starts_at: "2026-09-11T10:00:00Z", ends_at: "2026-09-11T11:00:00Z" }, nowRef));
check("A7 ends_at gelecek → bitmedi", !isAppointmentFinished({ starts_at: "2026-09-11T11:30:00Z", ends_at: "2026-09-11T13:00:00Z" }, nowRef));
check("A8 ends_at yok, 40dk önce başladı → bitti", isAppointmentFinished({ starts_at: "2026-09-11T11:20:00Z", ends_at: null }, nowRef));
check("A9 ends_at yok, 10dk önce başladı → bitmedi", !isAppointmentFinished({ starts_at: "2026-09-11T11:50:00Z", ends_at: null }, nowRef));

// ══════════════════════════════════════════════════════════════════════════
// B. DURUM TAŞIMA SENARYOLARI
// ══════════════════════════════════════════════════════════════════════════
async function scenarioTransitions() {
  const now = ist(TODAY, "15:00");

  const surgery = patient({ id: "surg", status: "ameliyat_olacak" });
  const exam = patient({ id: "exam", status: "randevulu" });
  const noEnd = patient({ id: "noend", status: "randevulu" });
  const early = patient({ id: "early", status: "randevulu" });
  const future = patient({ id: "future", status: "randevulu" });
  const cancelled = patient({ id: "cancel", status: "ameliyat_olacak" });
  const old = patient({ id: "old", status: "randevulu" });
  const done = patient({ id: "done", status: "bitti" });

  const people = [surgery, exam, noEnd, early, future, cancelled, old, done];

  const w = world({
    contacts: people.map((p) => p.contact),
    leads: people.map((p) => p.lead),
    appointments: [
      appointment({ id: "a-surg", leadId: "l-surg", startsAt: ist(TODAY, "10:00"), endsAt: ist(TODAY, "14:00"), type: "procedure" }),
      appointment({ id: "a-exam", leadId: "l-exam", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "09:30") }),
      appointment({ id: "a-noend", leadId: "l-noend", startsAt: ist(TODAY, "14:00"), endsAt: undefined }),
      appointment({ id: "a-early", leadId: "l-early", startsAt: ist(TODAY, "14:50"), endsAt: undefined }),
      appointment({ id: "a-future", leadId: "l-future", startsAt: ist(TODAY, "17:00"), endsAt: ist(TODAY, "18:00") }),
      appointment({ id: "a-cancel", leadId: "l-cancel", startsAt: ist(TODAY, "08:00"), endsAt: ist(TODAY, "09:00"), type: "procedure", status: "cancelled" }),
      appointment({ id: "a-old", leadId: "l-old", startsAt: ist(ymdOffset(-40), "10:00"), endsAt: ist(ymdOffset(-40), "11:00") }),
      appointment({ id: "a-done", leadId: "l-done", startsAt: ist(TODAY, "08:00"), endsAt: ist(TODAY, "08:30") }),
    ],
  });
  w.state.clock = now;

  const res = await advanceFinishedAppointments(w.supabase, now);

  const leadOf = (id) => w.supabase.__db.leads.find((l) => l.id === id);
  const apptOf = (id) => w.supabase.__db.appointments.find((a) => a.id === id);

  eq("B1 ameliyat biten lead → ameliyat_edildi", leadOf("l-surg").status, "ameliyat_edildi");
  eq("B2 ameliyat randevusu → completed", apptOf("a-surg").status, "completed");
  eq("B3 muayene biten lead → muayene_edildi", leadOf("l-exam").status, "muayene_edildi");
  eq("B4 ends_at yok + 60dk geçti → taşındı", leadOf("l-noend").status, "muayene_edildi");
  eq("B5 ends_at yok + 10dk → taşınmadı", leadOf("l-early").status, "randevulu");
  eq("B6 gelecekteki randevu → taşınmadı", leadOf("l-future").status, "randevulu");
  eq("B7 iptal randevu → taşınmadı", leadOf("l-cancel").status, "ameliyat_olacak");
  eq("B8 iptal randevu statüsü korunur", apptOf("a-cancel").status, "cancelled");
  eq("B9 40 gün önceki randevu → toplu taşıma yok", leadOf("l-old").status, "randevulu");
  eq("B10 eski randevu scheduled kalır", apptOf("a-old").status, "scheduled");
  eq("B11 bitti lead → durum korunur", leadOf("l-done").status, "bitti");
  eq("B12 bitti lead'in randevusu yine de completed", apptOf("a-done").status, "completed");
  eq("B13 taşınan lead sayısı", res.leadsAdvanced, 3);
  eq("B14 pipeline hatası yok", res.pipelineFailures, []);

  const hist = w.supabase.__db.lead_status_history;
  eq("B15 ameliyat_edildi geçiş kaydı", hist.filter((h) => h.to_status === "ameliyat_edildi").length, 1);
  eq("B16 muayene_edildi geçiş kaydı", hist.filter((h) => h.to_status === "muayene_edildi").length, 2);

  // İkinci cron turu — idempotent olmalı
  const again = await advanceFinishedAppointments(w.supabase, ist(TODAY, "15:15"));
  eq("B17 ikinci tur: taşıma yok", again.leadsAdvanced, 0);
  eq("B18 ikinci tur: randevu tamamlama yok", again.appointmentsCompleted, 0);
  eq("B19 geçiş kaydı tekrarlanmadı", w.supabase.__db.lead_status_history.length, hist.length);
}

/** Ameliyat bekleyen hastanın ameliyat öncesi muayenesi durumu geri almamalı. */
async function scenarioPreopExam() {
  const p = patient({ id: "preop", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-preop", leadId: "l-preop", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "09:30") }),
      appointment({ id: "a-preop-surg", leadId: "l-preop", startsAt: ist(ymdOffset(5), "09:00"), endsAt: ist(ymdOffset(5), "12:00"), type: "procedure" }),
    ],
  });
  w.state.clock = ist(TODAY, "10:00");
  await advanceFinishedAppointments(w.supabase, ist(TODAY, "10:00"));

  eq("K1 ameliyat öncesi muayene durumu geri almaz", w.supabase.__db.leads[0].status, "ameliyat_olacak");
  eq("K2 muayene randevusu yine de completed", w.supabase.__db.appointments[0].status, "completed");
  eq("K3 gelecekteki ameliyat randevusu scheduled", w.supabase.__db.appointments[1].status, "scheduled");
  eq("K4 gereksiz geçiş kaydı yok", w.supabase.__db.lead_status_history.length, 0);
}

/** Migration uygulanmadan deploy → randevu completed olmamalı, sonra düzelmeli. */
async function scenarioMissingMigration() {
  const p = patient({ id: "mig", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-mig", leadId: "l-mig", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "10:00"), type: "procedure" }),
    ],
    // Eski CHECK: yeni durumlar yok
    leadStatusCheck: ["yeni", "arandi", "randevulu", "bitti", "ameliyat_olacak"],
  });
  w.state.clock = ist(TODAY, "11:00");

  const res = await advanceFinishedAppointments(w.supabase, ist(TODAY, "11:00"));
  const appt = w.supabase.__db.appointments[0];

  check("C1 migration yokken hata raporlanır", res.pipelineFailures.length === 1, JSON.stringify(res.pipelineFailures));
  eq("C2 randevu completed YAPILMAZ (tekrar denenir)", appt.status, "scheduled");
  eq("C3 lead durumu değişmedi", w.supabase.__db.leads[0].status, "ameliyat_olacak");

  // Migration uygulandı → aynı randevu bu kez taşınır
  const w2 = world({
    contacts: [p.contact],
    leads: [{ ...p.lead }],
    appointments: [
      appointment({ id: "a-mig", leadId: "l-mig", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "10:00"), type: "procedure" }),
    ],
  });
  w2.state.clock = ist(TODAY, "11:15");
  const res2 = await advanceFinishedAppointments(w2.supabase, ist(TODAY, "11:15"));
  eq("C4 migration sonrası taşınır", w2.supabase.__db.leads[0].status, "ameliyat_edildi");
  eq("C5 migration sonrası completed", w2.supabase.__db.appointments[0].status, "completed");
  eq("C6 hata kalmadı", res2.pipelineFailures, []);
}

// ══════════════════════════════════════════════════════════════════════════
// D. AMELİYAT SONRASI MESAJ ZAMANLAMASI
// ══════════════════════════════════════════════════════════════════════════
async function scenarioPostopTiming() {
  const p = patient({ id: "po", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-po", leadId: "l-po", startsAt: ist(TODAY, "10:00"), endsAt: ist(TODAY, "14:00"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-po", "l-po");

  // 14:15 → cron taşır
  w.state.clock = ist(TODAY, "14:15");
  await advanceFinishedAppointments(w.supabase, ist(TODAY, "14:15"));
  eq("D1 14:15'te lead ameliyat_edildi", w.supabase.__db.leads[0].status, "ameliyat_edildi");

  // 15:00 → henüz 16:00 olmadı
  const s1 = makeSender();
  const r1 = await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "15:00"), sendText: s1.sendText });
  eq("D2 15:00'te mesaj gitmez", s1.outbox.length, 0);
  eq("D3 15:00'te sent=0", r1.sent, 0);

  // 16:00 → gider
  const s2 = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "16:00"), sendText: s2.sendText });
  eq("D4 16:00'da mesaj gider", s2.outbox.length, 1);
  check("D5 mesaj ameliyat bilgilendirme metni", /BİLGİLENDİRME/i.test(s2.outbox[0]?.body ?? ""), s2.outbox[0]?.body?.slice(0, 60));

  // 16:15 ikinci cron → tekrar gitmez
  const s3 = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "16:15"), sendText: s3.sendText });
  eq("D6 ikinci cron turunda tekrar gitmez", s3.outbox.length, 0);

  // 4 tur daha (kullanıcının yaşadığı 4-5 tekrar senaryosu)
  const s4 = makeSender();
  for (const hm of ["16:30", "17:00", "19:00", "22:00"]) {
    await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, hm), sendText: s4.sendText });
  }
  eq("D7 gün boyu tekrar gönderim yok", s4.outbox.length, 0);
  eq("D8 toplam dispatch satırı 1", w.supabase.__db.message_dispatches.length, 1);
  eq("D9 dispatch durumu sent", w.supabase.__db.message_dispatches[0].status, "sent");
}

/** Ameliyat 16:00'dan sonra bitti → mesaj hemen gitmeli. */
async function scenarioPostopAfterCutoff() {
  const p = patient({ id: "late", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-late", leadId: "l-late", startsAt: ist(TODAY, "15:00"), endsAt: ist(TODAY, "18:30"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-late", "l-late");

  w.state.clock = ist(TODAY, "18:45");
  await advanceFinishedAppointments(w.supabase, ist(TODAY, "18:45"));
  const s = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "18:45"), sendText: s.sendText });
  eq("E1 16:00 sonrası biten ameliyat → hemen gider", s.outbox.length, 1);
}

/** Dün taşınmış lead bugün mesaj almamalı (gün dışı). */
async function scenarioPostopStaleDay() {
  const p = patient({ id: "stale", status: "ameliyat_edildi" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-stale", leadId: "l-stale", startsAt: ist(YESTERDAY, "10:00"), endsAt: ist(YESTERDAY, "12:00"), type: "procedure", status: "completed" }),
    ],
    extra: {
      lead_status_history: [
        { id: "h1", lead_id: "l-stale", to_status: "ameliyat_edildi", from_status: "ameliyat_olacak", created_at: ist(YESTERDAY, "12:15").toISOString() },
      ],
    },
  });
  openWindow(w.supabase, "c-stale", "l-stale");

  const s = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "16:00"), sendText: s.sendText });
  eq("E2 dünkü geçiş bugün tetiklenmez", s.outbox.length, 0);
}

/** Ameliyattan sonra aynı gün kontrol randevusu açılırsa mesaj kaybolmamalı. */
async function scenarioControlBookedSameDay() {
  const p = patient({ id: "ctrl", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-ctrl-surg", leadId: "l-ctrl", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "13:00"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-ctrl", "l-ctrl");

  w.state.clock = ist(TODAY, "13:15");
  await advanceFinishedAppointments(w.supabase, ist(TODAY, "13:15"));
  eq("F1 ameliyat sonrası ameliyat_edildi", w.supabase.__db.leads[0].status, "ameliyat_edildi");

  // Asistan 10. gün kontrolünü ekliyor → lead tekrar "randevulu" oluyor
  w.supabase.__db.appointments.push(
    appointment({ id: "a-ctrl-follow", leadId: "l-ctrl", startsAt: ist(ymdOffset(10), "11:00"), endsAt: ist(ymdOffset(10), "11:30"), type: "control" }),
  );
  w.supabase.__db.leads[0].status = leadStatusForBookedAppointment("control");
  eq("F2 kontrol randevusu lead'i randevulu yapar", w.supabase.__db.leads[0].status, "randevulu");

  const s = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY], { now: ist(TODAY, "16:00"), sendText: s.sendText });
  eq("F3 durum değişse de bilgilendirme mesajı gider", s.outbox.length, 1);
}

// ══════════════════════════════════════════════════════════════════════════
// G. RANDEVU HATIRLATMA (appt_1d) — mükerrer gönderim senaryoları
// ══════════════════════════════════════════════════════════════════════════
async function scenarioReminderDedup() {
  // Aynı hastanın farklı günlerde iki randevusu → ikisi de hatırlatma almalı
  const p = patient({ id: "two", status: "randevulu" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-mon", leadId: "l-two", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") }),
      appointment({ id: "a-tue", leadId: "l-two", startsAt: ist(ymdOffset(2), "10:00"), endsAt: ist(ymdOffset(2), "10:30"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-two", "l-two");

  const s = makeSender();
  // Bugün: yarınki randevu için due
  await runAutomationReminders(w.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s.sendText });
  eq("G1 yarınki randevu için hatırlatma", s.outbox.length, 1);

  // Aynı gün 4 tur daha → tekrar yok
  for (const hm of ["13:00", "16:00", "19:00", "22:00"]) {
    await runAutomationReminders(w.supabase, [RULE_APPT_1D], { now: ist(TODAY, hm), sendText: s.sendText });
  }
  eq("G2 aynı randevu için 3-4 saat arayla tekrar YOK", s.outbox.length, 1);

  // Ertesi gün: 2 gün sonraki (ameliyat) randevusu için due → gitmeli
  await runAutomationReminders(w.supabase, [RULE_APPT_1D], { now: ist(TOMORROW, "10:00"), sendText: s.sendText });
  eq("G3 farklı gündeki ikinci randevu hatırlatması gider", s.outbox.length, 2);

  // Aynı güne çift kayıt → ikincisi engellenir
  const p2 = patient({ id: "dup", status: "randevulu" });
  const w2 = world({
    contacts: [p2.contact],
    leads: [p2.lead],
    appointments: [
      appointment({ id: "a-d1", leadId: "l-dup", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") }),
      appointment({ id: "a-d2", leadId: "l-dup", startsAt: ist(TOMORROW, "15:00"), endsAt: ist(TOMORROW, "15:30") }),
    ],
  });
  openWindow(w2.supabase, "c-dup", "l-dup");
  const s2 = makeSender();
  await runAutomationReminders(w2.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s2.sendText });
  eq("G4 aynı güne çift randevu → tek mesaj", s2.outbox.length, 1);
}

// ══════════════════════════════════════════════════════════════════════════
// H. OLUMSUZ SENARYOLAR
// ══════════════════════════════════════════════════════════════════════════
async function scenarioNegative() {
  // H1: 24s penceresi kapalı → gönderilmez, kalıcı skip yazılmaz
  const p1 = patient({ id: "win", status: "randevulu" });
  const w1 = world({
    contacts: [p1.contact],
    leads: [p1.lead],
    appointments: [appointment({ id: "a-win", leadId: "l-win", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") })],
  });
  openWindow(w1.supabase, "c-win", "l-win", new Date(Date.now() - 30 * 60 * 60 * 1000));
  const s1 = makeSender();
  const r1 = await runAutomationReminders(w1.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s1.sendText });
  eq("H1 pencere kapalı → gönderim yok", s1.outbox.length, 0);
  eq("H2 pencere kapalı → kalıcı dispatch yazılmaz", w1.supabase.__db.message_dispatches.length, 0);
  eq("H3 skipped sayacı", r1.skipped, 1);

  // Pencere açılınca aynı gün gider
  w1.supabase.__db.messages[0].created_at = new Date().toISOString();
  const s1b = makeSender();
  await runAutomationReminders(w1.supabase, [RULE_APPT_1D], { now: ist(TODAY, "12:00"), sendText: s1b.sendText });
  eq("H4 pencere açılınca gider", s1b.outbox.length, 1);

  // H5: opt-out
  const p2 = patient({ id: "opt", status: "randevulu" });
  const w2 = world({
    contacts: [p2.contact],
    leads: [p2.lead],
    appointments: [appointment({ id: "a-opt", leadId: "l-opt", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") })],
    extra: { wa_message_opt_outs: [{ id: "o1", phone: "905551112233" }] },
  });
  openWindow(w2.supabase, "c-opt", "l-opt");
  const s2 = makeSender();
  await runAutomationReminders(w2.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s2.sendText });
  eq("H5 opt-out → gönderim yok", s2.outbox.length, 0);
  eq("H6 opt-out → skipped kaydı", w2.supabase.__db.message_dispatches[0]?.status, "skipped");

  // H7: telefon yok
  const p3 = patient({ id: "nophone", status: "randevulu", phone: null });
  const w3 = world({
    contacts: [p3.contact],
    leads: [p3.lead],
    appointments: [appointment({ id: "a-np", leadId: "l-nophone", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") })],
  });
  openWindow(w3.supabase, "c-nophone", "l-nophone");
  const s3 = makeSender();
  await runAutomationReminders(w3.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s3.sendText });
  eq("H7 telefonsuz hasta → gönderim yok", s3.outbox.length, 0);
  eq("H8 telefonsuz → skipped kaydı", w3.supabase.__db.message_dispatches[0]?.error, "Telefon yok");

  // H9: WhatsApp API hatası → failed, 1 saat içinde tekrar denenmez
  const p4 = patient({ id: "err", status: "randevulu" });
  const w4 = world({
    contacts: [p4.contact],
    leads: [p4.lead],
    appointments: [appointment({ id: "a-err", leadId: "l-err", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") })],
  });
  openWindow(w4.supabase, "c-err", "l-err");
  let attempts = 0;
  const failing = async () => {
    attempts += 1;
    throw new Error("Meta 500");
  };
  const r4 = await runAutomationReminders(w4.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: failing });
  eq("H9 API hatası → failure raporlanır", r4.failures.length, 1);
  eq("H10 dispatch failed", w4.supabase.__db.message_dispatches[0].status, "failed");
  await runAutomationReminders(w4.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:15"), sendText: failing });
  eq("H11 1 saat içinde tekrar denenmez", attempts, 1);

  // 1 saat sonra tekrar dener ve bu kez başarılı
  w4.supabase.__db.message_dispatches[0].sent_at = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const s4 = makeSender();
  await runAutomationReminders(w4.supabase, [RULE_APPT_1D], { now: ist(TODAY, "12:00"), sendText: s4.sendText });
  eq("H12 1 saat sonra tekrar denenir", s4.outbox.length, 1);

  // H13: gönderim sonrası kayıt patlasa bile tekrar gönderilmez
  const p5 = patient({ id: "book", status: "randevulu" });
  const w5 = world({
    contacts: [p5.contact],
    leads: [p5.lead],
    appointments: [appointment({ id: "a-book", leadId: "l-book", startsAt: ist(TOMORROW, "10:00"), endsAt: ist(TOMORROW, "10:30") })],
  });
  openWindow(w5.supabase, "c-book", "l-book");
  const s5 = makeSender();
  await runAutomationReminders(w5.supabase, [RULE_APPT_1D], { now: ist(TODAY, "10:00"), sendText: s5.sendText });
  // WhatsApp'tan "iletilemedi" webhook'u geldi — eski hata: status failed'e çekiliyordu
  w5.supabase.__db.message_dispatches[0].error = "WhatsApp iletilemedi";
  await runAutomationReminders(w5.supabase, [RULE_APPT_1D], { now: ist(TODAY, "13:00"), sendText: s5.sendText });
  eq("H13 iletim hatası sonrası tekrar gönderim yok", s5.outbox.length, 1);
}

// ══════════════════════════════════════════════════════════════════════════
// I. KURAL ZİNCİRİ (google review, surgery_day'e bağlı)
// ══════════════════════════════════════════════════════════════════════════
async function scenarioRuleChain() {
  const p = patient({ id: "gr", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-gr", leadId: "l-gr", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "12:00"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-gr", "l-gr");
  w.state.clock = ist(TODAY, "12:15");
  await advanceFinishedAppointments(w.supabase, ist(TODAY, "12:15"));

  // Yalnızca google review kuralı çalışsa → surgery_day gitmediği için beklemeli
  const s0 = makeSender();
  await runAutomationReminders(w.supabase, [RULE_GOOGLE_REVIEW], { now: ist(TODAY, "16:00"), sendText: s0.sendText });
  eq("I1 bilgilendirme gitmeden yorum isteği gitmez", s0.outbox.length, 0);

  // İkisi birlikte → sırayla
  const s1 = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY, RULE_GOOGLE_REVIEW], { now: ist(TODAY, "16:00"), sendText: s1.sendText });
  eq("I2 bilgilendirme + yorum isteği gider", s1.outbox.length, 2);
  check("I3 yorum mesajında harita linki var", /maps|google/i.test(s1.outbox[1]?.body ?? ""), s1.outbox[1]?.body?.slice(0, 80));

  // Tekrar tur → ikisi de tekrar gitmez
  const s2 = makeSender();
  await runAutomationReminders(w.supabase, [RULE_SURGERY_DAY, RULE_GOOGLE_REVIEW], { now: ist(TODAY, "17:00"), sendText: s2.sendText });
  eq("I4 zincir tekrar etmez", s2.outbox.length, 0);
}

// ══════════════════════════════════════════════════════════════════════════
// J. TAM GÜN AKIŞI (ameliyat günü uçtan uca)
// ══════════════════════════════════════════════════════════════════════════
async function scenarioFullDay() {
  const p = patient({ id: "full", status: "ameliyat_olacak" });
  const w = world({
    contacts: [p.contact],
    leads: [p.lead],
    appointments: [
      appointment({ id: "a-full", leadId: "l-full", startsAt: ist(TODAY, "09:00"), endsAt: ist(TODAY, "13:30"), type: "procedure" }),
    ],
  });
  openWindow(w.supabase, "c-full", "l-full");

  const sender = makeSender();
  const rules = [RULE_APPT_1D, RULE_SURGERY_DAY, RULE_GOOGLE_REVIEW];

  // 15 dakikada bir, 08:00 → 23:45 arası cron
  for (let minutes = 8 * 60; minutes <= 23 * 60 + 45; minutes += 15) {
    const hm = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const now = ist(TODAY, hm);
    w.state.clock = now;
    await advanceFinishedAppointments(w.supabase, now);
    await runAutomationReminders(w.supabase, rules, { now, sendText: sender.sendText });
  }

  // 64 cron turu boyunca her kuraldan tam olarak 1 mesaj
  const perRule = {};
  for (const d of w.supabase.__db.message_dispatches) {
    perRule[d.rule_key] = (perRule[d.rule_key] ?? 0) + 1;
  }
  eq("J1 kural başına tam 1 gönderim", perRule, {
    appt_1d: 1,
    surgery_day: 1,
    surgery_google_review: 1,
  });
  eq("J2 lead ameliyat_edildi", w.supabase.__db.leads[0].status, "ameliyat_edildi");
  eq("J3 randevu completed", w.supabase.__db.appointments[0].status, "completed");
  eq("J4 toplam gönderim 3", sender.outbox.length, 3);
  check("J5 tüm dispatch'ler sent", w.supabase.__db.message_dispatches.every((d) => d.status === "sent"));
  eq("J6 geçiş kaydı 1", w.supabase.__db.lead_status_history.length, 1);
  eq("J7 outbound mesaj kaydı 3", w.supabase.__db.messages.filter((m) => m.direction === "outbound").length, 3);
}

// ── Çalıştır ───────────────────────────────────────────────────────────────
const scenarios = [
  ["Durum taşıma", scenarioTransitions],
  ["Ameliyat öncesi muayene", scenarioPreopExam],
  ["Eksik migration", scenarioMissingMigration],
  ["Ameliyat sonrası zamanlama", scenarioPostopTiming],
  ["16:00 sonrası ameliyat", scenarioPostopAfterCutoff],
  ["Geçmiş gün geçişi", scenarioPostopStaleDay],
  ["Aynı gün kontrol randevusu", scenarioControlBookedSameDay],
  ["Hatırlatma mükerrerlik", scenarioReminderDedup],
  ["Olumsuz senaryolar", scenarioNegative],
  ["Kural zinciri", scenarioRuleChain],
  ["Tam gün akışı", scenarioFullDay],
];

const originalInfo = console.info;
console.info = () => {};

for (const [name, fn] of scenarios) {
  try {
    await fn();
  } catch (err) {
    failures.push(
      `${name}: beklenmeyen hata — ${err.message}\n${(err.stack ?? "").split("\n").slice(1, 4).join("\n")}`,
    );
  }
}

console.info = originalInfo;

console.log(`\nSimülasyon tamamlandı — ${pass} kontrol geçti, ${failures.length} hata.`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("  ✓ Durum taşıma ve mesaj sistemi tüm senaryolarda doğru çalıştı.");
