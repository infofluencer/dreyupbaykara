#!/usr/bin/env node
/**
 * WhatsApp otomasyon: zamanlama + mesaj specleri + (opsiyonel) DB kuralları.
 * Kural açmadan ÖNCE çalıştırın — gerçek WA gönderimi yok.
 *
 *   npm run test:automations
 *   npm run test:automations -- --db          # message_rules şema kontrolü
 *   npm run test:automations -- --dry-run     # kime gidecek (göndermez)
 *
 * --dry-run için .env.local’da SUPABASE anahtarları gerekir. Adayları cron'un
 * kullandığı fonksiyonlardan okur — ayrı sorgu yazılmamalı, yoksa araç canlı
 * davranıştan sapar ve yanlış isim/sayı gösterir.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildTemplateBodyComponents,
  fillAutomationBodyPlaceholders,
  istanbulDayBoundsUtc,
  isPostStatusSendDue,
  isRuleDueNow,
  normalizePhoneDigits,
  offsetDueAtMs,
  previewAutomationBody,
} from "../src/lib/whatsapp/automation-timing.ts";
import {
  GOOGLE_MAPS_REVIEW_URL,
  POSTOP_BILGILENDIRME_BODY,
  priorAutomationRuleKey,
  resolveAutomationMessageBody,
  WA_AUTOMATION_TEMPLATE_SPECS,
} from "../src/lib/whatsapp/automation-templates.ts";
import {
  alreadyDispatched,
  isPhoneOptedOut,
  isSurgeryPostopRule,
  loadCandidateAppointments,
  loadSurgeryPostopCandidates,
  priorRuleSent,
} from "../src/lib/whatsapp/automations.ts";
import {
  leadStatusAfterAppointmentEnds,
  leadStatusForBookedAppointment,
} from "../src/lib/crm/appointment-pipeline.ts";
import {
  findFreeAppointmentSlot,
  toOccupiedRange,
} from "../src/lib/crm/surgery-backfill.ts";
import {
  isRetryableDeliveryCode,
  MAX_DISPATCH_RETRIES,
  shouldReopenDispatch,
} from "../src/lib/whatsapp/delivery-errors.ts";

const WITH_DB = process.argv.includes("--db");
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

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

function expect(label, condition, detail) {
  if (condition) ok(label);
  else fail(label, detail);
}

/** Istanbul duvar saati → Date (UTC+3). */
function istanbulAt(isoLocal) {
  return new Date(`${isoLocal}+03:00`);
}

const RULE_1D = {
  offset_minutes: 1440,
  send_at_local_time: null,
  timing_mode: "before_start",
};
const RULE_1H = {
  offset_minutes: 60,
  send_at_local_time: null,
  timing_mode: "before_start",
};
const RULE_SURGERY_2D = {
  offset_minutes: 2880,
  send_at_local_time: null,
  timing_mode: "before_start",
};
const RULE_POSTOP = {
  offset_minutes: 0,
  send_at_local_time: "16:00",
  timing_mode: "calendar_day",
};

console.log("\n=== Otomasyon zamanlama (unit) ===\n");

{
  const starts = istanbulAt("2026-08-26T10:00:00").toISOString();
  const dueMs = offsetDueAtMs(starts, 1440);
  const expected = istanbulAt("2026-08-25T10:00:00").getTime();
  expect(
    "offsetDueAtMs 1440 → 1 gün önce",
    dueMs === expected,
    `got ${new Date(dueMs).toISOString()}`,
  );
}

{
  const starts = istanbulAt("2026-08-26T10:00:00").toISOString();
  // pencere: 25.08 10:00 ≤ now < 26.08 10:00
  expect(
    "appt_1d: randevudan 24s önce due",
    isRuleDueNow(RULE_1D, starts, istanbulAt("2026-08-25T10:00:00")),
  );
  expect(
    "appt_1d: 23s önce henüz due değil",
    !isRuleDueNow(RULE_1D, starts, istanbulAt("2026-08-25T09:00:00")),
  );
  expect(
    "appt_1d: randevu anında due değil",
    !isRuleDueNow(RULE_1D, starts, istanbulAt("2026-08-26T10:00:00")),
  );
  expect(
    "appt_1d: randevu sonrası due değil",
    !isRuleDueNow(RULE_1D, starts, istanbulAt("2026-08-26T11:00:00")),
  );
}

