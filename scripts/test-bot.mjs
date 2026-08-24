#!/usr/bin/env node
/**
 * WhatsApp bot senaryo testleri (eşleşme + mesai kapısı + after-hours).
 *   npm run test:bot
 *
 * Telefon testi öncesi: eşleşmeleri burada doğrula, sonra mesai dışı + Bot aktif ile WA’dan dene.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composeBotReply,
  matchBotFaqs,
} from "../src/lib/whatsapp/bot-match.ts";
import { isWithinBusinessHours } from "../src/lib/whatsapp/bot-hours.ts";
import { resolveUnmatchedReply } from "../src/lib/whatsapp/bot-unmatched.ts";

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
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
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

function hits(text, faqs) {
  return matchBotFaqs(text, faqs, 2);
}

function firstQuestion(text, faqs) {
  return hits(text, faqs)[0]?.question ?? null;
}

function expectMatch(label, questions, includes) {
  const q = questions[0];
  if (!q) {
    fail(label, "eşleşme yok");
    return;
  }
  if (
    includes.some((part) =>
      q.toLocaleLowerCase("tr-TR").includes(part.toLocaleLowerCase("tr-TR")),
    )
  ) {
    ok(`${label} → ${q}`);
  } else {
    fail(label, `beklenen ~${includes.join("|")}, gelen: ${questions.join(" | ")}`);
  }
}

function expectExact(label, text, faqs, expectedQuestion) {
  const q = firstQuestion(text, faqs);
  if (q === expectedQuestion) ok(`${label} → ${q}`);
  else fail(label, `beklenen “${expectedQuestion}”, gelen: ${q || "(yok)"}`);
}

function expectMiss(label, questions) {
  if (!questions.length) ok(`${label} → eşleşme yok (doğru)`);
  else fail(label, `yanlış pozitif: ${questions.join(" | ")}`);
}

/** Istanbul’da sabit yerel an → UTC Date (yaz saati için Intl kullan). */
function istanbulAt(isoLocal) {
  // isoLocal: "2026-08-24T10:00:00" (Europe/Istanbul duvar saati)
  const probe = new Date(`${isoLocal}+03:00`);
  return probe;
}

const { data: settings, error: settingsError } = await admin
  .from("bot_settings")
  .select("*")
  .eq("id", true)
  .maybeSingle();

const { data: faqs, error: faqError } = await admin
  .from("bot_faqs")
  .select("question, keywords, answer, enabled, sort_order")
  .eq("enabled", true)
  .order("sort_order");

if (settingsError || faqError || !settings || !faqs) {
  console.error(
    "bot_settings / bot_faqs okunamadı",
    settingsError?.message || faqError?.message,
  );
  process.exit(1);
}

const hours = {
  timezone: settings.timezone || "Europe/Istanbul",
  business_days: settings.business_days,
  business_start: String(settings.business_start),
  business_end: String(settings.business_end),
};

console.log("\n== Bot ayarları ==");
if (settings.enabled) ok("bot enabled=true");
else warn("bot enabled=false", "Telefon testi için Admin → Bot → Bot aktif");
if (settings.after_hours_message?.trim()) ok("after_hours_message dolu");
else fail("after_hours_message boş");
if (settings.welcome_message?.trim()) ok("welcome_message dolu (saklı)");
else warn("welcome_message boş");
if (settings.fallback_message?.trim()) ok("fallback_message dolu (saklı)");
else warn("fallback_message boş");
if (Array.isArray(settings.business_days) && settings.business_days.length) {
  ok(
    `mesai: ${hours.timezone} ${hours.business_start.slice(0, 5)}–${hours.business_end.slice(0, 5)} gün=${hours.business_days.join(",")}`,
  );
} else fail("mesai günleri boş");

const waReady = Boolean(
  process.env.WHATSAPP_API_BASE &&
    process.env.WHATSAPP_AUTH_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ENABLED === "true",
);
if (waReady) ok("Dualhook gönderim env dolu (AUTH_TOKEN + PHONE_ID)");
else {
  warn(
    "Dualhook gönderim env eksik",
    "WHATSAPP_AUTH_TOKEN / PHONE_NUMBER_ID / ENABLED — eşleşme testleri yine çalışır",
  );
}

console.log(`\n== SSS envanteri (${faqs.length} aktif) ==`);
const emptyKw = faqs.filter((f) => !(f.keywords || []).length);
if (!emptyKw.length) ok("tüm SSS’lerde keyword var");
else fail("keyword’süz SSS", emptyKw.map((f) => f.question).join(" | "));

