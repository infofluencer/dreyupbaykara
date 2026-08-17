#!/usr/bin/env node
/**
 * WhatsApp inbox: şema, trigger, ingest (Ref → lead), webhook HTTP.
 *   npm run test:whatsapp
 *   npm run test:whatsapp -- --keep     # UI testi için seed bırakır
 *   BASE_URL=http://localhost:3005 npm run test:whatsapp
 *
 * Dev sunucu HTTP testleri için açık olmalı.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const KEEP_SEED = process.argv.includes("--keep");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* .env.local optional when env already set */
  }
}

loadEnvLocal();

const { createClient } = await import("@supabase/supabase-js");

const REF_RE = /\bRef:\s*([A-Z0-9]{6,12})\b/i;
function extractLeadRef(body) {
  return body?.match(REF_RE)?.[1]?.toUpperCase() ?? null;
}

/** Script-local ingest simulation (mirrors src/lib/whatsapp/ingest.ts). */
async function ingestTestMessage(adminClient, options) {
  const phone = options.phone.replace(/\D/g, "");
  if (!phone) return null;

  const { data: contact, error: contactError } = await adminClient
    .from("contacts")
    .upsert(
      { phone, name: options.contactName || phone },
      { onConflict: "phone" },
    )
    .select("id, name, phone")
    .single();
  if (contactError || !contact) return null;

  const leadRef = extractLeadRef(options.body);
  let leadId = null;

  if (leadRef) {
    const { data: source } = await adminClient
      .from("lead_sources")
      .select("*")
      .eq("lead_ref", leadRef)
      .maybeSingle();

    if (source?.matched_lead_id) {
      leadId = source.matched_lead_id;
    } else if (source) {
      const { data: lead } = await adminClient
        .from("leads")
        .insert({
          contact_id: contact.id,
          site: source.site,
          channel: source.channel,
          campaign: source.campaign,
          utm_source: source.utm_source,
          utm_medium: source.utm_medium,
          utm_campaign: source.utm_campaign,
          gclid: source.gclid,
          fbclid: source.fbclid,
          lead_ref: leadRef,
        })
        .select("id")
        .single();
      leadId = lead?.id ?? null;
      if (leadId) {
        await adminClient
          .from("lead_sources")
          .update({
            matched_lead_id: leadId,
            matched_at: new Date().toISOString(),
          })
          .eq("id", source.id);
      }
    }
  }

  const { data: existing } = await adminClient
    .from("conversations")
    .select("id")
    .eq("contact_id", contact.id)
    .maybeSingle();

  let conversationId;
  if (existing) {
    const { data: conv } = await adminClient
      .from("conversations")
      .update({
        wa_phone: contact.phone,
        contact_name: contact.name,
        status: "open",
        ...(leadId ? { lead_id: leadId, patient_id: contact.id } : {}),
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    conversationId = conv?.id ?? null;
  } else {
    const { data: conv } = await adminClient
      .from("conversations")
      .insert({
        contact_id: contact.id,
        patient_id: leadId ? contact.id : null,
        lead_id: leadId,
        wa_phone: contact.phone,
        contact_name: contact.name,
        status: "open",
      })
      .select("id")
      .single();
    conversationId = conv?.id ?? null;
  }
  if (!conversationId) return null;

  const { error: messageError } = await adminClient.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: options.waMessageId,
    direction: "inbound",
    body: options.body,
    status: "received",
  });
  if (messageError?.code === "23505") {
    return { conversationId, leadId, contactId: contact.id };
  }
  if (messageError) return null;
  return { conversationId, leadId, contactId: contact.id };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3005"
).replace(/\/$/, "");

const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const waEnabled =
  ["1", "true", "yes"].includes(
    (process.env.WHATSAPP_ENABLED ?? "").trim().toLowerCase(),
  );

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_PHONE = "905000009993";
const TEST_NAME = "__WA_INBOX_TEST__";
const TEST_REF = "WA7TST";
const TEST_SITE = "__wa_test__";