{
  const starts = istanbulAt("2026-08-26T10:00:00").toISOString();
  expect(
    "appt_1h: 60 dk önce due",
    isRuleDueNow(RULE_1H, starts, istanbulAt("2026-08-26T09:00:00")),
  );
  expect(
    "appt_1h: 90 dk önce due değil",
    !isRuleDueNow(RULE_1H, starts, istanbulAt("2026-08-26T08:30:00")),
  );
  expect(
    "appt_1h: randevu sonrası due değil",
    !isRuleDueNow(RULE_1H, starts, istanbulAt("2026-08-26T10:30:00")),
  );
}

{
  const starts = istanbulAt("2026-08-26T10:00:00").toISOString();
  // pencere: 24.08 10:00 ≤ now < 26.08 10:00
  expect(
    "surgery_2d: 48s kala due",
    isRuleDueNow(RULE_SURGERY_2D, starts, istanbulAt("2026-08-24T10:00:00")),
  );
  expect(
    "surgery_2d: 47s kala due",
    isRuleDueNow(RULE_SURGERY_2D, starts, istanbulAt("2026-08-24T11:00:00")),
  );
  expect(
    "surgery_2d: 49s kala due değil",
    !isRuleDueNow(RULE_SURGERY_2D, starts, istanbulAt("2026-08-24T09:00:00")),
  );
  expect(
    "surgery_2d: ameliyat anında due değil",
    !isRuleDueNow(RULE_SURGERY_2D, starts, istanbulAt("2026-08-26T10:00:00")),
  );
}

{
  const starts = istanbulAt("2026-08-26T09:00:00").toISOString();
  expect(
    "postop: aynı gün 15:59 due değil",
    !isRuleDueNow(RULE_POSTOP, starts, istanbulAt("2026-08-26T15:59:00")),
  );
  expect(
    "postop: aynı gün 16:00 due (ameliyat sonrası OK)",
    isRuleDueNow(RULE_POSTOP, starts, istanbulAt("2026-08-26T16:00:00")),
  );
  expect(
    "postop: aynı gün 18:00 due",
    isRuleDueNow(RULE_POSTOP, starts, istanbulAt("2026-08-26T18:00:00")),
  );
  expect(
    "postop: ertesi gün due değil",
    !isRuleDueNow(RULE_POSTOP, starts, istanbulAt("2026-08-27T16:00:00")),
  );
  expect(
    "postop: önceki gün due değil",
    !isRuleDueNow(RULE_POSTOP, starts, istanbulAt("2026-08-25T16:00:00")),
  );
}

{
  // Eski before_start + local time: randevu BAŞLAMADAN önce
  const morningRule = {
    offset_minutes: 0,
    send_at_local_time: "08:00",
    timing_mode: "before_start",
  };
  const starts = istanbulAt("2026-08-26T10:00:00").toISOString();
  expect(
    "before_start 08:00: sabah due",
    isRuleDueNow(morningRule, starts, istanbulAt("2026-08-26T08:15:00")),
  );
  expect(
    "before_start 08:00: randevu sonrası due değil",
    !isRuleDueNow(morningRule, starts, istanbulAt("2026-08-26T11:00:00")),
  );
}

{
  const now = istanbulAt("2026-08-26T16:30:00");
  const { from, to } = istanbulDayBoundsUtc(now);
  expect(
    "istanbulDayBounds: başlangıç günün 00:00 TR",
    from.toISOString() === istanbulAt("2026-08-26T00:00:00").toISOString(),
    from.toISOString(),
  );
  expect(
    "istanbulDayBounds: bitiş aynı gün içinde",
    to > from && istanbulAt("2026-08-26T23:59:00") <= to,
    `to=${to.toISOString()}`,
  );
  // Sabah ameliyatı gün penceresinde
  const surgeryMorning = istanbulAt("2026-08-26T09:00:00");
  expect(
    "istanbulDayBounds: sabah ameliyatı pencerede",
    surgeryMorning >= from && surgeryMorning <= to,
  );
}

