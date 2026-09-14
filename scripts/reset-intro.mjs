#!/usr/bin/env node
/**
 * Bir telefon numarasını "bize hiç yazmamış" hale getirir; böylece ilk mesaj
 * bilgilendirmesi (genel bilgilendirme metni + işlem bölgesi görseli) elinizdeki
 * numarayla gerçek WhatsApp üzerinden test edilebilir.
 *
 *   npm run wa:reset-intro -- 905321234567             # sadece durum raporu
 *   npm run wa:reset-intro -- 905321234567 --confirm   # sıfırla
 *   npm run wa:reset-intro -- 905321234567 --confirm --force   # kayıtlı hastada da
 *
 * Sıfırlama o konuşmanın WhatsApp mesaj geçmişini SİLER ve intro damgasını
 * (conversations.intro_sent_at) boşaltır. Hasta kaydı, randevular, lead'ler ve
 * klinik dosya DOKUNULMAZ. Kayıtlı hasta / randevusu olan numaralarda --force
 * istenir; gerçek hasta geçmişi kazara silinmesin.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const FORCE = args.includes("--force");
const rawPhone = args.find((arg) => !arg.startsWith("--"));

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

function usage() {
  console.error(`
Kullanım:
  npm run wa:reset-intro -- 905321234567             # durum raporu (hiçbir şey silmez)
  npm run wa:reset-intro -- 905321234567 --confirm   # numarayı sıfırla

Numarayı ülke koduyla yazın (WhatsApp'ta göründüğü hali): 90 ile başlar.
`);
  process.exit(1);
}

if (!rawPhone) usage();

/** Cloud API telefonları + olmadan, yalnızca rakam tutar. */
const phone = rawPhone.replace(/\D/g, "");
if (phone.length < 10) {
  console.error(`\n  "${rawPhone}" geçerli bir numara değil.\n`);
  usage();
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik (.env.local).",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function countMessages(conversationId, direction) {
  const { count, error } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", direction);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

console.log("\n=== İlk mesaj bilgilendirmesi — test sıfırlama ===\n");
console.log(`  Supabase: ${url}`);
console.log(`  Numara:   ${phone}`);

const { data: contact, error: contactError } = await admin
  .from("contacts")
  .select("id, name, phone, is_patient, created_at")
  .eq("phone", phone)
  .maybeSingle();

if (contactError) {
  console.error(`\n  contacts okunamadı: ${contactError.message}\n`);
  process.exit(1);
}

if (!contact) {
  console.log(`
  Bu numara CRM'de hiç yok — yani zaten "hiç yazmamış" durumda.

  Yapmanız gereken: bu numaradan kliniğin WhatsApp hattına tek bir mesaj atın.
  Genel bilgilendirme metni ve işlem bölgesi görseli gelmeli.
`);
  process.exit(0);
}

const { data: conversation } = await admin
  .from("conversations")
  .select("id, status, intro_sent_at, last_message_at")
  .eq("contact_id", contact.id)
  .maybeSingle();

const { count: appointmentCount } = await admin
  .from("appointments")
  .select("id", { count: "exact", head: true })
  .eq("contact_id", contact.id);

console.log(`
  --- Mevcut durum ---
  Kişi:            ${contact.name || "(isimsiz)"}
  Kayıtlı hasta:   ${contact.is_patient ? "EVET" : "hayır"}
  Randevu sayısı:  ${appointmentCount ?? 0}`);

if (!conversation) {
  console.log(`  Konuşma:         yok

  Konuşma kaydı olmadığı için bu numara zaten bilgilendirme alacak durumda.
  Bu numaradan tek bir mesaj atın; metin + görsel gelmeli.
`);
  process.exit(0);
}

const inbound = await countMessages(conversation.id, "inbound");
const outbound = await countMessages(conversation.id, "outbound");

console.log(`  Konuşma:         ${conversation.id}
  intro damgası:   ${conversation.intro_sent_at ?? "yok (boş)"}
  Gelen mesaj:     ${inbound}
  Giden mesaj:     ${outbound}`);

const blocked = [];
if (conversation.intro_sent_at) {
  blocked.push("intro damgası dolu (bu numaraya bilgilendirme gitmiş sayılıyor)");
}
if (outbound > 0) {
  blocked.push(`${outbound} giden mesaj var (bu kişiyle zaten yazışılmış)`);
}

if (!blocked.length) {
  console.log(`
  Sıfırlamaya gerek yok: bu numara şu an bilgilendirme alacak durumda.
  Tek bir mesaj atın; metin + görsel gelmeli.
`);
  process.exit(0);
}

console.log(`
  --- Bilgilendirme neden gitmez ---`);
for (const reason of blocked) console.log(`  • ${reason}`);

const risky = contact.is_patient || (appointmentCount ?? 0) > 0;

if (risky && !FORCE) {
  console.error(`
  DURDURULDU: bu numara kayıtlı bir hastaya ait (veya randevusu var).
  Sıfırlama o hastanın WhatsApp yazışma geçmişini siler.

  Test için kendi numaranızı kullanın. Yine de devam etmek istiyorsanız:
    npm run wa:reset-intro -- ${phone} --confirm --force
`);
  process.exit(1);
}

if (!CONFIRM) {
  console.log(`
  --- Sıfırlama ne yapacak ---
  • Bu konuşmadaki ${inbound + outbound} WhatsApp mesajı SİLİNİR (geri alınamaz)
  • intro damgası boşaltılır, okunmamış sayacı sıfırlanır
  • Hasta kaydı, randevular, lead'ler ve klinik dosya korunur

  Onaylamak için:
    npm run wa:reset-intro -- ${phone} --confirm${risky ? " --force" : ""}
`);
  process.exit(0);
}

const { error: deleteError } = await admin
  .from("messages")
  .delete()
  .eq("conversation_id", conversation.id);

if (deleteError) {
  console.error(`\n  Mesajlar silinemedi: ${deleteError.message}\n`);
  process.exit(1);
}

const { error: resetError } = await admin
  .from("conversations")
  .update({
    intro_sent_at: null,
    unread_count: 0,
    last_message_preview: null,
    last_message_direction: null,
    last_message_at: null,
  })
  .eq("id", conversation.id);

if (resetError) {
  console.error(`\n  Konuşma sıfırlanamadı: ${resetError.message}\n`);
  process.exit(1);
}

console.log(`
  Tamam: ${inbound + outbound} mesaj silindi, intro damgası boşaltıldı.

  --- Şimdi test edin ---
  1. Bu numaradan kliniğin WhatsApp hattına TEK bir mesaj atın.
     → Genel bilgilendirme metni, hemen ardından işlem bölgesi görseli gelmeli.
  2. Aynı numaradan bir mesaj daha atın.
     → Hiçbir otomatik mesaj gelmemeli (damga yeniden vurulduğu için).
  3. Admin → WhatsApp ekranında iki otomatik mesajı konuşmada görün.

  Gelmezse: Admin → Bot ekranında "Bot aktif" ve "İlk mesaj bilgilendirmesi"
  işaretli mi, sunucu kayıtlarında [whatsapp] ile başlayan hata var mı bakın.
`);
process.exit(0);
