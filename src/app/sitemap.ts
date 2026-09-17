import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog";
import { treatments } from "@/data/treatments";
import { getPublishedPagesByType } from "@/lib/cms/content";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
  ).replace(/\/$/, "");
}

function absolute(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Sitemap her deploy’da taze kalsın; botlar güncel URL listesini görsün. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absolute("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absolute("/hizmetler"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: absolute("/hakkimizda"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absolute("/iletisim"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: absolute("/hasta-deneyimleri"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absolute("/blog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absolute("/cerezler"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const treatmentRoutes: MetadataRoute.Sitemap = treatments.map(
    (treatment) => ({
      url: absolute(`/tedaviler/${treatment.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.95,
    }),
  );

  const staticBlogSlugs = new Set(blogPosts.map((post) => post.slug));
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absolute(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  try {
    const cmsBlogPages = await getPublishedPagesByType("blog");
    for (const page of cmsBlogPages) {
      const slug = page.slug.replace(/^\/blog\//, "").replace(/^\//, "");
      if (!slug || staticBlogSlugs.has(slug)) continue;
      blogRoutes.push({
        url: absolute(`/blog/${slug}`),
        lastModified: page.published_at
          ? new Date(page.published_at)
          : now,
        changeFrequency: "monthly",
        priority: 0.65,
      });
    }
  } catch {
    // CMS erişilemezse statik sitemap yine de yayınlanır; 500 vermez.
  }

  return [...staticRoutes, ...treatmentRoutes, ...blogRoutes];
}