{
  console.log("\n=== Pipeline / status_day ===\n");
  expect(
    "procedure → ameliyat_olacak",
    leadStatusForBookedAppointment("procedure") === "ameliyat_olacak",
  );
  expect(
    "consultation da → ameliyat_olacak (surgery-only)",
    leadStatusForBookedAppointment("consultation") === "ameliyat_olacak",
  );
  expect(
    "procedure ends → ameliyat_edildi",
    leadStatusAfterAppointmentEnds("procedure") === "ameliyat_edildi",
  );
  expect(
    "consultation ends → ameliyat_edildi (surgery-only)",
    leadStatusAfterAppointmentEnds("consultation") === "ameliyat_edildi",
  );

  const changedMorning = new Date("2026-08-26T08:00:00+03:00");
  const before16 = new Date("2026-08-26T15:59:00+03:00");
  const at16 = new Date("2026-08-26T16:00:00+03:00");
  const changedEvening = new Date("2026-08-26T18:30:00+03:00");
  const eveningNow = new Date("2026-08-26T18:31:00+03:00");
  const nextDay = new Date("2026-08-27T17:00:00+03:00");

  expect(
    "status_day: sabah geçiş, 15:59 due değil",
    !isPostStatusSendDue(changedMorning, "16:00", before16),
  );
  expect(
    "status_day: sabah geçiş, 16:00 due",
    isPostStatusSendDue(changedMorning, "16:00", at16),
  );
  expect(
    "status_day: 18:30 geçiş → hemen due",
    isPostStatusSendDue(changedEvening, "16:00", eveningNow),
  );
  expect(
    "status_day: ertesi gün due değil",
    !isPostStatusSendDue(changedMorning, "16:00", nextDay),
  );
}

{
  console.log("\n=== Ameliyat randevusu geri doldurma ===\n");
  const dayStartMs = istanbulAt("2026-09-14T00:00:00").getTime();
  const dayEndMs = istanbulAt("2026-09-14T23:59:59.999").getTime();
  const at = (hm) => istanbulAt(`2026-09-14T${hm}:00`).getTime();
  const slot = (occupied, hm) =>
    findFreeAppointmentSlot({
      occupied,
      preferredMs: at(hm),
      dayStartMs,
      dayEndMs,
    });

  expect(
    "boş gün: taşınma saati yarım saatlik ızgaraya hizalanır (13:35 → 13:30)",
    slot([], "13:35") === at("13:30"),
  );
  expect(
    "dolu slot: yarım saat geriye kayar",
    slot([{ startMs: at("13:30"), endMs: at("14:00") }], "13:35") === at("13:00"),
  );
  expect(
    "uzun randevu: bloğun tamamını atlar",
    slot([{ startMs: at("12:30"), endMs: at("14:00") }], "13:35") === at("12:00"),
  );
  expect(
    "gün başı doluysa ileriye arar",
    slot([{ startMs: dayStartMs, endMs: at("14:00") }], "13:35") === at("14:00"),
  );
  expect(
    "gün tamamen doluysa null",
    slot([{ startMs: dayStartMs, endMs: dayEndMs }], "13:35") === null,
  );
  expect(
    "ends_at boş randevu 30 dk sayılır (çakışma engeliyle aynı kural)",
    toOccupiedRange({
      starts_at: new Date(at("10:00")).toISOString(),
      ends_at: null,
    }).endMs === at("10:30"),
  );
}

{
  console.log("\n=== Teslim hatası: geçici mi, kalıcı mı ===\n");

  expect(
    "131042 ödeme sorunu tekrar denenir",
    isRetryableDeliveryCode(131042),
  );
  expect("130429 hız limiti tekrar denenir", isRetryableDeliveryCode(130429));
  expect("131056 çift hız limiti tekrar denenir", isRetryableDeliveryCode(131056));
  expect("131000 Meta iç hatası tekrar denenir", isRetryableDeliveryCode(131000));

  // En kritik ayrım: pazarlama kotası alıcıya ait ve Meta 24 saat bekletiyor.
  // Bizim tekrar penceresi 1 saat olduğu için denemek boşa gider.
  expect(
    "131049 pazarlama kotası tekrar DENENMEZ",
    !isRetryableDeliveryCode(131049),
  );
  expect("131026 iletilemez (kalıcı) denenmez", !isRetryableDeliveryCode(131026));
  expect("132001 şablon hatası denenmez", !isRetryableDeliveryCode(132001));
  expect("133010 hesap kısıtlı denenmez", !isRetryableDeliveryCode(133010));
  expect("kod yoksa denenmez", !isRetryableDeliveryCode(undefined));
  expect("kod null ise denenmez", !isRetryableDeliveryCode(null));

  expect(
    "geçici hata + bütçe var → yeniden aç",
    shouldReopenDispatch({ code: 131042, retryCount: 0 }),
  );
  expect(
    "geçici hata + son deneme → yeniden aç",
    shouldReopenDispatch({ code: 131042, retryCount: MAX_DISPATCH_RETRIES - 1 }),
  );
  expect(
    "bütçe bitti → yeniden açma (mükerrer mesaj emniyeti)",
    !shouldReopenDispatch({ code: 131042, retryCount: MAX_DISPATCH_RETRIES }),
  );
  expect(
    "kalıcı hata bütçe dolu olsa da açılmaz",
    !shouldReopenDispatch({ code: 131049, retryCount: 0 }),
  );
  expect("tekrar sınırı makul (1-3)", MAX_DISPATCH_RETRIES >= 1 && MAX_DISPATCH_RETRIES <= 3);
}

