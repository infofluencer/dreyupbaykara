#!/usr/bin/env node
/**
 * Kalıcı marketing token'larını terminalden al (OAuth site akışı gerekmez).
 *
 * Önce Google Cloud + Meta App → OAuth redirect URI'ye ekleyin:
 *   http://127.0.0.1:8765/callback
 *
 *   npm run marketing:tokens google
 *   npm run marketing:tokens meta
 *
 * .env.local'de CLIENT_ID/SECRET vb. dolu olmalı.
 * Çıktıyı Dokploy env'ine yapıştırın (GOOGLE_ADS_REFRESH_TOKEN / META_ACCESS_TOKEN).
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const REDIRECT_URI = "http://127.0.0.1:8765/callback";
const PORT = 8765;
const PROD_BASE = (
  process.env.MARKETING_PROD_URL ||
  process.env.MARKETING_OAUTH_REDIRECT_BASE ||
  "https://endoskopikbelameliyati.com"
).replace(/\/$/, "");

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
    console.warn("Uyarı: .env.local okunamadı — ortam değişkenlerini export edin.\n");
  }
}

function openBrowser(url) {
  try {
    if (process.platform === "darwin") {
      execSync(`open "${url}"`, { stdio: "ignore" });
    } else if (process.platform === "win32") {
      execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    }
  } catch {
    /* tarayıcı açılamazsa URL zaten yazdırıldı */
  }
}

function waitForOAuthCode() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("5 dakika içinde callback gelmedi."));
    }, 5 * 60 * 1000);

    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        res.end(`<h1>Hata: ${error}</h1><p>Bu pencereyi kapatabilirsiniz.</p>`);
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth reddedildi: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        "<h1>Token alındı</h1><p>Terminal'e dönün. Bu pencereyi kapatabilirsiniz.</p>",
      );
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server.listen(PORT, "127.0.0.1", () => {
      /* ready */
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function exchangeGoogle(code) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_ADS_CLIENT_ID ve GOOGLE_ADS_CLIENT_SECRET gerekli");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || "Google token hatası");
  }

  return json;
}

async function exchangeMeta(code) {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID ve META_APP_SECRET gerekli");
  }

  const shortRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: REDIRECT_URI,
      code,
    })}`,
  );
  const shortJson = await shortRes.json();
  if (!shortRes.ok || !shortJson.access_token) {
    throw new Error(
      shortJson.error?.message || "Meta kısa ömürlü token alınamadı",
    );
  }

  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortJson.access_token,
    })}`,
  );
  const longJson = await longRes.json();
  if (!longRes.ok || !longJson.access_token) {
    throw new Error(
      longJson.error?.message || "Meta long-lived token exchange başarısız",
    );
  }

  return longJson;
}

async function runGoogle() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_ADS_CLIENT_ID eksik");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log("\n=== Google Ads refresh token ===\n");
  console.log("1) Google Cloud → OAuth client → Authorized redirect URIs:");
  console.log(`   ${REDIRECT_URI}\n`);
  console.log("2) Tarayıcıda giriş yapın (MCC erişimi olan Google hesabı):\n");
  console.log(authUrl, "\n");

  openBrowser(authUrl);
  console.log(`Dinleniyor: ${REDIRECT_URI} ...\n`);

  const code = await waitForOAuthCode();
  const tokens = await exchangeGoogle(code);

  console.log("--- Dokploy / .env.local için kopyalayın ---\n");
  if (tokens.refresh_token) {
    console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
  } else {
    console.log(
      "UYARI: refresh_token gelmedi. Daha önce onay verdiyseniz Google Cloud'da",
    );
    console.log(
      "OAuth iznini revoke edip tekrar deneyin (prompt=consent zorunlu).\n",
    );
    if (tokens.access_token) {
      console.log(`GOOGLE_ADS_ACCESS_TOKEN=${tokens.access_token}`);
      console.log("(Geçici — ~1 saat; refresh_token tercih edin.)\n");
    }
  }

  if (tokens.expires_in) {
    console.log(`# access_token süresi: ${tokens.expires_in} saniye`);
  }
  console.log("");
}

