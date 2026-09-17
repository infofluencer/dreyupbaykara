#!/usr/bin/env node
/**
 * Deploy sonrası IndexNow + sitemap ping.
 * Kullanım:
 *   SITE_URL=https://endoskopikbelameliyati.com SEO_PING_SECRET=xxx npm run seo:ping
 */

const site = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://endoskopikbelameliyati.com"
).replace(/\/$/, "");

const secret = process.env.SEO_PING_SECRET || process.env.CRON_SECRET;

async function main() {
  if (!secret) {
    console.error(
      "SEO_PING_SECRET veya CRON_SECRET gerekli. Örnek:\n  SEO_PING_SECRET=gizli npm run seo:ping",
    );
    process.exit(1);
  }

  const res = await fetch(`${site}/api/seo/indexnow`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const json = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, ...json }, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
