import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/data/blog";
import {
  BlogLeadForm,
  BlogWhatsAppButtons,
} from "@/components/BlogConversion";
import { CmsSections } from "@/components/cms/CmsSections";
import { PageHero } from "@/components/PageHero";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";
import { VectorPattern } from "@/components/VectorPattern";
import { getPublishedPage, mediaPublicUrl } from "@/lib/cms/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
).replace(/\/$/, "");

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cmsPost = await getPublishedPage(`/blog/${slug}`);
  const post = getBlogPost(slug);
  if (!cmsPost && !post) return {};

  const path = `/blog/${slug}`;
  const absolute = `${SITE_URL}${path}`;
  const title =
    cmsPost?.seo_title ||
    post?.metaTitle ||
    `${cmsPost?.title || post?.title} | Op. Dr. Eyüp Baykara`;
  const description =
    cmsPost?.seo_description ||
    post?.metaDescription ||
    cmsPost?.excerpt ||
    post?.excerpt;
  const image = cmsPost
    ? mediaPublicUrl(cmsPost.featured_image_path)
    : post?.image;

  return {
    title,
    description,
    alternates: {
      canonical: cmsPost?.canonical_url || path,
      languages: {
        tr: absolute,
        "tr-TR": absolute,
        "x-default": absolute,
      },
    },
    openGraph: {
      title: cmsPost?.title || post?.title,
      description: cmsPost?.excerpt || post?.excerpt || description,
      url: absolute,
      images: image ? [image] : undefined,
      type: "article",
      publishedTime: cmsPost?.published_at || post?.date,
      locale: "tr_TR",
    },
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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const cmsPost = await getPublishedPage(`/blog/${slug}`);
  const post = getBlogPost(slug);
  if (!cmsPost && !post) notFound();

  const title = cmsPost?.title || post!.title;
  const excerpt = cmsPost?.excerpt || post!.excerpt;
  const image = cmsPost
    ? mediaPublicUrl(cmsPost.featured_image_path) || undefined
    : post!.image;
  const imageAlt =
    cmsPost?.featured_image_alt || post?.imageAlt || title;
  const date =
    cmsPost?.published_at?.slice(0, 10) ||
    post?.date ||
    new Date().toISOString().slice(0, 10);
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const showWhatsApp = post?.showWhatsAppCta ?? Boolean(cmsPost);
  const showLeadForm = post?.showLeadForm ?? false;

  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title={title}
        description={excerpt}
        image={image}
        imageAlt={imageAlt}
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: title, href: `/blog/${slug}` },
        ]}
      />

      <section className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <article className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-14 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start xl:gap-14">
            <div className="min-w-0 max-w-3xl">
              <time
                dateTime={date}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70"
              >
                {formatDate(date)}
              </time>

              {image ? (
                <figure className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={imageAlt}
                    width={1200}
                    height={800}
                    className="aspect-[16/10] w-full object-cover"
                  />
                </figure>
              ) : null}

              {cmsPost ? (
                <div className="mt-8">
                  <CmsSections sections={cmsPost.content_sections} />
                </div>
              ) : (
                <div
                  className="blog-prose mt-8"
                  dangerouslySetInnerHTML={{ __html: post!.contentHtml }}
                />
              )}

              {showWhatsApp ? <BlogWhatsAppButtons page={slug} /> : null}

              {showLeadForm ? <BlogLeadForm pageTitle={title} /> : null}

              {post?.sourceUrl && !cmsPost ? (
                <p className="mt-12 border-t border-[#0b6b45]/12 pt-6 text-sm text-[#466254]">
                  Kaynak:{" "}
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#0b6b45] underline-offset-2 hover:underline"
                  >
                    endospineistanbul.com
                  </a>
                </p>
              ) : null}
            </div>

            {related.length > 0 ? (
              <aside className="lg:top-8">
                <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold tracking-tight text-[#123524]">
                  Diğer yazılar
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {related.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/blog/${item.slug}`}
                      className="rounded-[1.25rem] border border-[#0b6b45]/10 bg-white p-4 transition hover:border-[#0b6b45]/25"
                    >
                      <p className="text-xs text-[#0b6b45]/70">
                        {formatDate(item.date)}
                      </p>
                      <p className="mt-1.5 font-[family-name:var(--font-instrument-sans)] text-sm font-semibold leading-snug text-[#123524]">
                        {item.title}
                      </p>
                    </Link>
                  ))}
                </div>
                {showWhatsApp ? (
                  <div className="mt-6">
                    <TrackedWhatsAppLink
                      channel="blog_sidebar"
                      campaign={slug}
                      className="inline-flex w-full items-center justify-center rounded-full bg-[#17372a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6b45]"
                    >
                      WhatsApp ile soru sorun
                    </TrackedWhatsAppLink>
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