async function runMeta() {
  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    throw new Error("META_APP_ID eksik");
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: REDIRECT_URI,
    scope: "ads_read",
    response_type: "code",
  });

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;

  console.log("\n=== Meta access token (long-lived ~60 gün) ===\n");
  console.log("Kalıcı token için Business Manager → System User tercih edin.");
  console.log("Bu script long-lived user token verir.\n");
  console.log("1) Meta App → Facebook Login → Valid OAuth Redirect URIs:");
  console.log(`   ${REDIRECT_URI}\n`);
  console.log("2) Tarayıcıda giriş yapın:\n");
  console.log(authUrl, "\n");

  openBrowser(authUrl);
  console.log(`Dinleniyor: ${REDIRECT_URI} ...\n`);

  const code = await waitForOAuthCode();
  const tokens = await exchangeMeta(code);

  console.log("--- Dokploy / .env.local için kopyalayın ---\n");
  console.log(`META_ACCESS_TOKEN=${tokens.access_token}`);
  if (tokens.expires_in) {
    const days = Math.round(tokens.expires_in / 86400);
    console.log(`# yaklaşık ${days} gün geçerli`);
  }
  console.log("");
}

async function runProd(platformName) {
  const path =
    platformName === "google"
      ? "/api/marketing/oauth/google"
      : "/api/marketing/oauth/meta";
  const connected = platformName === "google" ? "google" : "meta";
  const envKey =
    platformName === "google"
      ? "GOOGLE_ADS_REFRESH_TOKEN"
      : "META_ACCESS_TOKEN";

  const authUrl = `${PROD_BASE}${path}`;
  const afterUrl = `${PROD_BASE}/admin/marketing/connect?connected=${connected}`;

  console.log(`\n=== Canlı OAuth (${platformName}) ===\n`);
  console.log("Önkoşul — Dokploy env:");
  if (platformName === "google") {
    console.log("  GOOGLE_ADS_CLIENT_ID, CLIENT_SECRET, DEVELOPER_TOKEN");
    console.log("  GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_CUSTOMER_IDS");
    console.log("  MARKETING_OAUTH_REDIRECT_BASE=https://endoskopikbelameliyati.com");
  } else {
    console.log("  META_APP_ID, META_APP_SECRET, META_AD_ACCOUNT_ID");
  }
  console.log("\n1) Admin panelde oturum açın (admin rolü — token satırını görmek için)");
  console.log(`2) Tarayıcıda OAuth başlatılıyor:\n   ${authUrl}\n`);
  console.log("3) İzin verdikten sonra connect sayfasında env satırını kopyalayın:");
  console.log(`   ${afterUrl}`);
  console.log(`4) Dokploy'a ${envKey}=... ekleyin → redeploy\n`);

  openBrowser(authUrl);
}

function usage() {
  console.log(`
Kullanım:
  npm run marketing:tokens google          # local script (127.0.0.1:8765)
  npm run marketing:tokens meta
  npm run marketing:tokens prod google     # canlı site OAuth
  npm run marketing:tokens prod meta

Canlı prod URL (opsiyonel):
  MARKETING_PROD_URL=https://endoskopikbelameliyati.com

Local redirect URI (Google Cloud + Meta App):
  ${REDIRECT_URI}
`);
}

loadEnvLocal();

const args = process.argv.slice(2).map((a) => a.toLowerCase());
const isProd = args[0] === "prod" || args.includes("--prod");
const platform = isProd
  ? args.find((a) => a === "google" || a === "meta")
  : args.find((a) => a === "google" || a === "meta");

try {
  if (isProd && platform) {
    await runProd(platform);
  } else if (platform === "google") {
    await runGoogle();
  } else if (platform === "meta") {
    await runMeta();
  } else {
    usage();
    process.exit(args.length ? 1 : 0);
  }
} catch (err) {
  console.error("\nHata:", err instanceof Error ? err.message : err);
  process.exit(1);
}