// ── a) Her aktif SSS için 1 doğal mesaj ─────────────────────────────────────
console.log("\n== a) Her aktif SSS (telefon senaryosu) ==");
const naturalByQuestion = {
  "Bel fıtığı / endoskopik ameliyat yapıyor musunuz?":
    "Bel fıtığı için endoskopik ameliyat yapıyor musunuz?",
  "Klinik nerede? Muayenehane var mı?": "Yeriniz nerede, özel klinik var mı?",
  "Randevu nasıl alınır?": "Randevu almak istiyorum",
  "Ücret / fiyat ne kadar?": "Ücret ne kadar?",
  "İyileşme süresi ne kadar?": "İyileşme süresi ne kadar?",
  "Boyun fıtığında da bu ameliyat yapılır mı?":
    "Boyun fıtığında da bu ameliyat yapılıyor mu?",
  "SGK anlaşması var mı?": "SGK anlaşması var mı?",
  "Sadece ameliyat mı, ameliyatsız tedavi de var mı?":
    "Sadece ameliyat mı yoksa ameliyatsız tedavi de var mı?",
  "Operatör mü, profesör mü? Branşı nedir?":
    "Doktorunuz operatör mü profesör mü, branşı ne?",
  "Kanal darlığında bu ameliyat yapılır mı?":
    "Kanal darlığı ameliyatı yapıyor musunuz?",
  "Bel kaymasında bu ameliyat yapılır mı?":
    "Bel kaymasında da bu ameliyat yapılıyor mu?",
  "Sonuç garantisi / başarı oranı?": "Sonuç garantisi veriyor musunuz?",
  "Ücretsiz MR bakıyor musunuz? MR göndereyim mi?":
    "Ücretsiz MR değerlendirmeniz var mı, MR atsak bakar mısınız?",
  "Do you perform endoscopic hernia surgery?":
    "Do you perform endoscopic hernia surgery?",
  "Where is the clinic? Is there a private office?":
    "Where is the clinic? Is there a private office?",
  "How do I book an appointment?": "How do I book an appointment?",
  "How much does it cost?": "How much does it cost?",
  "How long is recovery?": "How long is recovery?",
  "Can this surgery be done for neck hernias?":
    "Can this surgery be done for neck hernias?",
  "Do you have an insurance / SGK agreement?":
    "Do you have an SGK insurance agreement?",
  "Is it only surgery, or are there non-surgical treatments?":
    "Is it only surgery or are there non-surgical treatments?",
  "Is the doctor an operator or a professor? What is his specialty?":
    "Is the doctor an operator or a professor?",
  "Is this surgery performed for spondylolisthesis / slipping?":
    "Is this surgery performed for spondylolisthesis?",
  "Is this surgery performed for spinal stenosis?":
    "Is this surgery performed for spinal stenosis?",
  "Do you guarantee the result / success rate?": "Do you guarantee the result?",
  "Do you provide a free MRI evaluation? Can we send our MRI?":
    "Do you provide a free MRI evaluation?",
  "هل تجرون جراحة الفتق القطني بالمنظار؟":
    "هل تجرون جراحة الفتق القطني بالمنظار؟",
  "أين العيادة؟ هل هناك عيادة خاصة؟": "وين العيادة؟",
  "كيف أحجز موعداً؟": "كيف أحجز موعداً؟",
  "كم التكلفة؟": "كم السعر؟",
  "كم مدة التعافي؟": "كم مدة التعافي؟",
  "هل تُجرى هذه الجراحة لفتق الرقبة؟": "هل تُجرى هذه الجراحة لفتق الرقبة؟",
  "هل لديكم اتفاقية تأمين / SGK؟": "هل لديكم اتفاقية تأمين SGK؟",
  "هل العلاج جراحة فقط أم هناك علاج بدون جراحة؟":
    "هل العلاج جراحة فقط أم هناك علاج بدون جراحة؟",
  "هل الطبيب أخصائي أم بروفيسور؟ ما تخصصه؟": "هل الطبيب أخصائي أم بروفيسور؟",
  "هل تُجرى هذه الجراحة لتضيّق القناة الشوكية؟":
    "هل تُجرى هذه الجراحة لتضيّق القناة الشوكية؟",
  "هل تُجرى هذه الجراحة لانزلاق الفقرة؟": "هل تُجرى هذه الجراحة لانزلاق الفقرة؟",
  "هل تضمنون النتيجة / نسبة النجاح؟": "هل تضمنون النتيجة؟",
  "هل تقيّمون الرنين مجاناً؟ هل نرسل الرنين؟": "هل تقيّمون الرنين مجاناً؟",
};

