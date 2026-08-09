#!/usr/bin/env node
/**
 * Kural tabanlı WhatsApp bot: eşleşme + kapsama + kenar durumlar.
 *   npm run test:bot
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composeBotReply,
  matchBotFaqs,
} from "../src/lib/whatsapp/bot-match.ts";
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

function expectMiss(label, questions) {
  if (!questions.length) ok(`${label} → eşleşme yok (doğru)`);
  else fail(label, `yanlış pozitif: ${questions.join(" | ")}`);
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
  console.error("bot_settings / bot_faqs okunamadı", settingsError?.message || faqError?.message);
  process.exit(1);
}

console.log("\n== Bot ayarları ==");
if (settings.enabled) ok("bot enabled=true");
else warn("bot enabled=false", "WhatsApp bağlanınca Admin → Bot’tan açılmalı");
if (settings.welcome_message?.trim()) ok("karşılama mesajı dolu");
else fail("karşılama mesajı boş");
if (settings.after_hours_message?.trim()) ok("mesai dışı mesajı dolu");
else fail("mesai dışı mesajı boş");
if (settings.fallback_message?.trim()) ok("fallback mesajı dolu");
else fail("fallback mesajı boş");
if (/[\u0600-\u06FF]/.test(settings.welcome_message || "")) ok("karşılama Arapça satır içeriyor");
else warn("karşılama Arapça yok", "welcome_message TR/EN/AR olmalı");
if (Array.isArray(settings.business_days) && settings.business_days.length) {
  ok(`mesai günleri: ${settings.business_days.join(",")}`);
} else fail("mesai günleri boş");

const waReady = Boolean(
  process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_GRAPH_API_VERSION &&
    process.env.WHATSAPP_APP_SECRET &&
    process.env.WHATSAPP_VERIFY_TOKEN,
);
if (waReady) ok("WhatsApp Cloud API env dolu");
else warn("WhatsApp Cloud API env boş", "Bot eşleşir ama mesaj gönderemez; webhook yok");

console.log(`\n== SSS envanteri (${faqs.length} aktif) ==`);
const emptyKw = faqs.filter((f) => !(f.keywords || []).length);
if (!emptyKw.length) ok("tüm SSS’lerde keyword var");
else fail("keyword’süz SSS", emptyKw.map((f) => f.question).join(" | "));

console.log("\n== Beklenen eşleşmeler ==");
expectMatch("fiyat ne kadar?", hits("fiyat ne kadar?", faqs).map((h) => h.question), ["fiyat", "ücret"]);
expectMatch("ücretiniz nedir", hits("ücretiniz nedir", faqs).map((h) => h.question), ["fiyat", "ücret"]);
expectMatch("klinik nerede", hits("klinik nerede", faqs).map((h) => h.question), ["nerede", "muayenehane", "klinik"]);
expectMatch("muayenehane var mı", hits("muayenehane var mı", faqs).map((h) => h.question), ["nerede", "muayenehane"]);
expectMatch("sgk anlaşması var mı", hits("sgk anlaşması var mı", faqs).map((h) => h.question), ["SGK", "sgk"]);
expectMatch("boyun fıtığında da yapıyor musunuz", hits("boyun fıtığında da yapıyor musunuz", faqs).map((h) => h.question), ["Boyun", "boyun"]);
expectMatch("bel kayması oluyor", hits("bel kayması oluyor", faqs).map((h) => h.question), ["kayma", "Bel kayma"]);
expectMatch("operatör mü profesör mü", hits("operatör mü profesör mü", faqs).map((h) => h.question), ["Operatör", "profesör", "Branş"]);
expectMatch("ücretsiz mr bakar mısınız", hits("ücretsiz mr bakar mısınız", faqs).map((h) => h.question), ["MR", "mr"]);
expectMatch("sonuç garantisi veriyor musunuz", hits("sonuç garantisi veriyor musunuz", faqs).map((h) => h.question), ["garanti", "başarı"]);
expectMatch("ameliyatsız tedavi var mı", hits("ameliyatsız tedavi var mı", faqs).map((h) => h.question), ["ameliyatsız", "Sadece ameliyat"]);
expectMatch("how much does it cost?", hits("how much does it cost?", faqs).map((h) => h.question), ["cost", "How much"]);
expectMatch("where is the clinic?", hits("where is the clinic?", faqs).map((h) => h.question), ["Where", "clinic"]);
expectMatch("do you review MRI?", hits("do you review MRI?", faqs).map((h) => h.question), ["free MRI", "MRI evaluation", "provide a free"]);
expectMatch("is he a professor?", hits("is he a professor?", faqs).map((h) => h.question), ["professor", "operator"]);
expectMatch("spondylolisthesis surgery?", hits("spondylolisthesis surgery?", faqs).map((h) => h.question), ["spondylolisthesis", "slipping"]);
expectMatch("كم السعر؟", hits("كم السعر؟", faqs).map((h) => h.question), ["التكلفة", "كم التكلفة"]);
expectMatch("وين العيادة؟", hits("وين العيادة؟", faqs).map((h) => h.question), ["أين", "العيادة"]);
expectMatch("هل تقيّمون الرنين مجاناً؟", hits("هل تقيّمون الرنين مجاناً؟", faqs).map((h) => h.question), ["الرنين", "رنين"]);
expectMatch("كيف أحجز موعداً؟", hits("كيف أحجز موعداً؟", faqs).map((h) => h.question), ["موعد", "أحجز"]);
expectMatch("هل لديكم تأمين SGK؟", hits("هل لديكم تأمين SGK؟", faqs).map((h) => h.question), ["تأمين", "SGK"]);
expectMatch("wein el clinic", hits("wein el clinic", faqs).map((h) => h.question), ["أين", "العيادة"]);
expectMatch("kam el se3r", hits("kam el se3r", faqs).map((h) => h.question), ["التكلفة", "كم التكلفة"]);
expectMatch("fiyat please", hits("fiyat please", faqs).map((h) => h.question), ["fiyat", "ücret"]);
expectMatch("قديش السعر", hits("قديش السعر", faqs).map((h) => h.question), ["التكلفة", "كم التكلفة"]);
expectMatch("فين العيادة", hits("فين العيادة", faqs).map((h) => h.question), ["أين", "العيادة"]);

console.log("\n== Yazım / büyük harf / typo ==");
expectMatch("FİYAT NE KADAR", hits("FİYAT NE KADAR", faqs).map((h) => h.question), ["fiyat", "ücret"]);
expectMatch("SILIVRI'de misiniz?", hits("SILIVRI'de misiniz?", faqs).map((h) => h.question), ["nerede", "klinik", "Silivri"]);
expectMatch("klinik nerde?", hits("klinik nerde?", faqs).map((h) => h.question), ["nerede", "klinik"]);

console.log("\n== Yanlış pozitif / çok niyet ==");
expectMatch(
  "ne kadar sürede iyileşirim?",
  hits("ne kadar sürede iyileşirim?", faqs).map((h) => h.question),
  ["İyileşme", "iyileş", "recovery"],
);
expectMiss(
  "instagram title",
  hits("I saw your Instagram title", faqs).map((h) => h.question),
);
expectMatch(
  "do you treat slipped disc?",
  hits("do you treat slipped disc?", faqs).map((h) => h.question),
  ["hernia", "endoscopic", "fıtık"],
);

const multi = hits("fiyat nedir sgk var mı?", faqs);
const multiQs = multi.map((h) => h.question);
if (multiQs.length >= 2 && multiQs.some((q) => /fiyat|ücret/i.test(q)) && multiQs.some((q) => /sgk/i.test(q))) {
  ok(`fiyat + sgk → ${multiQs.join(" + ")}`);
} else {
  fail("fiyat + sgk tek mesaj", multiQs.join(" | ") || "eşleşme yok");
}

const reply = composeBotReply(multi);
if (reply && reply.includes("\n\n") && /200\.000/i.test(reply) && /SGK/i.test(reply)) {
  ok("fiyat+sgk birleşik cevap (iki paragraf)");
} else fail("fiyat+sgk birleşik cevap", reply?.slice(0, 120));

const devlet = firstQuestion("devlet hastanesi mi özel mi?", faqs);
if (!devlet || /nerede|klinik|SGK|sgk/i.test(devlet)) {
  warn("devlet hastanesi mi?", devlet || "eşleşme yok — fallback kabul");
} else fail("devlet hastanesi mi?", devlet);

console.log("\n== Kapsama ==");
const coverage = [
  ["bel fıtığı ameliyatı yapıyor musunuz?", ["fıtık", "endoskopik", "Bel fıtığı"]],
  ["endoskopik bel ameliyatı nedir?", ["endoskopik", "fıtık", "Bel fıtığı"]],
  ["randevu almak istiyorum", ["randevu", "Randevu"]],
  ["kanal darlığı ameliyatı yapıyor musunuz?", ["kanal", "Kanal"]],
  ["how do I book an appointment?", ["How do I book", "appointment"]],
];
for (const [text, includes] of coverage) {
  expectMatch(`kapsama: “${text}”`, hits(text, faqs).map((h) => h.question), includes);
}

const stillOpen = [
  "ameliyat kaç saat sürer?",
  "şehir dışından geliyorum",
  "merhaba",
  "daha önce bel ameliyatı oldum yine olur mu?",
  "yaş sınırı var mı?",
  "anestezi genel mi?",
];
for (const text of stillOpen) {
  const q = firstQuestion(text, faqs);
  if (q) warn(`hâlâ FAQ: “${text}” → ${q}`);
  else ok(`fallback’e bırakıldı: “${text}”`);
}

console.log("\n== Eşleşmeyen mesaj (asistan devri) ==");
const unmatchedBase = {
  welcome: "WELCOME",
  fallback: "FALLBACK",
  afterHoursMessage: "AFTER",
  now: 1_000_000,
  cooldownMs: 30 * 60 * 1000,
};
{
  const r = resolveUnmatchedReply({
    ...unmatchedBase,
    afterHours: false,
    inboundCount: 1,
    lastAutomatedBody: null,
    lastAutomatedAt: null,
  });
  if (r.kind === "welcome" && r.reply === "WELCOME") ok("ilk mesaj merhaba → karşılama");
  else fail("ilk mesaj merhaba", `${r.kind} ${r.reply}`);
}
{
  const r = resolveUnmatchedReply({
    ...unmatchedBase,
    afterHours: false,
    inboundCount: 2,
    lastAutomatedBody: "WELCOME",
    lastAutomatedAt: unmatchedBase.now - 60_000,
  });
  if (r.kind === "fallback" && r.reply === "FALLBACK") {
    ok("karşılamadan sonra anestezi? → fallback (sessiz değil)");
  } else fail("welcome sonrası unmatched", `${r.kind} ${r.reply}`);
}
{
  const r = resolveUnmatchedReply({
    ...unmatchedBase,
    afterHours: false,
    inboundCount: 3,
    lastAutomatedBody: "FALLBACK",
    lastAutomatedAt: unmatchedBase.now - 60_000,
  });
  if (r.kind === "silent") ok("fallback tekrarı 30 dk içinde → sessiz (inbox)");
  else fail("fallback spam", `${r.kind} ${r.reply}`);
}
{
  const r = resolveUnmatchedReply({
    ...unmatchedBase,
    afterHours: false,
    inboundCount: 3,
    lastAutomatedBody: "SSS CEVABI",
    lastAutomatedAt: unmatchedBase.now - 60_000,
  });
  if (r.kind === "fallback") ok("SSS’den sonra eşleşmeyen → yine fallback");
  else fail("SSS sonrası unmatched", `${r.kind} ${r.reply}`);
}
{
  const r = resolveUnmatchedReply({
    ...unmatchedBase,
    afterHours: true,
    inboundCount: 1,
    lastAutomatedBody: null,
    lastAutomatedAt: null,
  });
  if (r.kind === "after_hours") ok("mesai dışı eşleşmeyen → after-hours");
  else fail("mesai dışı", `${r.kind} ${r.reply}`);
}

console.log("\n== Tıbbi sınır + RLS ==");
const diagnosis = hits("mr sonuçlarıma göre ameliyat olmalı mıyım?", faqs);
if (diagnosis[0] && /MR|mri/i.test(diagnosis[0].question)) {
  ok(`teşhis sorusu MR politikasına düştü`);
} else if (!diagnosis.length) {
  ok("teşhis sorusu FAQ’ya düşmedi → fallback");
} else warn("teşhis sorusu", diagnosis[0].question);

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

console.log(`\nSonuç: ${passed} OK, ${failed} FAIL, ${warned} WARN`);
if (failed) process.exit(1);
