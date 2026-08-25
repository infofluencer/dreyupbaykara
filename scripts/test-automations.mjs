#!/usr/bin/env node
/**
 * WhatsApp otomasyon: zamanlama + şablon specleri + (opsiyonel) DB kuralları.
 * Meta şablon onayından / kural açmadan ÖNCE çalıştırın — gerçek WA gönderimi yok.
 *
 *   npm run test:automations
 *   npm run test:automations -- --db          # message_rules şema kontrolü
 *   npm run test:automations -- --dry-run     # aday randevu sorgusu (göndermez)
 *
 * --dry-run için .env.local’da SUPABASE anahtarları gerekir.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildTemplateBodyComponents,
  istanbulDayBoundsUtc,
  isRuleDueNow,
  normalizePhoneDigits,
  offsetDueAtMs,
  previewAutomationBody,
} from "../src/lib/whatsapp/automation-timing.ts";
import {
  POSTOP_BILGILENDIRME_BODY,
  WA_AUTOMATION_TEMPLATE_SPECS,
} from "../src/lib/whatsapp/automation-templates.ts";

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

console.log("\n=== Şablon / body helpers ===\n");

{
  const names = WA_AUTOMATION_TEMPLATE_SPECS.map((s) => s.templateName);
  expect(
    "tam 3 şablon",
    names.length === 3,
    `count=${names.length}`,
  );
  expect(
    "şablon adları sabit",
    names.join(",") ===
      "randevu_1_gun,randevu_1_saat,ameliyat_sonrasi_bilgi",
    names.join(","),
  );
}

{
  const len = [...POSTOP_BILGILENDIRME_BODY].length;
  expect(
    "postop body ≤ 1024 (Meta limiti)",
    len <= 1024,
    `len=${len}`,
  );
  expect("postop body boş değil", len > 100);
}

{
  for (const spec of WA_AUTOMATION_TEMPLATE_SPECS) {
    if (spec.key === "surgery_day") {
      expect(
        `${spec.templateName}: değişken yok`,
        spec.bodyParams.length === 0,
      );
    } else {
      expect(
        `${spec.templateName}: 3 body param`,
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
  expect(
    "boş ad → varsayılan",
    buildTemplateBodyComponents("  ", starts)[0].parameters[0].text ===
      "Değerli hastamız",
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
      for (const key of ["appt_1d", "appt_1h", "surgery_day"]) {
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
            "surgery lead randevulu|bitti",
            leads.includes("randevulu") && leads.includes("bitti"),
            leads.join(","),
          );
        }
        if (surgery.enabled) {
          warn(
            "surgery_day şu an AÇIK",
            "Meta şablonu onaylı değilse gönderme hatası alırsınız",
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
        const timingMode = rule.timing_mode || "before_start";
        const statuses =
          rule.appointment_statuses?.length > 0
            ? rule.appointment_statuses
            : timingMode === "calendar_day"
              ? ["scheduled", "confirmed", "completed"]
              : ["scheduled", "confirmed"];
        const types =
          rule.appointment_types?.length > 0
            ? rule.appointment_types
            : ["consultation"];
        const leadStatuses =
          rule.lead_statuses?.length > 0
            ? rule.lead_statuses
            : timingMode === "calendar_day"
              ? ["randevulu", "bitti"]
              : ["randevulu"];

        let from;
        let to;
        if (timingMode === "calendar_day") {
          ({ from, to } = istanbulDayBoundsUtc(now));
        } else {
          from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          to = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        }

        let query = admin
          .from("appointments")
          .select(
            `
            id,
            starts_at,
            appointment_type,
            status,
            leads!inner (
              status,
              contacts ( phone, name )
            )
          `,
          )
          .in("status", statuses)
          .in("appointment_type", types)
          .gte("starts_at", from.toISOString())
          .lte("starts_at", to.toISOString())
          .limit(50);

        if (rule.lead_statuses != null || "lead_statuses" in rule) {
          query = query.in("leads.status", leadStatuses);
        }

        const { data: rows, error: qErr } = await query;

        if (qErr) {
          fail(`dry-run sorgu ${rule.key}`, qErr.message);
          continue;
        }

        let dueCount = 0;
        for (const row of rows ?? []) {
          if (
            isRuleDueNow(
              {
                offset_minutes: rule.offset_minutes,
                send_at_local_time: rule.send_at_local_time,
                timing_mode: timingMode,
              },
              row.starts_at,
              now,
            )
          ) {
            dueCount += 1;
          }
        }

        const enabledLabel = rule.enabled ? "AÇIK" : "kapalı";
        ok(
          `${rule.key} [${enabledLabel}]: aday=${rows?.length ?? 0}, şu an due=${dueCount}`,
        );
        if (rule.enabled && dueCount > 0) {
          warn(
            `${rule.key}: canlıda ${dueCount} gönderim adayı`,
            "Meta şablonu yoksa cron hata verir — kuralı kapalı tutun",
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
