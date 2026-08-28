#!/usr/bin/env node
/**
 * Kaynaklar / UTM / Ads / Meta takip: mutlu yol + hata + felaket.
 *   npm run test:sources
 *   BASE_URL=http://localhost:3005 npm run test:sources
 *
 * Dev sunucu açık olmalı (landing + /r HTTP).
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
const baseUrl = (
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ""
).replace(/\/$/, "");

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

const SITE = "__SRC_TEST__";
const TEST_PHONE = "905000009991";
const WA_NUMBER = "905307837224";

let passed = 0;
let failed = 0;
let warned = 0;
const createdIds = [];
let testContactId = null;
let testLeadId = null;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** source-kind.ts ile aynı tutulmalı */
function classifyAdPlatform(row) {
  if (
    row.gclid?.trim() ||
    row.gbraid?.trim() ||
    row.wbraid?.trim()
  ) {
    return "google_ads";
  }
  if (row.fbclid?.trim()) return "meta";
  const source = (row.utm_source || "").trim().toLowerCase();
  if (
    ["google", "googleads", "adwords", "google_ads", "youtube"].includes(source)
  ) {
    return "google_ads";
  }
  if (
    ["facebook", "fb", "ig", "instagram", "meta", "fbads", "an"].includes(source)
  ) {
    return "meta";
  }
  if (
    source ||
    row.utm_medium?.trim() ||
    row.utm_campaign?.trim() ||
    row.campaign?.trim() ||
    row.msclkid?.trim() ||
    row.ttclid?.trim()
  ) {
    return "other";
  }
  return "organic";
}

function classifySourceEvent(channel) {
  if (channel === "landing" || channel === "page") return "landing";
  if (channel === "lead_form") return "form";
  return "whatsapp";
}

function extractLeadRef(body) {
  return body?.match(/\bRef:\s*([A-Z0-9]{6,12})\b/i)?.[1]?.toUpperCase() ?? null;
}

async function cleanup() {
  await admin.from("lead_sources").delete().eq("site", SITE);
  if (testLeadId) await admin.from("leads").delete().eq("id", testLeadId);
  if (testContactId) await admin.from("contacts").delete().eq("id", testContactId);
  await admin.from("contacts").delete().eq("phone", TEST_PHONE);
}

