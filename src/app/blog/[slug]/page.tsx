import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/data/blog";
import { PageHero } from "@/components/PageHero";
import { VectorPattern } from "@/components/VectorPattern";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} | Op. Dr. Eyüp Baykara`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.image ? [post.image] : undefined,
      type: "article",
      publishedTime: post.date,
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
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        eyebrow="Blog"
        title={post.title}
        description={post.excerpt}
        image={post.image}
        imageAlt=""
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
      />

      <div className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <article className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-14 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start xl:gap-14">
            <div className="min-w-0 max-w-3xl">
              <time
                dateTime={post.date}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70"
              >
                {formatDate(post.date)}
              </time>

              <div
                className="blog-prose mt-8"
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />

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
              </aside>
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
