#!/usr/bin/env node
/**
 * Cookie consent: lib + API + SSR Consent Mode + güvenlik + hata.
 *   npm run test:consent
 *   BASE_URL=http://localhost:3005 npm run test:consent
 *
 * Dev sunucusu açık olmalı (`npm run dev`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  COOKIE_CONSENT_MAX_AGE,
  COOKIE_CONSENT_NAME,
  acceptedConsent,
  deniedConsent,
  isCookieConsentPreferences,
  parseCookieConsent,
  serializeCookieConsent,
  toGoogleConsentState,
} from "../src/lib/cookie-consent.ts";

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
    /* .env.local yoksa BASE_URL yeter */
  }
}

loadEnvLocal();

const baseUrl = (
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3005"
).replace(/\/$/, "");

const ISO = "2026-08-10T11:00:00.000Z";
/** Consent olmadan yüklenmemeli (GTM/gtag.js Consent Mode ile her zaman olabilir). */
const CONSENTED_TRACKER_HOSTS = [
  "clarity.ms/tag",
  "connect.facebook.net",
  "analytics.tiktok.com",
];

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

async function step(title, fn) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  await fn();
}

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function cookieHeader(value) {
  return `${COOKIE_CONSENT_NAME}=${value}`;
}

function parseSetCookie(header) {
  if (!header) return null;
  const [pair, ...attrs] = header.split(";").map((p) => p.trim());
  const eqIdx = pair.indexOf("=");
  const name = pair.slice(0, eqIdx);
  const value = pair.slice(eqIdx + 1);
  const flags = Object.fromEntries(
    attrs.map((attr) => {
      const i = attr.indexOf("=");
      if (i === -1) return [attr.toLowerCase(), true];
      return [attr.slice(0, i).toLowerCase(), attr.slice(i + 1)];
    }),
  );
  return { name, value, flags, raw: header };
}

async function request(pathname, init = {}) {
  const url = `${baseUrl}${pathname}`;
  const res = await fetch(url, { redirect: "manual", ...init });
  const text = await res.text();
  return {
    status: res.status,
    text,
    headers: res.headers,
    json: () => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
  };
}

