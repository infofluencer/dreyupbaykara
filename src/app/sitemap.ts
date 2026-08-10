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
      url: absolute("/hakkimizda"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absolute("/iletisim"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absolute("/hasta-deneyimleri"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absolute("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absolute("/cerezler"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const treatmentRoutes: MetadataRoute.Sitemap = treatments.map(
    (treatment) => ({
      url: absolute(`/tedaviler/${treatment.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }),
  );

  const staticBlogSlugs = new Set(blogPosts.map((post) => post.slug));
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absolute(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

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
      priority: 0.6,
    });
  }

  return [...staticRoutes, ...treatmentRoutes, ...blogRoutes];
}
