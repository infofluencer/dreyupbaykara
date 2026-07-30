"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { blogPosts } from "@/data/blog";
import { VectorPattern } from "@/components/VectorPattern";

const PREVIEW = blogPosts.slice(0, 4);

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomeBlogSection() {
  return (
    <section
      id="blog"
      className="relative overflow-hidden bg-[#fdfaf5] px-6 pb-20 pt-6 md:px-10 md:pb-24 lg:px-16"
    >
      <VectorPattern tone="light" opacity={0.04} size={400} />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0b6b45]/70">
              Bilgi köşesi
            </p>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tracking-tight text-[#123524] sm:text-4xl">
              Blog
            </h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#0b6b45] transition hover:text-[#085436] sm:self-auto"
          >
            Tüm yazılar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PREVIEW.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.55,
                delay: Math.min(i, 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/10 bg-white shadow-[0_12px_36px_rgba(18,53,36,0.05)]"
            >
              <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt=""
                  width={640}
                  height={400}
                  className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </Link>
              <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                <time
                  dateTime={post.date}
                  className="text-xs font-medium tracking-wide text-[#0b6b45]/70"
                >
                  {formatDate(post.date)}
                </time>
                <h3 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-base font-semibold leading-snug tracking-tight text-[#123524]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition hover:text-[#0b6b45]"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#466254]">
                  {post.excerpt}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
