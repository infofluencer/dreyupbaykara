import type { MetadataRoute } from "next";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
  ).replace(/\/$/, "");
}

/**
 * Sadece admin / API / takip yönlendirmesini engelle.
 * `Disallow: /r` tek başına /randevu gibi yolları da keserdi; bu yüzden
 * Google’ın desteklediği `$` ve `?` ile sadece /r takip rotası kapatılır.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const disallow = ["/admin", "/admin/", "/api/", "/r$", "/r?"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
