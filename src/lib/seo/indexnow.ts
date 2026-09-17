/**
 * IndexNow — Bing / Yandex / diğer destekleyen motorlara URL bildirimi.
 * Google için asıl yol: Search Console’da sitemap gönderimi.
 */

const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || "183b9edd0c195c347904829cf2442543";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
  ).replace(/\/$/, "");
}

export function getIndexNowKey() {
  return INDEXNOW_KEY;
}

export async function submitUrlsToIndexNow(
  urls: string[],
): Promise<{ ok: boolean; status: number; body: string }> {
  const host = new URL(siteUrl()).host;
  const unique = [...new Set(urls)].filter((url) => {
    try {
      return new URL(url).host === host;
    } catch {
      return false;
    }
  });

  if (!unique.length) {
    return { ok: false, status: 400, body: "URL listesi boş" };
  }

  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${siteUrl()}/${INDEXNOW_KEY}.txt`,
    urlList: unique.slice(0, 10000),
  };

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const body = await response.text().catch(() => "");
  return {
    ok: response.ok || response.status === 202,
    status: response.status,
    body,
  };
}

/** Sitemap ping (Google ping endpoint; IndexNow asıl bildirim kanalı). */
export async function pingSitemap(): Promise<{ google: number; bing: number }> {
  const sitemap = `${siteUrl()}/sitemap.xml`;
  const [google, bing] = await Promise.all([
    fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    ).then((r) => r.status),
    fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    ).then((r) => r.status),
  ]);
  return { google, bing };
}
