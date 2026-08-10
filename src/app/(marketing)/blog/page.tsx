import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/data/blog";
import { PAGE_SEO } from "@/data/seo";
import { PageHero } from "@/components/PageHero";
import { VectorPattern } from "@/components/VectorPattern";
import {
  getPublishedPage,
  getPublishedPagesByType,
  mediaPublicUrl,
} from "@/lib/cms/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/blog");
  const seo = PAGE_SEO.blog;
  return {
    title: content?.seo_title || seo.title,
    description: content?.seo_description || seo.description,
    alternates: { canonical: content?.canonical_url || "/blog" },
  };
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const [content, cmsPosts] = await Promise.all([
    getPublishedPage("/blog"),
    getPublishedPagesByType("blog"),
  ]);
  const cmsItems = cmsPosts.map((post) => ({
    slug: post.slug.replace(/^\/blog\//, ""),
    title: post.title,
    excerpt: post.excerpt || "",
    image: mediaPublicUrl(post.featured_image_path) || "",
    date: post.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  }));
  const cmsSlugs = new Set(cmsItems.map((post) => post.slug));
  const posts = [
    ...cmsItems,
    ...blogPosts.filter((post) => !cmsSlugs.has(post.slug)),
  ];

  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title={content?.title || "Sağlık Rehberi"}
        description={
          content?.excerpt || PAGE_SEO.blog.snippet
        }
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Blog", href: "/blog" },
        ]}
      />

      <section className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-14 lg:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/10 bg-white shadow-[0_12px_36px_rgba(18,53,36,0.05)]"
              >
                <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt=""
                    width={800}
                    height={500}
                    className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </Link>
                <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <time
                    dateTime={post.date}
                    className="text-xs font-medium tracking-wide text-[#0b6b45]/70"
                  >
                    {formatDate(post.date)}
                  </time>
                  <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold leading-snug tracking-tight text-[#123524]">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="transition hover:text-[#0b6b45]"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#466254]">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b6b45] transition hover:text-[#085436]"
                  >
                    Devamını oku
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
