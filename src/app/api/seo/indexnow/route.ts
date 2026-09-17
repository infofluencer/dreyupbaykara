import { NextResponse } from "next/server";
import { blogPosts } from "@/data/blog";
import { treatments } from "@/data/treatments";
import {
  pingSitemap,
  submitUrlsToIndexNow,
} from "@/lib/seo/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
  ).replace(/\/$/, "");
}

function absolute(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function collectUrls() {
  const urls = [
    absolute("/"),
    absolute("/hizmetler"),
    absolute("/hakkimizda"),
    absolute("/iletisim"),
    absolute("/hasta-deneyimleri"),
    absolute("/blog"),
    ...treatments.map((t) => absolute(`/tedaviler/${t.slug}`)),
    ...blogPosts.map((p) => absolute(`/blog/${p.slug}`)),
  ];
  return urls;
}

function authorized(request: Request) {
  const secret = process.env.SEO_PING_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  const token =
    header?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret");
  return token === secret;
}

/** Bilgi: IndexNow key konumu ve örnek kullanım. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST /api/seo/indexnow Authorization: Bearer <SEO_PING_SECRET> ile URL’leri IndexNow’a gönderin. Google için Search Console’da sitemap.xml ekleyin.",
    sitemap: `${siteUrl()}/sitemap.xml`,
    robots: `${siteUrl()}/robots.txt`,
    urlCount: collectUrls().length,
  });
}

/** Tüm önemli URL’leri IndexNow’a gönder + sitemap ping. */
export async function POST(request: Request) {
  const secret = process.env.SEO_PING_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "SEO_PING_SECRET veya CRON_SECRET tanımlayın; ardından Bearer token ile POST edin.",
      },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let urls = collectUrls();
  try {
    const body = (await request.json()) as { urls?: string[] };
    if (Array.isArray(body.urls) && body.urls.length) {
      urls = body.urls;
    }
  } catch {
    // body yoksa tüm site URL’leri
  }

  const [indexNow, pings] = await Promise.all([
    submitUrlsToIndexNow(urls),
    pingSitemap().catch(() => ({ google: 0, bing: 0 })),
  ]);

  return NextResponse.json({
    ok: indexNow.ok,
    submitted: urls.length,
    indexNow,
    sitemapPing: pings,
  });
}