console.log("\n=== Mesaj / body helpers ===\n");

{
  const keys = WA_AUTOMATION_TEMPLATE_SPECS.map((s) => s.key);
  expect("tam 5 otomasyon", keys.length === 5, `count=${keys.length}`);
  expect(
    "kural anahtarları sabit",
    keys.join(",") ===
      "appt_1d,appt_1h,surgery_2d,surgery_day,surgery_google_review",
    keys.join(","),
  );
}

{
  const len = [...POSTOP_BILGILENDIRME_BODY].length;
  expect("postop body boş değil", len > 100);
}

{
  for (const spec of WA_AUTOMATION_TEMPLATE_SPECS) {
    if (spec.bodyParams.length === 0) {
      expect(`${spec.key}: değişken yok`, spec.bodyParams.length === 0);
    } else if (spec.key === "surgery_2d") {
      expect(
        `${spec.key}: 2 body param (ad+tarih)`,
        spec.bodyParams.length === 2 &&
          spec.bodyParams.join(",") === "name,date",
      );
    } else {
      expect(
        `${spec.key}: 3 body param`,
        spec.bodyParams.length === 3 &&
          spec.bodyParams.join(",") === "name,date,time",
      );
    }
  }
}

{
  const starts = istanbulAt("2026-08-26T10:30:00").toISOString();
  const comps = buildTemplateBodyComponents("Ayşe Yılmaz", starts);
  const texts = comps[0]?.parameters?.map((p) => p.text) ?? [];
  expect("body {{1}} ad", texts[0] === "Ayşe Yılmaz", texts[0]);
  expect("body {{2}} tarih TR", texts[1] === "26.08.2026", texts[1]);
  expect("body {{3}} saat", texts[2] === "10:30", texts[2]);
  const surgeryComps = buildTemplateBodyComponents("Ayşe Yılmaz", starts, [
    "name",
    "date",
  ]);
  expect(
    "surgery_2d body 2 param",
    surgeryComps[0].parameters.length === 2 &&
      surgeryComps[0].parameters[1].text === "26.08.2026",
  );
  expect(
    "boş ad → varsayılan",
    buildTemplateBodyComponents("  ", starts)[0].parameters[0].text ===
      "Değerli hastamız",
  );

  const filled = fillAutomationBodyPlaceholders(
    "Merhaba {{1}}, yarın ({{2}}) saat {{3}}",
    "Ayşe Yılmaz",
    starts,
  );
  expect(
    "fill placeholders",
    filled === "Merhaba Ayşe Yılmaz, yarın (26.08.2026) saat 10:30",
    filled,
  );

  const apptBody = resolveAutomationMessageBody("appt_1d", "Ayşe", starts);
  expect(
    "resolve appt_1d",
    Boolean(apptBody?.includes("Ayşe") && apptBody?.includes("26.08.2026")),
    apptBody,
  );

  const surgery2dBody = resolveAutomationMessageBody(
    "surgery_2d",
    "Ayşe",
    starts,
  );
  expect(
    "resolve surgery_2d teyit",
    Boolean(
      surgery2dBody?.includes("Ayşe") &&
        surgery2dBody?.includes("ameliyat randevunuz") &&
        surgery2dBody?.includes("teyit"),
    ),
    surgery2dBody?.slice(0, 120),
  );

  const reviewBody = resolveAutomationMessageBody(
    "surgery_google_review",
    null,
    starts,
  );
  expect(
    "google review URL in body",
    Boolean(reviewBody?.includes(GOOGLE_MAPS_REVIEW_URL)),
    reviewBody?.slice(0, 80),
  );
}