async function postConsent(body, extraHeaders = {}) {
  const init = {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return request("/api/cookie-consent", init);
}

function extractConsentDefault(html) {
  const match = html.match(
    /gtag\('consent',\s*'default',\s*(\{[\s\S]*?\})\)/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1].replace(/\\"/g, '"'));
  } catch {
    try {
      return JSON.parse(match[1]);
    } catch {
      return match[1];
    }
  }
}

function hasTrackerHost(html) {
  return CONSENTED_TRACKER_HOSTS.filter((host) => html.includes(host));
}

try {
  const probe = await request("/");
  if (probe.status >= 500) {
    console.error(`Sunucu yanıt vermiyor: ${baseUrl} → ${probe.status}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Sunucuya bağlanılamadı: ${baseUrl}`);
  console.error("Önce `npm run dev` çalıştırın.");
  console.error(String(error?.message || error));
  process.exit(1);
}

await step("1) Lib — model / parse / Consent Mode", async () => {
  const denied = deniedConsent(ISO);
  const accepted = acceptedConsent(ISO);

  if (denied.necessary === true && !denied.analytics && !denied.marketing) {
    ok("deniedConsent yalnızca necessary");
  } else fail("deniedConsent yalnızca necessary", JSON.stringify(denied));

  if (
    accepted.necessary &&
    accepted.functional &&
    accepted.analytics &&
    accepted.marketing
  ) {
    ok("acceptedConsent tüm kategoriler açık");
  } else fail("acceptedConsent tüm kategoriler açık", JSON.stringify(accepted));

  if (!isCookieConsentPreferences({ ...denied, necessary: false })) {
    ok("necessary:false geçersiz");
  } else fail("necessary:false geçersiz");

  if (!isCookieConsentPreferences({ ...denied, analytics: "true" })) {
    ok("analytics string geçersiz");
  } else fail("analytics string geçersiz");

  if (!isCookieConsentPreferences({ ...denied, updatedAt: "" })) {
    ok("boş updatedAt geçersiz");
  } else fail("boş updatedAt geçersiz");

  if (!isCookieConsentPreferences({ ...denied, updatedAt: "<script>x</script>" })) {
    ok("XSS updatedAt geçersiz");
  } else fail("XSS updatedAt geçersiz");

  if (!isCookieConsentPreferences({ ...denied, updatedAt: "A".repeat(500) })) {
    ok("uzun updatedAt geçersiz");
  } else fail("uzun updatedAt geçersiz");

  if (isCookieConsentPreferences(denied)) ok("geçerli payload kabul");
  else fail("geçerli payload kabul");

  const raw = JSON.stringify(accepted);
  const once = encodeURIComponent(raw);
  const twice = encodeURIComponent(once);

  if (eq(parseCookieConsent(raw), accepted)) ok("parse ham JSON");
  else fail("parse ham JSON", String(parseCookieConsent(raw)));

  if (eq(parseCookieConsent(once), accepted)) ok("parse tek encode");
  else fail("parse tek encode");

  if (eq(parseCookieConsent(twice), accepted)) ok("parse çift encode");
  else fail("parse çift encode");

  if (parseCookieConsent(null) === null) ok("parse null → null");
  else fail("parse null → null");

  if (parseCookieConsent("not-json") === null) ok("parse bozuk → null");
  else fail("parse bozuk → null");

  if (parseCookieConsent(serializeCookieConsent(denied))?.analytics === false) {
    ok("serialize → parse round-trip");
  } else fail("serialize → parse round-trip");

  const none = toGoogleConsentState(null);
  if (
    none.analytics_storage === "denied" &&
    none.ad_storage === "denied" &&
    none.security_storage === "granted" &&
    none.wait_for_update === 500
  ) {
    ok("Consent Mode default denied + security granted");
  } else fail("Consent Mode default denied", JSON.stringify(none));

  const granted = toGoogleConsentState(accepted);
  if (
    granted.analytics_storage === "granted" &&
    granted.ad_storage === "granted" &&
    granted.ad_user_data === "granted" &&
    granted.ad_personalization === "granted" &&
    granted.functionality_storage === "granted"
  ) {
    ok("Consent Mode accepted → granted");
  } else fail("Consent Mode accepted → granted", JSON.stringify(granted));

  const mixed = toGoogleConsentState({
    necessary: true,
    functional: false,
    analytics: true,
    marketing: false,
    updatedAt: ISO,
  });
  if (
    mixed.analytics_storage === "granted" &&
    mixed.ad_storage === "denied" &&
    mixed.functionality_storage === "denied"
  ) {
    ok("Consent Mode kategori eşlemesi (analytics/marketing/functional)");
  } else fail("Consent Mode kategori eşlemesi", JSON.stringify(mixed));

  if (COOKIE_CONSENT_MAX_AGE === 60 * 60 * 24 * 180) {
    ok("ömür 180 gün");
  } else fail("ömür 180 gün", String(COOKIE_CONSENT_MAX_AGE));

  if (COOKIE_CONSENT_NAME === "eyupbaykara_cookie_consent") {
    ok("cookie adı siteye özel");
  } else fail("cookie adı siteye özel", COOKIE_CONSENT_NAME);
});

await step("2) API — mutlu yol", async () => {
  const accept = await postConsent({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
    updatedAt: ISO,
  });
  if (accept.status === 200 && accept.json()?.ok === true) ok("tümünü kabul 200");
  else fail("tümünü kabul 200", `${accept.status} ${accept.text}`);

  const deny = await postConsent({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    updatedAt: ISO,
  });
  if (deny.status === 200 && deny.json()?.ok === true) ok("tümünü reddet 200");
  else fail("tümünü reddet 200", `${deny.status} ${deny.text}`);

  const custom = await postConsent({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
    updatedAt: ISO,
  });
  if (custom.status === 200) ok("özel kombinasyon 200");
  else fail("özel kombinasyon 200", String(custom.status));

  const cookie = parseSetCookie(custom.headers.get("set-cookie"));
  if (!cookie) {
    fail("Set-Cookie var");
    return;
  }
  ok("Set-Cookie var");

  if (cookie.name === COOKIE_CONSENT_NAME) ok("cookie adı doğru");
  else fail("cookie adı doğru", cookie.name);

  if (cookie.flags.path === "/") ok("Path=/");
  else fail("Path=/", JSON.stringify(cookie.flags));

  if (String(cookie.flags["max-age"]) === String(COOKIE_CONSENT_MAX_AGE)) {
    ok("Max-Age=180 gün");
  } else fail("Max-Age=180 gün", String(cookie.flags["max-age"]));

  const sameSite = String(cookie.flags.samesite || "").toLowerCase();
  if (sameSite === "lax") ok("SameSite=Lax");
  else fail("SameSite=Lax", sameSite);

  if (!cookie.flags.httponly) ok("HttpOnly yok (JS okuyabilmeli)");
  else fail("HttpOnly yok", cookie.raw);

  if (!cookie.flags.secure) ok("dev'de Secure yok");
  else warn("dev'de Secure yok", "production dışı Secure set edilmiş");

  const decoded = parseCookieConsent(cookie.value);
  if (
    decoded?.necessary === true &&
    decoded.functional === true &&
    decoded.analytics === true &&
    decoded.marketing === false
  ) {
    ok("cookie payload whitelist + değerler doğru");
  } else fail("cookie payload", JSON.stringify(decoded));
});

await step("3) API — hata / validation", async () => {
  const cases = [
    ["necessary:false", { necessary: false, functional: true, analytics: true, marketing: true, updatedAt: ISO }],
    ["necessary string", { necessary: "true", functional: true, analytics: true, marketing: true, updatedAt: ISO }],
    ["analytics string", { necessary: true, functional: true, analytics: "true", marketing: true, updatedAt: ISO }],
    ["analytics 1", { necessary: true, functional: true, analytics: 1, marketing: true, updatedAt: ISO }],
    ["eksik updatedAt", { necessary: true, functional: true, analytics: true, marketing: true }],
    ["boş updatedAt", { necessary: true, functional: true, analytics: true, marketing: true, updatedAt: "" }],
    ["XSS updatedAt", { necessary: true, functional: true, analytics: true, marketing: true, updatedAt: "<script>alert(1)</script>" }],
    ["CRLF updatedAt", { necessary: true, functional: true, analytics: true, marketing: true, updatedAt: "2026-08-10T11:00:00.000Z\r\nSet-Cookie:x=1" }],
    ["cookie injection updatedAt", { necessary: true, functional: true, analytics: true, marketing: true, updatedAt: "x; Path=/; Domain=evil.com" }],
    ["eksik marketing", { necessary: true, functional: true, analytics: true, updatedAt: ISO }],
    ["null body fields", null],
    ["array body", [{ necessary: true }]],
  ];

  for (const [label, body] of cases) {
    const res = await postConsent(body);
    if (res.status === 400) ok(`400 ← ${label}`);
    else fail(`400 ← ${label}`, `status ${res.status} ${res.text}`);
  }

  const invalidJson = await postConsent("{not json", {});
  if (invalidJson.status === 400) ok("400 ← bozuk JSON");
  else fail("400 ← bozuk JSON", String(invalidJson.status));

  const empty = await request("/api/cookie-consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "",
  });
  if (empty.status === 400) ok("400 ← boş body");
  else fail("400 ← boş body", String(empty.status));

  const huge = await postConsent({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
    updatedAt: "A".repeat(50_000),
  });
  if (huge.status === 400) ok("400 ← cookie bomb updatedAt");
  else fail("400 ← cookie bomb updatedAt", `status ${huge.status}`);
});

await step("4) API — güvenlik", async () => {
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    const res = await request("/api/cookie-consent", { method });
    if (res.status === 405 || res.status === 404) ok(`${method} reddedildi (${res.status})`);
    else fail(`${method} reddedildi`, String(res.status));
  }

  const form = await request("/api/cookie-consent", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "necessary=true&functional=true&analytics=true&marketing=true&updatedAt=2026-08-10T11:00:00.000Z",
  });
  if (form.status === 400) ok("form CSRF (urlencoded) 400");
  else fail("form CSRF (urlencoded) 400", String(form.status));

  const evil = await postConsent(
    {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      updatedAt: ISO,
    },
    { origin: "https://evil.example" },
  );
  if (evil.status === 403) ok("foreign Origin 403");
  else fail("foreign Origin 403", String(evil.status));

  const localOrigin = await postConsent(
    {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      updatedAt: ISO,
    },
    { origin: baseUrl },
  );
  if (localOrigin.status === 200) ok("aynı origin 200");
  else fail("aynı origin 200", String(localOrigin.status));

  const extra = await postConsent(
    `{"necessary":true,"functional":true,"analytics":false,"marketing":false,"updatedAt":"${ISO}","admin":true,"role":"admin","__proto__":{"polluted":true}}`,
  );
  const extraCookie = parseSetCookie(extra.headers.get("set-cookie"));
  const extraPayload = extraCookie
    ? parseCookieConsent(extraCookie.value)
    : null;
  if (
    extra.status === 200 &&
    extraPayload &&
    extraPayload.admin !== true &&
    extraPayload.role !== "admin" &&
    Object.prototype.polluted !== true
  ) {
    ok("ek alan / prototype pollution cookie'ye yazılmaz");
  } else {
    fail(
      "ek alan / prototype pollution cookie'ye yazılmaz",
      JSON.stringify({ status: extra.status, extraPayload, polluted: Object.prototype.polluted }),
    );
  }

  const cors = await postConsent(
    {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      updatedAt: ISO,
    },
    { origin: "https://evil.example" },
  );
  const acao = cors.headers.get("access-control-allow-origin");
  if (!acao || acao === "null") ok("CORS * yok");
  else fail("CORS * yok", acao);
});