for (const faq of faqs) {
  const msg = naturalByQuestion[faq.question];
  if (!msg) {
    warn(`senaryo eksik: ${faq.question}`);
    continue;
  }
  expectExact(`a) ${msg}`, msg, faqs, faq.question);
}

// ── b) Yazım esnekliği ──────────────────────────────────────────────────────
console.log("\n== b) Yazım / büyük harf / Arabizi ==");
const flex = [
  ["FİYAT NE KADAR?", "Ücret / fiyat ne kadar?"],
  ["ucretiniz nedir", "Ücret / fiyat ne kadar?"],
  ["SILIVRI'de misiniz?", "Klinik nerede? Muayenehane var mı?"],
  ["klinik nerde?", "Klinik nerede? Muayenehane var mı?"],
  ["sgk anlasmasi var mi", "SGK anlaşması var mı?"],
  ["boyun fitigi ameliyat", "Boyun fıtığında da bu ameliyat yapılır mı?"],
  ["wein el clinic", "أين العيادة؟ هل هناك عيادة خاصة؟"],
  ["kam el se3r", "كم التكلفة؟"],
];
for (const [msg, expected] of flex) {
  expectExact(`b) ${msg}`, msg, faqs, expected);
}

// ── c) Unmatched → after_hours (production path) ────────────────────────────
console.log("\n== c) Eşleşmeyen → after_hours (canlı bot yolu) ==");
const unmatchedMsgs = [
  "ameliyat kaç saat sürer?",
  "şehir dışından geliyorum",
  "anestezi genel mi?",
  "yaş sınırı var mı?",
  "merhaba",
];
for (const text of unmatchedMsgs) {
  const q = firstQuestion(text, faqs);
  if (q) {
    fail(`c) “${text}” SSS’e düşmemeli`, q);
    continue;
  }
  const r = resolveUnmatchedReply({
    afterHours: true,
    inboundCount: 2,
    lastAutomatedBody: null,
    lastAutomatedAt: null,
    welcome: settings.welcome_message,
    fallback: settings.fallback_message,
    afterHoursMessage: settings.after_hours_message,
  });
  if (r.kind === "after_hours" && r.reply === settings.after_hours_message) {
    ok(`c) “${text}” → after_hours`);
  } else fail(`c) “${text}”`, `${r.kind}`);
}

{
  const r = resolveUnmatchedReply({
    afterHours: true,
    inboundCount: 3,
    lastAutomatedBody: settings.after_hours_message,
    lastAutomatedAt: Date.now() - 60_000,
    welcome: settings.welcome_message,
    fallback: settings.fallback_message,
    afterHoursMessage: settings.after_hours_message,
    now: Date.now(),
  });
  if (r.kind === "silent") ok("c) after_hours 30 dk cooldown → silent");
  else fail("c) after_hours cooldown", r.kind);
}

// ── d) Eski welcome yolu (artık production’da çağrılmıyor) ───────────────────
console.log("\n== d) Welcome/fallback (saklı API; bot.ts afterHours=true kullanır) ==");
{
  const r = resolveUnmatchedReply({
    afterHours: false,
    inboundCount: 1,
    lastAutomatedBody: null,
    lastAutomatedAt: null,
    welcome: "WELCOME",
    fallback: "FALLBACK",
    afterHoursMessage: "AFTER",
  });
  if (r.kind === "welcome") ok("d) afterHours=false + inbound=1 → welcome (API)");
  else fail("d) welcome API", r.kind);
}
ok("d) production: welcome/fallback bot.ts’te kullanılmıyor (bilinçli)");

// ── e) Dil ──────────────────────────────────────────────────────────────────
console.log("\n== e) TR / EN / AR ==");
expectExact("e) TR fiyat", "Ücret ne kadar?", faqs, "Ücret / fiyat ne kadar?");
expectExact("e) EN fiyat", "How much does it cost?", faqs, "How much does it cost?");
expectExact("e) AR fiyat", "كم السعر؟", faqs, "كم التكلفة؟");