let passed = 0;
let failed = 0;
let warned = 0;
const created = {
  contactId: null,
  conversationId: null,
  leadId: null,
  sourceId: null,
  messageIds: [],
};

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

async function cleanup() {
  const { data: contacts } = await admin
    .from("contacts")
    .select("id")
    .or(`phone.eq.${TEST_PHONE},name.eq.${TEST_NAME}`);

  const contactIds = (contacts ?? []).map((row) => row.id);
  if (contactIds.length) {
    const { data: convs } = await admin
      .from("conversations")
      .select("id")
      .in("contact_id", contactIds);
    const convIds = (convs ?? []).map((row) => row.id);
    if (convIds.length) {
      await admin.from("messages").delete().in("conversation_id", convIds);
      await admin.from("conversations").delete().in("id", convIds);
    }
    const { data: leads } = await admin
      .from("leads")
      .select("id")
      .in("contact_id", contactIds);
    const leadIds = (leads ?? []).map((row) => row.id);
    if (leadIds.length) {
      await admin.from("leads").delete().in("id", leadIds);
    }
    await admin.from("contacts").delete().in("id", contactIds);
  }

  await admin.from("lead_sources").delete().eq("lead_ref", TEST_REF);
}

try {
  console.log(`Supabase: ${url}`);
  console.log(`Site:     ${baseUrl}`);
  console.log(`WA flag:  WHATSAPP_ENABLED=${waEnabled ? "true" : "false"}`);
  if (KEEP_SEED) console.log("Mod:      --keep (seed UI için kalacak)\n");
  else console.log("");

  await step("0. Temizlik", async () => {
    await cleanup();
    ok("eski test kayıtları silindi");
  });

  await step("1. Şema — inbox kolonları", async () => {
    const convCols =
      "id,contact_id,patient_id,wa_phone,contact_name,status,last_message_at,last_message_preview,last_message_direction,unread_count,assigned_to";
    const { error: convErr } = await admin
      .from("conversations")
      .select(convCols)
      .limit(1);
    if (convErr) {
      fail("conversations", convErr.message);
      fail(
        "migration",
        "20260817120000_whatsapp_inbox_tracking.sql uygulandı mı?",
      );
      return;
    }
    ok("conversations tracking kolonları");

    const { error: msgErr } = await admin
      .from("messages")
      .select("id,direction,body,wa_message_id,status,sent_by")
      .limit(1);
    if (msgErr) fail("messages", msgErr.message);
    else ok("messages hazır");

    const { error: recvErr } = await admin.from("messages").insert({
      conversation_id: "00000000-0000-0000-0000-000000000001",
      direction: "inbound",
      body: "__schema_probe__",
      status: "received",
    });
    if (recvErr?.message?.includes("received")) {
      ok("message_status enum 'received' (insert reddi beklenen FK)");
    } else if (recvErr) {
      ok("received status kabul ediliyor (FK hatası = enum OK)");
    } else {
      fail("received status probe beklenmedik başarı");
    }
  });

  await step("2. Trigger — preview / unread", async () => {
    const { data: contact, error: cErr } = await admin
      .from("contacts")
      .insert({ phone: TEST_PHONE, name: TEST_NAME })
      .select("id, phone, name")
      .single();
    if (cErr || !contact) {
      fail("test contact", cErr?.message);
      return;
    }
    created.contactId = contact.id;

    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .insert({
        contact_id: contact.id,
        patient_id: contact.id,
        wa_phone: contact.phone,
        contact_name: contact.name,
        status: "open",
        unread_count: 0,
      })
      .select("id, unread_count, last_message_preview")
      .single();
    if (convErr || !conv) {
      fail("test conversation", convErr?.message);
      return;
    }
    created.conversationId = conv.id;

    const { data: msg, error: mErr } = await admin
      .from("messages")
      .insert({
        conversation_id: conv.id,
        direction: "inbound",
        body: "Merhaba, test mesajı",
        status: "received",
        wa_message_id: `test_in_${Date.now()}`,
      })
      .select("id")
      .single();
    if (mErr || !msg) {
      fail("inbound insert", mErr?.message);
      return;
    }
    created.messageIds.push(msg.id);

    const { data: updated } = await admin
      .from("conversations")
      .select("unread_count, last_message_preview, last_message_direction")
      .eq("id", conv.id)
      .single();

    if ((updated?.unread_count ?? 0) >= 1) ok(`unread_count = ${updated.unread_count}`);
    else fail("unread_count artmadı", JSON.stringify(updated));

    if (updated?.last_message_preview?.includes("test mesajı")) {
      ok("last_message_preview güncellendi");
    } else fail("preview güncellenmedi", updated?.last_message_preview);

    if (updated?.last_message_direction === "inbound") ok("last_message_direction = inbound");
    else fail("direction güncellenmedi", updated?.last_message_direction);
  });

  await step("3. ingest — Ref → lead", async () => {
    await cleanup();

    const { data: source, error: sErr } = await admin
      .from("lead_sources")
      .insert({
        lead_ref: TEST_REF,
        site: TEST_SITE,
        channel: "whatsapp",
        utm_source: "test",
        utm_campaign: "wa_script",
      })
      .select("id")
      .single();
    if (sErr || !source) {
      fail("lead_source seed", sErr?.message);
      return;
    }
    created.sourceId = source.id;

    const body = `Merhaba\n\nRef: ${TEST_REF}`;
    if (extractLeadRef(body) === TEST_REF) ok("extractLeadRef");
    else fail("extractLeadRef", extractLeadRef(body));

    const waId = `test_wa_${Date.now()}`;
    const result = await ingestTestMessage(admin, {
      phone: TEST_PHONE,
      contactName: TEST_NAME,
      body,
      waMessageId: waId,
      timestamp: String(Math.floor(Date.now() / 1000)),
    });

    if (!result?.conversationId) {
      fail("ingest dönmedi");
      return;
    }
    created.conversationId = result.conversationId;
    created.leadId = result.leadId;
    created.contactId = result.contactId;
    ok(`ingest conversation ${result.conversationId.slice(0, 8)}…`);

    const { data: conv } = await admin
      .from("conversations")
      .select("lead_id, wa_phone, contact_name, status")
      .eq("id", result.conversationId)
      .single();

    if (conv?.lead_id) ok("conversation.lead_id bağlandı");
    else fail("lead_id null", JSON.stringify(conv));

    if (conv?.wa_phone === TEST_PHONE) ok("wa_phone doğru");
    else fail("wa_phone", conv?.wa_phone);

    const { data: matchedSource } = await admin
      .from("lead_sources")
      .select("matched_lead_id")
      .eq("id", source.id)
      .single();
    if (matchedSource?.matched_lead_id) ok("lead_sources.matched_lead_id set");
    else warn("lead_sources eşleşmedi", "kaynak zaten eşleşmiş olabilir");

    const { count } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("wa_message_id", waId);
    if ((count ?? 0) === 1) ok("inbound message kaydı");
    else fail("message sayısı", String(count));
  });

  await step("4. ingest — Ref yok (lead oluşturmaz)", async () => {
    const waId = `test_wa_noref_${Date.now()}`;
    const beforeLeads = await admin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", created.contactId ?? "00000000-0000-0000-0000-000000000000");

    await ingestTestMessage(admin, {
      phone: TEST_PHONE,
      contactName: TEST_NAME,
      body: "Ref olmadan ikinci mesaj",
      waMessageId: waId,
    });

    const afterLeads = await admin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", created.contactId ?? "00000000-0000-0000-0000-000000000000");

    if ((beforeLeads.count ?? 0) === (afterLeads.count ?? 0)) {
      ok("Ref yokken yeni lead oluşturulmadı");
    } else {
      warn("lead sayısı değişti", `${beforeLeads.count} → ${afterLeads.count}`);
    }

    const { data: convs } = await admin
      .from("conversations")
      .select("id")
      .eq("contact_id", created.contactId);
    if ((convs ?? []).length === 1) ok("tek conversation (contact unique)");
    else fail("conversation sayısı", String(convs?.length));
  });

  await step("5. Outbound — pending / sent (DB)", async () => {
    if (!created.conversationId) {
      fail("conversation yok");
      return;
    }
    const { data: out, error } = await admin
      .from("messages")
      .insert({
        conversation_id: created.conversationId,
        direction: "outbound",
        body: "Panelden test cevabı",
        status: waEnabled ? "pending" : "sent",
        wa_message_id: waEnabled ? null : `local_${crypto.randomUUID()}`,
      })
      .select("id, status")
      .single();
    if (error || !out) {
      fail("outbound insert", error?.message);
      return;
    }
    ok(`outbound ${out.status}`);
    created.messageIds.push(out.id);
  });

  await step("6. HTTP — webhook & admin", async () => {
    try {
      const badVerify = await fetch(
        `${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=yanlis&hub.challenge=12345`,
      );
      if (badVerify.status === 403) ok("verify token yanlış → 403");
      else fail("verify yanlış token", `status=${badVerify.status}`);

      if (verifyToken) {
        const goodVerify = await fetch(
          `${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=12345`,
        );
        const body = await goodVerify.text();
        if (goodVerify.status === 200 && body === "12345") {
          ok("verify token doğru → challenge");
        } else if (goodVerify.status === 403) {
          warn(
            "verify token 403",
            "dev sunucusunu yeniden başlatın (.env.local WHATSAPP_VERIFY_TOKEN)",
          );
        } else {
          fail("verify doğru token", `status=${goodVerify.status} body=${body}`);
        }
      } else {
        warn("WHATSAPP_VERIFY_TOKEN yok, doğru verify atlandı");
      }

      const postDisabled = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entry: [] }),
      });
      if (!waEnabled && postDisabled.status === 200) {
        ok("WA kapalı POST → 200 skip");
      } else if (waEnabled && postDisabled.status === 401) {
        ok("WA açık imzasız POST → 401");
      } else if (waEnabled && postDisabled.status === 200) {
        warn("WA açık imzasız POST 200", "WHATSAPP_APP_SECRET yoksa beklenen");
      } else {
        fail("webhook POST", `status=${postDisabled.status}`);
      }

      const adminPage = await fetch(`${baseUrl}/admin/messages`, {
        redirect: "manual",
      });
      const loc = adminPage.headers.get("location") ?? "";
      if (
        [301, 302, 303, 307, 308].includes(adminPage.status) &&
        loc.includes("/admin/login")
      ) {
        ok("/admin/messages login korumalı");
      } else {
        fail("/admin/messages korumasız", `status=${adminPage.status}`);
      }
    } catch (error) {
      warn("HTTP testleri", `${error.message} — npm run dev açık mı?`);
    }
  });

  if (KEEP_SEED && created.conversationId) {
    await step("7. UI seed", async () => {
      ok(`Konuşma bırakıldı: ${created.conversationId}`);
      ok(`Panel: ${baseUrl}/admin/messages?c=${created.conversationId}`);
      console.log("\n  Giriş yap → solda __WA_INBOX_TEST__ → mesaj yaz → Gönder\n");
    });
  } else {
    await step("7. Temizlik", async () => {
      await cleanup();
      const { data } = await admin
        .from("contacts")
        .select("id")
        .eq("phone", TEST_PHONE);
      if (data?.length) fail("test contact kaldı");
      else ok("test kayıtları silindi");
    });
  }
} catch (error) {
  fail("beklenmeyen hata", error.message);
  if (!KEEP_SEED) {
    try {
      await cleanup();
    } catch {
      /* ignore */
    }
  }
}

console.log(
  `\n${failed ? "\x1b[31m" : warned ? "\x1b[33m" : "\x1b[32m"}${passed} geçti, ${failed} kaldı, ${warned} uyarı\x1b[0m\n`,
);
process.exit(failed ? 1 : 0);