async function landing(body) {
  return fetch(`${baseUrl}/api/track/landing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ site: SITE, ...body }),
  });
}

async function findBy(field, value) {
  const { data, error } = await admin
    .from("lead_sources")
    .select("*")
    .eq("site", SITE)
    .eq(field, value)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return { rows: [], error };
  return { rows: data ?? [], error: null };
}

async function hitR(query) {
  const qs = new URLSearchParams({ site: SITE, ...query });
  return fetch(`${baseUrl}/r?${qs.toString()}`, { redirect: "manual" });
}

function parseWa(res) {
  const loc = res.headers.get("location") || "";
  const text = decodeURIComponent(loc);
  return {
    loc,
    text,
    ref: extractLeadRef(text),
    isWa: loc.includes(`wa.me/${WA_NUMBER}`),
    status: res.status,
  };
}

if (!baseUrl) {
  console.error("BASE_URL veya NEXT_PUBLIC_SITE_URL yok. Dev sunucu için:");
  console.error("  BASE_URL=http://localhost:3005 npm run test:sources");
  process.exit(1);
}

console.log(`Supabase: ${url}`);
console.log(`Site:     ${baseUrl}\n`);

try {
  await step("0. Temizlik", async () => {
    await cleanup();
    ok("eski kaynak test kayıtları silindi");
  });

  await step("1. Sınıflandırma (Google / Meta / Organik)", async () => {
    const cases = [
      [{ gclid: "G1" }, "google_ads"],
      [{ utm_source: "google" }, "google_ads"],
      [{ utm_source: "YouTube" }, "google_ads"],
      [{ fbclid: "F1" }, "meta"],
      [{ utm_source: "facebook" }, "meta"],
      [{ utm_source: "instagram" }, "meta"],
      [{ utm_source: "tiktok", utm_campaign: "x" }, "other"],
      [{ utm_medium: "email" }, "other"],
      [{}, "organic"],
      [{ utm_source: "  " }, "organic"],
      [{ gclid: "G1", fbclid: "F1", utm_source: "facebook" }, "google_ads"],
      [{ fbclid: "F1", utm_source: "google" }, "meta"],
      [{ gbraid: "GB1" }, "google_ads"],
      [{ wbraid: "WB1" }, "google_ads"],
      [{ msclkid: "MS1" }, "other"],
      [{ ttclid: "TT1" }, "other"],
    ];
    for (const [row, expected] of cases) {
      const got = classifyAdPlatform(row);
      if (got === expected) ok(`${JSON.stringify(row)} → ${expected}`);
      else fail(`${JSON.stringify(row)} → ${got}`, `beklenen ${expected}`);
    }

    if (classifySourceEvent("landing") === "landing") ok("channel=landing → sayfa inişi");
    else fail("landing event");
    if (classifySourceEvent("lead_form") === "form") ok("channel=lead_form → form");
    else fail("form event");
    if (classifySourceEvent("footer") === "whatsapp") ok("channel=footer → WhatsApp");
    else fail("footer event");
    if (classifySourceEvent(null) === "whatsapp") ok("channel yok → WhatsApp");
    else fail("null channel event");
  });

  await step("2. Ref çıkarma (WhatsApp mesajı)", async () => {
    const cases = [
      ["Ref: AB3K7M", "AB3K7M"],
      ["merhaba\n\nRef: ab3k7m\n", "AB3K7M"],
      ["Ref:AB3K7M", "AB3K7M"],
      ["Referans: AB3K7M", null],
      ["Ref: TOO_LONG_CODE12", null],
      ["", null],
      [null, null],
      ["Ref: 12AB34", "12AB34"],
    ];
    for (const [body, expected] of cases) {
      const got = extractLeadRef(body);
      if (got === expected) ok(`${JSON.stringify(body)} → ${expected}`);
      else fail(`ref ${JSON.stringify(body)}`, `got ${got}`);
    }
  });

  await step("3. Sayfa inişi — mutlu yol", async () => {
    const gclid = `GCL_${Date.now()}`;
    const r1 = await landing({
      page: "/tedaviler/bel-fitigi-ameliyati",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "bel",
      gclid,
      landing_url: `${baseUrl}/?gclid=${gclid}`,
    });
    const j1 = await r1.json();
    if (r1.status === 200 && j1.ok === true && !j1.skipped) ok("Google Ads iniş 200");
    else fail("Google Ads iniş", `status=${r1.status} body=${JSON.stringify(j1)}`);

    await sleep(250);
    const { rows: gRows } = await findBy("gclid", gclid);
    const g = gRows[0];
    if (!g) fail("Google iniş DB’de yok");
    else {
      createdIds.push(g.id);
      if (g.channel === "landing") ok("channel=landing");
      else fail("channel", g.channel);
      if (g.page_path === "/tedaviler/bel-fitigi-ameliyati") ok("page_path kaydoldu");
      else fail("page_path", g.page_path);
      if (classifyAdPlatform(g) === "google_ads") ok("DB satırı Google Ads");
      else fail("sınıf", classifyAdPlatform(g));
    }

    const fbclid = `FB_${Date.now()}`;
    const r2 = await landing({
      page: "/",
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "ig_story",
      fbclid,
    });
    if (r2.status === 200 && (await r2.json()).ok) ok("Meta iniş 200");
    else fail("Meta iniş");
    await sleep(250);
    const { rows: mRows } = await findBy("fbclid", fbclid);
    if (mRows[0]) {
      createdIds.push(mRows[0].id);
      if (classifyAdPlatform(mRows[0]) === "meta") ok("DB satırı Meta");
      else fail("Meta sınıf", classifyAdPlatform(mRows[0]));
    } else fail("Meta iniş DB’de yok");

    const igCamp = `IG_${Date.now()}`;
    const r3 = await landing({
      page: "/blog",
      utm_source: "instagram",
      utm_campaign: igCamp,
    });
    if (r3.ok) ok("Instagram UTM iniş (fbclid yok)");
    else fail("Instagram iniş");
    await sleep(250);
    const { rows: igRows } = await findBy("utm_campaign", igCamp);
    if (igRows[0]) {
      createdIds.push(igRows[0].id);
      if (classifyAdPlatform(igRows[0]) === "meta") ok("instagram → Meta");
      else fail("instagram sınıf", classifyAdPlatform(igRows[0]));
    } else fail("Instagram DB yok");

    const tk = `TK_${Date.now()}`;
    const r4 = await landing({ utm_source: "tiktok", utm_campaign: tk, page: "/" });
    if (r4.ok) ok("TikTok iniş");
    await sleep(250);
    const { rows: tkRows } = await findBy("utm_campaign", tk);
    if (tkRows[0]) {
      createdIds.push(tkRows[0].id);
      if (classifyAdPlatform(tkRows[0]) === "other") ok("tiktok → Diğer UTM");
      else fail("tiktok sınıf", classifyAdPlatform(tkRows[0]));
    } else fail("TikTok DB yok");
  });

  await step("4. Sayfa inişi — hata / felaket", async () => {
    const skip = await landing({ page: "/" });
    const skipJson = await skip.json();
    if (skip.status === 200 && skipJson.skipped) ok("UTM’siz iniş atlandı (kayıt yok)");
    else fail("UTM’siz skip", JSON.stringify(skipJson));

    const empty = await landing({
      utm_source: "   ",
      gclid: "",
      fbclid: "  ",
    });
    if ((await empty.json()).skipped) ok("boş string parametre atlandı");
    else fail("boş string yine yazıldı");

    const badJson = await fetch(`${baseUrl}/api/track/landing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    if (badJson.status === 400) ok("bozuk JSON 400");
    else fail(`bozuk JSON ${badJson.status}`);

    const get = await fetch(`${baseUrl}/api/track/landing`);
    if ([404, 405, 400].includes(get.status)) ok(`GET landing reddedildi (${get.status})`);
    else warn(`GET landing ${get.status}`, "sadece POST beklenir");

    const xss = `<script>alert(1)</script>`;
    const xssRes = await landing({ utm_source: xss, utm_campaign: "xss" });
    if (xssRes.status === 200) ok("XSS utm crash etmedi");
    else fail("XSS utm", `status=${xssRes.status}`);
    await sleep(250);
    const { rows: xssRows } = await findBy("utm_campaign", "xss");
    if (xssRows[0]) {
      createdIds.push(xssRows[0].id);
      if (xssRows[0].utm_source === xss) ok("XSS metin olarak saklandı (React escape eder)");
      else ok(`XSS saklandı: ${(xssRows[0].utm_source || "").slice(0, 40)}`);
    }

    const huge = "G".repeat(8000);
    const hugeRes = await landing({ gclid: huge, page: "/" });
    if (hugeRes.status === 200) ok("8000 karakter gclid crash etmedi");
    else fail("uzun gclid", `status=${hugeRes.status}`);
    await sleep(250);
    const { rows: hugeRows } = await findBy("gclid", huge.slice(0, 500));
    if (hugeRows[0]) {
      createdIds.push(hugeRows[0].id);
      if ((hugeRows[0].gclid || "").length === 500) ok("gclid 500 karaktere kırpıldı");
      else fail("kırpma", `len=${(hugeRows[0].gclid || "").length}`);
    } else fail("uzun gclid DB’de yok");

    const numRes = await landing({ utm_source: 12345, page: "/" });
    const numJson = await numRes.json();
    if (numRes.status === 200 && numJson.skipped) ok("sayı utm_source yok sayıldı");
    else if (numRes.status === 200 && numJson.ok) warn("sayı utm yazıldı", JSON.stringify(numJson));
    else fail("sayı utm", JSON.stringify(numJson));

    const dupG = `DUP_${Date.now()}`;
    await landing({ gclid: dupG, utm_source: "google", page: "/" });
    await landing({ gclid: dupG, utm_source: "google", page: "/" });
    await sleep(400);
    const { rows: dups } = await findBy("gclid", dupG);
    dups.forEach((row) => createdIds.push(row.id));
    if (dups.length >= 2) {
      warn(
        "aynı gclid iki kez yazıldı (sunucu dedup yok)",
        `${dups.length} satır — tarayıcı sessionStorage bir kez gönderir, API spam’e açık`,
      );
    } else if (dups.length === 1) ok("aynı gclid tek kayıt (beklenmeyen dedup)");
    else fail("dup gclid hiç yazılmadı");
  });

  await step("5. /r WhatsApp yönlendirme", async () => {
    const gclid = `RG_${Date.now()}`;
    const r1 = await hitR({
      channel: "hero",
      page: "/",
      utm_source: "google",
      utm_campaign: "bel",
      gclid,
    });
    const p1 = parseWa(r1);
    if ([301, 302, 303, 307, 308].includes(p1.status) && p1.isWa) {
      ok(`/r Google → wa.me (${p1.status})`);
    } else fail("/r Google redirect", `status=${p1.status} loc=${p1.loc.slice(0, 80)}`);
    if (p1.ref) ok(`WA mesajında Ref: ${p1.ref}`);
    else fail("WA Ref yok", p1.text.slice(0, 160));
    await sleep(300);
    if (p1.ref) {
      const { rows } = await findBy("lead_ref", p1.ref);
      if (rows[0]) {
        createdIds.push(rows[0].id);
        if (rows[0].gclid === gclid && classifyAdPlatform(rows[0]) === "google_ads") {
          ok("/r Google Ads DB + Ref eşleşti");
        } else fail("/r Google satır", JSON.stringify(rows[0]));
        if (rows[0].channel === "hero") ok("channel=hero");
        else fail("channel hero", rows[0].channel);
        if (classifySourceEvent(rows[0].channel) === "whatsapp") ok("hero → WhatsApp olayı");
        else fail("hero event");
      } else fail("/r Google DB yok");
    }

    const fbclid = `RF_${Date.now()}`;
    const r2 = await hitR({
      channel: "footer",
      utm_source: "facebook",
      fbclid,
    });
    const p2 = parseWa(r2);
    if (p2.isWa && p2.ref) ok("/r Meta footer → WA");
    else fail("/r Meta footer");
    await sleep(300);
    if (p2.ref) {
      const { rows } = await findBy("lead_ref", p2.ref);
      if (rows[0]) {
        createdIds.push(rows[0].id);
        if (classifyAdPlatform(rows[0]) === "meta") ok("/r footer Meta");
        else fail("/r footer sınıf", classifyAdPlatform(rows[0]));
      } else fail("/r footer DB yok");
    }

    const r3 = await hitR({ channel: "footer" });
    const p3 = parseWa(r3);
    if (p3.isWa) ok("/r organik footer yine WA açar");
    else fail("/r organik redirect");
    await sleep(300);
    if (p3.ref) {
      const { rows } = await findBy("lead_ref", p3.ref);
      if (rows[0]) {
        createdIds.push(rows[0].id);
        if (classifyAdPlatform(rows[0]) === "organic") ok("parametresiz /r → Organik");
        else fail("organik sınıf", classifyAdPlatform(rows[0]));
        if (!rows[0].page_path) {
          warn(
            "/r fallback page_path boş",
            "JS’siz veya sağ tık yeni sekmede sayfa kaydı düşmeyebilir",
          );
        } else ok(`organik page_path=${rows[0].page_path}`);
      } else fail("organik /r DB yok");
    }

    const r4 = await hitR({
      channel: "lead_form",
      name: "Test Hasta",
      age: "45",
      surgeryRecommended: "Evet",
      utm_source: "google",
      gclid: `FORM_${Date.now()}`,
    });
    const p4 = parseWa(r4);
    if (p4.text.includes("İsim: Test Hasta") && p4.text.includes("Yaş: 45")) {
      ok("form WA metnine yazıldı");
    } else fail("form WA metni", p4.text.slice(0, 200));
    await sleep(300);
    if (p4.ref) {
      const { rows } = await findBy("lead_ref", p4.ref);
      if (rows[0]) {
        createdIds.push(rows[0].id);
        if (rows[0].channel === "lead_form" && rows[0].form_payload?.name === "Test Hasta") {
          ok("form_payload kaydoldu");
        } else fail("form_payload", JSON.stringify(rows[0].form_payload));
        if (classifySourceEvent(rows[0].channel) === "form") ok("lead_form → Form olayı");
        else fail("form event");
      } else fail("form /r DB yok");
    }

    const r5 = await hitR({
      channel: "footer",
      utm_source: "x".repeat(4000),
    });
    const p5 = parseWa(r5);
    if (p5.isWa) ok("çok uzun utm /r crash etmedi, WA açıldı");
    else fail("uzun utm /r");
    await sleep(300);
    if (p5.ref) {
      const { rows } = await findBy("lead_ref", p5.ref);
      if (rows[0]) createdIds.push(rows[0].id);
    }
  });

  await step("6. Constraint + RLS", async () => {
    const { rows } = await admin
      .from("lead_sources")
      .select("id, lead_ref")
      .eq("site", SITE)
      .limit(1);
    const existing = rows?.[0] || createdIds[0]
      ? (
          await admin
            .from("lead_sources")
            .select("id, lead_ref")
            .in("id", createdIds.length ? createdIds : ["00000000-0000-0000-0000-000000000001"])
            .limit(1)
        ).data?.[0]
      : null;

    if (!existing?.lead_ref) {
      fail("dup test için ref yok");
    } else {
      const { error } = await admin.from("lead_sources").insert({
        lead_ref: existing.lead_ref,
        site: SITE,
        channel: "website",
      });
      if (error) ok("aynı lead_ref reddedildi");
      else fail("aynı lead_ref kabul edildi");
    }

    if (!anon) {
      warn("anon key yok, RLS atlandı");
    } else {
      const { data: sel } = await anon.from("lead_sources").select("id").eq("site", SITE).limit(5);
      if (!sel?.length) ok("anon lead_sources SELECT boş/deny");
      else fail("anon kaynak okuyabildi", String(sel.length));

      const { data: view, error: viewErr } = await anon
        .from("lead_source_report")
        .select("id")
        .limit(5);
      if (!view?.length) ok(`anon report view deny (${viewErr?.code || "empty"})`);
      else fail("anon report okuyabildi");

      const { error: ins } = await anon.from("lead_sources").insert({
        lead_ref: "HACK99",
        site: SITE,
        channel: "hack",
      });
      if (ins) ok("anon INSERT reddedildi");
      else {
        fail("anon INSERT yazabildi");
        const { data: hack } = await admin
          .from("lead_sources")
          .select("id")
          .eq("lead_ref", "HACK99");
        if (hack?.[0]) createdIds.push(hack[0].id);
      }
    }
  });

  await step("7. HTTP güvenlik", async () => {
    const expectLogin = async (path) => {
      const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      const loc = res.headers.get("location") || "";
      if (
        [301, 302, 303, 307, 308].includes(res.status) &&
        loc.includes("/admin/login")
      ) {
        ok(`${path} → login (${res.status})`);
      } else fail(`${path} korumasız`, `status=${res.status} loc=${loc}`);
    };
    await expectLogin("/admin/sources");
    await expectLogin("/admin/sources?platform=google_ads&event=whatsapp");
    await expectLogin("/admin/sources?q=test");
  });

  await step("8. Filtre kombinasyonu (UI mantığı)", async () => {
    const { data: all } = await admin
      .from("lead_sources")
      .select("channel, utm_source, utm_medium, utm_campaign, campaign, gclid, fbclid")
      .eq("site", SITE);
    const rows = (all ?? []).map((row) => ({
      ...row,
      platform: classifyAdPlatform(row),
      sourceEvent: classifySourceEvent(row.channel),
    }));
    const google = rows.filter((row) => row.platform === "google_ads").length;
    const meta = rows.filter((row) => row.platform === "meta").length;
    const organic = rows.filter((row) => row.platform === "organic").length;
    const googleWa = rows.filter(
      (row) => row.platform === "google_ads" && row.sourceEvent === "whatsapp",
    ).length;
    const googleLand = rows.filter(
      (row) => row.platform === "google_ads" && row.sourceEvent === "landing",
    ).length;
    const organicWa = rows.filter(
      (row) => row.platform === "organic" && row.sourceEvent === "whatsapp",
    ).length;

    if (google >= 1) ok(`Google Ads toplam ${google}`);
    else fail("Google Ads satırı yok");
    if (meta >= 1) ok(`Meta toplam ${meta}`);
    else fail("Meta satırı yok");
    if (organic >= 1) ok(`Organik toplam ${organic}`);
    else fail("Organik satırı yok");
    if (googleLand >= 1) ok(`Google + sayfa inişi ${googleLand}`);
    else fail("Google landing yok");
    if (googleWa >= 1) ok(`Google + WhatsApp ${googleWa}`);
    else fail("Google WhatsApp yok");
    if (organicWa >= 1) ok(`Organik + WhatsApp ${organicWa}`);
    else fail("Organik WhatsApp yok");

    const googleForm = rows.filter(
      (row) => row.platform === "google_ads" && row.sourceEvent === "form",
    ).length;
    if (googleForm >= 1) ok(`Google + Form ${googleForm}`);
    else fail("Google form yok");

    const metaOrganicWa = rows.filter(
      (row) => row.platform === "meta" && row.sourceEvent === "whatsapp" && row.platform === "organic",
    ).length;
    if (metaOrganicWa === 0) ok("Meta ∩ Organik imkânsız (0)");
    else fail("sınıf çakışması");
  });

  await step("9. Ref → lead eşleştirme (webhook simülasyonu)", async () => {
    const { data: source } = await admin
      .from("lead_sources")
      .select("*")
      .eq("site", SITE)
      .not("gclid", "is", null)
      .eq("channel", "hero")
      .limit(1)
      .maybeSingle();

    if (!source) {
      fail("eşleştirme için /r Google satırı yok");
      return;
    }

    const body = `Merhaba\n\nWeb sitesinden yazıyorum.\n\nRef: ${source.lead_ref}`;
    const ref = extractLeadRef(body);
    if (ref === source.lead_ref) ok("mesajdaki Ref kaynak ile aynı");
    else fail("Ref extract", `${ref} vs ${source.lead_ref}`);

    const { data: contact, error: cErr } = await admin
      .from("contacts")
      .insert({ phone: TEST_PHONE, name: "__SRC_TEST_HASTA__" })
      .select("id")
      .single();
    if (cErr || !contact) {
      fail("test hastası", cErr?.message);
      return;
    }
    testContactId = contact.id;

    const { data: lead, error: lErr } = await admin
      .from("leads")
      .insert({
        contact_id: contact.id,
        site: source.site,
        channel: source.channel,
        utm_source: source.utm_source,
        utm_campaign: source.utm_campaign,
        gclid: source.gclid,
        fbclid: source.fbclid,
        lead_ref: source.lead_ref,
      })
      .select("id")
      .single();
    if (lErr || !lead) {
      fail("lead insert", lErr?.message);
      return;
    }
    testLeadId = lead.id;

    const { error: uErr } = await admin
      .from("lead_sources")
      .update({
        matched_lead_id: lead.id,
        matched_at: new Date().toISOString(),
      })
      .eq("id", source.id);
    if (uErr) fail("match update", uErr.message);
    else ok("kaynak lead’e bağlandı (eşleşti)");

    const { data: matched } = await admin
      .from("lead_sources")
      .select("matched_lead_id")
      .eq("id", source.id)
      .single();
    if (matched?.matched_lead_id === lead.id) ok("matched_lead_id doğrulandı");
    else fail("matched_lead_id");

    await admin.from("leads").delete().eq("id", lead.id);
    testLeadId = null;
    const { data: afterDel } = await admin
      .from("lead_sources")
      .select("matched_lead_id")
      .eq("id", source.id)
      .single();
    if (afterDel?.matched_lead_id == null) ok("lead silinince matched_lead_id null (ON DELETE SET NULL)");
    else fail("lead silindi, match kaldı", String(afterDel?.matched_lead_id));

    const ghost = extractLeadRef("Ref: ZZZZZZ");
    const { data: missing } = await admin
      .from("lead_sources")
      .select("id")
      .eq("lead_ref", ghost)
      .maybeSingle();
    if (!missing) ok("olmayan Ref eşleşmez (hasta Ref’i silerse attribution kaybolur)");
    else fail("hayalet ref bulundu");
  });

  await step("10. Temizlik", async () => {
    await cleanup();
    const { data: left } = await admin
      .from("lead_sources")
      .select("id")
      .eq("site", SITE);
    if (!left?.length) ok("test kayıtları silindi");
    else fail("artık kayıt", String(left.length));
  });
} catch (err) {
  fail("beklenmeyen hata", err instanceof Error ? err.message : String(err));
  try {
    await cleanup();
  } catch {
    /* ignore */
  }
}

console.log(
  `\n${failed ? "\x1b[31m" : warned ? "\x1b[33m" : "\x1b[32m"}${passed} geçti, ${failed} kaldı, ${warned} uyarı\x1b[0m\n`,
);
process.exit(failed ? 1 : 0);