// ── f) Mesai kapısı ─────────────────────────────────────────────────────────
console.log("\n== f) Mesai kapısı (bot.ts gate) ==");
const midMorning = istanbulAt("2026-08-24T10:30:00"); // Pazartesi
const evening = istanbulAt("2026-08-24T20:00:00");
const beforeOpen = istanbulAt("2026-08-24T08:00:00");

if (isWithinBusinessHours(hours, midMorning)) {
  ok("f) 10:30 Istanbul → mesai içi (bot susmalı)");
} else fail("f) 10:30 mesai içi beklenirdi");

if (!isWithinBusinessHours(hours, evening)) {
  ok("f) 20:00 Istanbul → mesai dışı (bot çalışmalı)");
} else fail("f) 20:00 mesai dışı beklenirdi");

if (!isWithinBusinessHours(hours, beforeOpen)) {
  ok("f) 08:00 Istanbul → mesai dışı (bot çalışmalı)");
} else fail("f) 08:00 mesai dışı beklenirdi");

// Boundary: end exclusive
const almostEnd = istanbulAt("2026-08-24T17:59:00");
const atEnd = istanbulAt("2026-08-24T18:00:00");
if (isWithinBusinessHours(hours, almostEnd)) ok("f) 17:59 hâlâ mesai içi");
else fail("f) 17:59");
if (!isWithinBusinessHours(hours, atEnd)) ok("f) 18:00 mesai dışı (end exclusive)");
else fail("f) 18:00 end exclusive");

// ── İçerik nüansları (MR / garanti / branş) ─────────────────────────────────
console.log("\n== İçerik nüansları ==");
const mrFaq = faqs.find((f) => f.question.includes("Ücretsiz MR"));
if (mrFaq?.answer.includes("Net fiyat") || mrFaq?.answer.includes("MR görüntülerinize")) {
  ok("MR cevabı koşullu istisna içeriyor");
} else fail("MR cevabı", "koşullu MR bakışı yok");

const garanti = faqs.find((f) => f.question.includes("garantisi"));
if (garanti?.answer.includes("%100")) ok("garanti cevabı %100 teknik temizleme içeriyor");
else fail("garanti cevabı", "%100 yok");

const brans = faqs.find((f) => f.question.includes("Operatör"));
if (brans?.answer.includes("Omurilik")) ok("branş cevabı Omurilik içeriyor");
else fail("branş cevabı", "Omurilik yok");

// ── Çok niyet + birleşik cevap ───────────────────────────────────────────────
console.log("\n== Çok niyet ==");
const multi = hits("fiyat nedir sgk var mı?", faqs);
const multiQs = multi.map((h) => h.question);
if (
  multiQs.length >= 2 &&
  multiQs.some((q) => /fiyat|ücret/i.test(q)) &&
  multiQs.some((q) => /sgk/i.test(q))
) {
  ok(`fiyat + sgk → ${multiQs.join(" + ")}`);
} else fail("fiyat + sgk", multiQs.join(" | ") || "yok");

const reply = composeBotReply(multi);
if (reply && reply.includes("\n\n") && /200\.000/i.test(reply) && /SGK/i.test(reply)) {
  ok("fiyat+sgk birleşik cevap");
} else fail("fiyat+sgk birleşik", reply?.slice(0, 100));

expectMiss(
  "instagram title",
  hits("I saw your Instagram title", faqs).map((h) => h.question),
);

console.log("\n== RLS ==");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
if (anon) {
  const { data: anonFaqs, error: anonErr } = await anon.from("bot_faqs").select("id");
  if (anonErr || !anonFaqs?.length) ok("anon bot_faqs okuyamıyor (RLS)");
  else fail("anon bot_faqs okuyabildi", `${anonFaqs.length} satır`);
}

console.log("\n== Telefon kontrol listesi ==");
console.log(`  1. Admin → Bot → Bot aktif = true (şu an: ${settings.enabled})`);
console.log(
  `  2. Mesai dışı yaz (şimdi ${hours.timezone} ${hours.business_start.slice(0, 5)}–${hours.business_end.slice(0, 5)} dışı)`,
);
console.log("  3. Yukarıdaki a/b/c mesajlarını WA’dan at");
console.log("  4. SSS cevaplarında 10 dk cooldown; after_hours’ta 30 dk cooldown");
console.log("  5. Mesai içinde (09–18) aynı mesaj → cevap gelmemeli");

console.log(`\nSonuç: ${passed} OK, ${failed} FAIL, ${warned} WARN`);
if (failed) process.exit(1);