await step("5) SSR — Consent Mode + sayfalar", async () => {
  const home = await request("/");
  if (home.status === 200) ok("GET / 200");
  else fail("GET / 200", String(home.status));

  if (home.text.includes("google-consent-default")) ok("Consent Mode script id");
  else fail("Consent Mode script id");

  const deniedState = extractConsentDefault(home.text);
  if (
    deniedState &&
    deniedState.analytics_storage === "denied" &&
    deniedState.ad_storage === "denied" &&
    deniedState.security_storage === "granted"
  ) {
    ok("SSR default denied (cookie yok)");
  } else fail("SSR default denied", JSON.stringify(deniedState));

  if (home.text.includes("/cerezler")) ok("footer → /cerezler");
  else fail("footer → /cerezler");

  if (home.text.includes("Çerez tercihlerini güncelle")) {
    ok("footer tercih butonu");
  } else fail("footer tercih butonu");

  const homeTrackers = hasTrackerHost(home.text);
  if (home.text.includes("G-0MBEKH09LX") || home.text.includes("gtag/js")) {
    ok("gtag.js HTML'de (Google kurulum testi)");
  } else if (process.env.NEXT_PUBLIC_GA_ID) {
    fail("gtag.js HTML'de (Google kurulum testi)");
  }

  if (homeTrackers.length === 0) {
    ok("cookie yokken Clarity/Meta/TikTok URL yok");
  } else {
    fail("cookie yokken Clarity/Meta/TikTok URL yok", homeTrackers.join(", "));
  }

  if (home.text.includes("consent','update")) {
    ok("Consent Mode cookie update script HTML'de");
  } else {
    fail("Consent Mode cookie update script HTML'de");
  }

  const analyticsHtml = await request("/", {
    headers: {
      cookie: cookieHeader(
        JSON.stringify({
          necessary: true,
          functional: false,
          analytics: true,
          marketing: false,
          updatedAt: ISO,
        }),
      ),
    },
  });
  const analyticsState = extractConsentDefault(analyticsHtml.text);
  if (
    analyticsState?.analytics_storage === "denied" &&
    analyticsState?.ad_storage === "denied"
  ) {
    ok("cookie HTML'e işlenmez — default denied kalır, update tarayıcıda");
  } else {
    fail(
      "cookie HTML'e işlenmez — default denied kalır, update tarayıcıda",
      JSON.stringify(analyticsState),
    );
  }

  const encodedMarketing = encodeURIComponent(
    JSON.stringify({
      necessary: true,
      functional: true,
      analytics: false,
      marketing: true,
      updatedAt: ISO,
    }),
  );
  const marketingHtml = await request("/", {
    headers: { cookie: cookieHeader(encodedMarketing) },
  });
  const marketingState = extractConsentDefault(marketingHtml.text);
  if (marketingState?.ad_storage === "denied") {
    ok("encoded marketing cookie SSR default'u değiştirmez");
  } else {
    fail(
      "encoded marketing cookie SSR default'u değiştirmez",
      JSON.stringify(marketingState),
    );
  }

  const double = encodeURIComponent(encodedMarketing);
  const doubleHtml = await request("/", {
    headers: { cookie: cookieHeader(double) },
  });
  const doubleState = extractConsentDefault(doubleHtml.text);
  if (doubleState?.ad_storage === "denied") ok("çift encode cookie SSR'ı değiştirmez");
  else fail("çift encode cookie SSR'ı değiştirmez", JSON.stringify(doubleState));

  const badHtml = await request("/", {
    headers: { cookie: `${COOKIE_CONSENT_NAME}=<<<<<` },
  });
  if (badHtml.status === 200) ok("bozuk cookie sayfayı düşürmez");
  else fail("bozuk cookie sayfayı düşürmez", String(badHtml.status));
  const badState = extractConsentDefault(badHtml.text);
  if (badState?.analytics_storage === "denied") {
    ok("bozuk cookie → denied fallback");
  } else fail("bozuk cookie → denied fallback", JSON.stringify(badState));

  const xssHtml = await request("/", {
    headers: {
      cookie: cookieHeader(
        JSON.stringify({
          necessary: true,
          functional: true,
          analytics: true,
          marketing: true,
          updatedAt: "<img src=x onerror=alert(1)>",
        }),
      ),
    },
  });
  if (
    xssHtml.status === 200 &&
    !xssHtml.text.includes("<img src=x onerror=alert(1)>")
  ) {
    ok("XSS updatedAt HTML'e yansımaz");
  } else fail("XSS updatedAt HTML'e yansımaz");

  const cerezler = await request("/cerezler");
  if (cerezler.status === 200) ok("GET /cerezler 200");
  else fail("GET /cerezler 200", String(cerezler.status));
  if (cerezler.text.includes("Çerez politikası") || cerezler.text.includes("çerez politikası")) {
    ok("/cerezler başlık");
  } else fail("/cerezler başlık");
  if (cerezler.text.includes(COOKIE_CONSENT_NAME)) ok("/cerezler cookie adı");
  else fail("/cerezler cookie adı");
  if (cerezler.text.includes("Zorunlu")) ok("/cerezler zorunlu kategori");
  else fail("/cerezler zorunlu kategori");
  if (cerezler.text.includes("Analitik")) ok("/cerezler analitik kategori");
  else fail("/cerezler analitik kategori");
  if (cerezler.text.includes("Pazarlama")) ok("/cerezler pazarlama kategori");
  else fail("/cerezler pazarlama kategori");
  if (cerezler.text.includes("Consent Mode")) ok("/cerezler Consent Mode anlatımı");
  else fail("/cerezler Consent Mode anlatımı");

  const adminLogin = await request("/admin/login");
  if (adminLogin.status === 200) ok("GET /admin/login 200");
  else fail("GET /admin/login 200", String(adminLogin.status));
  const adminTrackers = hasTrackerHost(adminLogin.text);
  if (adminTrackers.length === 0) ok("admin login'de tracker URL yok");
  else fail("admin login'de tracker URL yok", adminTrackers.join(", "));
});

await step("6) Tracker env kapısı", async () => {
  const ids = {
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_CLARITY_PROJECT_ID: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
    NEXT_PUBLIC_GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
  };
  const configured = Object.entries(ids).filter(([, v]) => v && String(v).trim());
  if (configured.length === 0) {
    ok("tracker env boş → script yüklenmez (lokal beklenen)");
  } else {
    warn(
      "tracker env dolu — pixel'ler yalnızca ilgili consent ile yüklenmeli",
      configured.map(([k]) => k).join(", "),
    );
  }
});

console.log(
  `\n${passed} geçti, ${failed} kaldı, ${warned} uyarı`,
);
process.exit(failed ? 1 : 0);