{
  expect(
    "normalizePhoneDigits",
    normalizePhoneDigits("+90 532 111 22 33") === "905321112233",
  );
  expect("normalizePhoneDigits boş", normalizePhoneDigits(null) === "");
  expect(
    "previewAutomationBody ad içerir",
    previewAutomationBody("Ali", istanbulAt("2026-08-26T10:00:00").toISOString()).includes(
      "Ali",
    ),
  );
}

if (WITH_DB || DRY_RUN) {
  console.log("\n=== DB: message_rules ===\n");
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail(
      "Supabase env",
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY gerekli",
    );
  } else {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rules, error } = await admin
      .from("message_rules")
      .select("*")
      .order("sort_order");

    if (error) {
      fail(
        "message_rules okunamadı",
        `${error.message} — önce 20260823200000_wa_message_automations.sql`,
      );
    } else {
      const byKey = Object.fromEntries((rules ?? []).map((r) => [r.key, r]));
      for (const key of ["appt_1d", "appt_1h", "surgery_2d", "surgery_day"]) {
        expect(`kural var: ${key}`, Boolean(byKey[key]));
      }

      const sample = rules?.[0] ?? null;
      if (sample && !("lead_statuses" in sample)) {
        fail(
          "lead_statuses kolonu yok",
          "20260824140000_message_rules_lead_statuses.sql uygulayın",
        );
      } else if (sample) {
        ok("lead_statuses kolonu var");
      }
      if (sample && !("timing_mode" in sample)) {
        fail(
          "timing_mode kolonu yok",
          "20260824150000_postop_bilgilendirme_rule.sql uygulayın",
        );
      } else if (sample) {
        ok("timing_mode kolonu var");
      }

      const appt1d = byKey.appt_1d;
      if (appt1d) {
        expect("appt_1d template", appt1d.template_name === "randevu_1_gun");
        expect("appt_1d offset 1440", appt1d.offset_minutes === 1440);
        if ("timing_mode" in appt1d) {
          expect(
            "appt_1d timing before_start",
            (appt1d.timing_mode || "before_start") === "before_start",
          );
        }
        if (appt1d.enabled) {
          warn(
            "appt_1d şu an AÇIK",
            "Meta onayı / KVKK hazır değilse kapalı tutun",
          );
        } else ok("appt_1d kapalı (güvenli varsayılan)");
      }

      const appt1h = byKey.appt_1h;
      if (appt1h) {
        expect("appt_1h template", appt1h.template_name === "randevu_1_saat");
        expect("appt_1h offset 60", appt1h.offset_minutes === 60);
      }

      const surgery2d = byKey.surgery_2d;
      if (surgery2d) {
        expect(
          "surgery_2d template",
          surgery2d.template_name === "ameliyat_2_gun",
        );
        expect("surgery_2d offset 2880", surgery2d.offset_minutes === 2880);
        if ("timing_mode" in surgery2d) {
          expect(
            "surgery_2d timing before_start",
            (surgery2d.timing_mode || "before_start") === "before_start",
          );
        }
        const types = surgery2d.appointment_types || [];
        expect(
          "surgery_2d tipi procedure",
          types.includes("procedure"),
          types.join(","),
        );
        if ("lead_statuses" in surgery2d) {
          const leads = surgery2d.lead_statuses || [];
          expect(
            "surgery_2d lead ameliyat_olacak",
            leads.includes("ameliyat_olacak") && leads.length === 1,
            leads.join(","),
          );
        }
        if (surgery2d.enabled) {
          warn(
            "surgery_2d şu an AÇIK",
            "Meta şablonu ameliyat_2_gun onaylı olmalı",
          );
        } else ok("surgery_2d kapalı (güvenli varsayılan)");
      }

      const surgery = byKey.surgery_day;
      if (surgery) {
        const expectedName = "ameliyat_sonrasi_bilgi";
        if (surgery.template_name === expectedName) {
          ok("surgery template ameliyat_sonrasi_bilgi");
        } else {
          fail(
            "surgery template henüz postop değil",
            `şu an “${surgery.template_name}” — 24150000 migration sonrası “${expectedName}” olmalı`,
          );
        }
        if ("timing_mode" in surgery) {
          expect(
            "surgery timing calendar_day",
            surgery.timing_mode === "calendar_day",
            String(surgery.timing_mode),
          );
        }
        const t = String(surgery.send_at_local_time || "").slice(0, 5);
        if (t === "16:00") ok("surgery saat 16:00");
        else {
          fail(
            "surgery saat 16:00 olmalı",
            `şu an “${t || "(boş)"}” — migration 24150000`,
          );
        }
        if ("include_body_params" in surgery) {
          expect(
            "surgery body params kapalı",
            surgery.include_body_params === false,
          );
        }
        const types = surgery.appointment_types || [];
        expect(
          "surgery tipi procedure",
          types.includes("procedure"),
          types.join(","),
        );
        if ("lead_statuses" in surgery) {
          const leads = surgery.lead_statuses || [];
          expect(
            "surgery lead ameliyat_edildi",
            leads.includes("ameliyat_edildi") && leads.length === 1,
            leads.join(","),
          );
        }
        if (surgery.enabled) {
          warn(
            "surgery_day şu an AÇIK",
            "Serbest pencere kapalı hastalara mesaj gitmez",
          );
        } else ok("surgery_day kapalı (güvenli varsayılan)");
      }
    }

    if (DRY_RUN && !error) {
      console.log("\n=== Dry-run: aday randevular (gönderim YOK) ===\n");

      const { data: allRules } = await admin
        .from("message_rules")
        .select("*")
        .order("sort_order");

      const now = new Date();
      for (const rule of allRules ?? []) {
        // Adaylar cron'un çağırdığı fonksiyonlardan gelir; ayrı bir sorgu
        // yazmak ikisini ayrıştırır ve dry-run yanlış sayı gösterir.
        let candidates;
        try {
          candidates = isSurgeryPostopRule(rule.key)
            ? await loadSurgeryPostopCandidates(admin, now)
            : await loadCandidateAppointments(admin, rule, now);
        } catch (err) {
          fail(`dry-run sorgu ${rule.key}`, err?.message ?? String(err));
          continue;
        }

        const lines = [];
        let dueCount = 0;
        for (const appt of candidates) {
          const due = isSurgeryPostopRule(rule.key)
            ? Boolean(appt.status_changed_at) &&
              isPostStatusSendDue(
                appt.status_changed_at,
                rule.send_at_local_time,
                now,
              )
            : isRuleDueNow(rule, appt.starts_at, now);

          const phone = appt.contact?.phone
            ? normalizePhoneDigits(appt.contact.phone)
            : "";
          const priorKey = priorAutomationRuleKey(rule.key);

          let verdict;
          if (!phone) verdict = "atlanacak: telefon yok";
          else if (await isPhoneOptedOut(admin, phone))
            verdict = "atlanacak: opt-out";
          else if (await alreadyDispatched(admin, appt.id, rule.key))
            verdict = "atlanacak: zaten işlendi";
          else if (priorKey && !(await priorRuleSent(admin, appt.id, priorKey)))
            verdict = `bekliyor: önce ${priorKey} gitmeli`;
          else if (!due) verdict = "bekliyor: saati gelmedi";
          else {
            verdict = "GİDECEK";
            dueCount += 1;
          }

          lines.push(
            `      ${(appt.contact?.name ?? "?").padEnd(20)} ${(phone || "-").padEnd(13)} ${appt.starts_at}  ${verdict}`,
          );
        }

        const enabledLabel = rule.enabled ? "AÇIK" : "kapalı";
        ok(
          `${rule.key} [${enabledLabel}]: aday=${candidates.length}, şu an gidecek=${dueCount}`,
        );
        for (const line of lines) console.log(line);

        if (rule.enabled && dueCount > 0) {
          warn(
            `${rule.key}: canlıda ${dueCount} gönderim adayı`,
            "Kuralı bilinçli açın — bu kişilere şablon gidecek",
          );
        }
      }
    }
  }
} else {
  console.log(
    "\n(İpucu: şema için --db, aday sayımı için --dry-run ekleyin)\n",
  );
}

console.log(
  `\nSonuç: ${passed} geçti, ${failed} kaldı${warned ? `, ${warned} uyarı` : ""}\n`,
);
process.exit(failed > 0 ? 1 : 0);
