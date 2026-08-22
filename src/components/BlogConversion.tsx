"use client";

import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";

export type BlogTocItem = {
  id: string;
  label: string;
};

export function BlogTableOfContents({ items }: { items: BlogTocItem[] }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="İçindekiler"
      className="not-prose my-8 rounded-[1.5rem] border border-[#0b6b45]/12 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(18,53,36,0.05)] sm:px-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b6b45]/70">
        İçindekiler
      </p>
      <ol className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="group flex gap-3 text-sm leading-6 text-[#466254] transition hover:text-[#0b6b45]"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0b6b45]/10 text-[11px] font-semibold text-[#0b6b45]">
                {index + 1}
              </span>
              <span className="font-medium group-hover:underline group-hover:underline-offset-2">
                {item.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BlogWhatsAppButtons({ page }: { page: string }) {
  return (
    <div className="not-prose my-10 flex flex-wrap gap-3">
      <TrackedWhatsAppLink
        channel="blog"
        campaign={page}
        className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#085436]"
      >
        WhatsApp ile yazın
      </TrackedWhatsAppLink>
      <Link
        href="/iletisim"
        className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/25 bg-white px-6 py-3 text-sm font-semibold text-[#0b6b45] transition hover:border-[#0b6b45]/45 hover:bg-[#0b6b45]/5"
      >
        İletişim sayfasına git
      </Link>
      <TrackedWhatsAppLink
        channel="blog_cta"
        campaign={page}
        className="inline-flex items-center justify-center rounded-full bg-[#17372a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6b45]"
      >
        Hemen randevu al
      </TrackedWhatsAppLink>
    </div>
  );
}

export function BlogContactCard({
  page,
  title = "Bel fıtığınız için doğru değerlendirme",
  body = "Şikayetlerinizi netleştirmek ve hangi tedavinin size uygun olduğunu öğrenmek için iletişime geçebilirsiniz.",
}: {
  page: string;
  title?: string;
  body?: string;
}) {
  return (
    <aside className="not-prose my-10 rounded-[1.5rem] border border-[#0b6b45]/12 bg-[#123524] px-6 py-7 text-white sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#73df68]/80">
        İletişim
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <TrackedWhatsAppLink
          channel="blog_mid"
          campaign={page}
          className="inline-flex items-center justify-center rounded-full bg-[#73df68] px-5 py-2.5 text-sm font-semibold text-[#123524] transition hover:bg-white"
        >
          WhatsApp
        </TrackedWhatsAppLink>
        <Link
          href="/iletisim"
          className="inline-flex items-center justify-center rounded-full border border-white/25 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          İletişim
        </Link>
      </div>
    </aside>
  );
}

export function BlogLeadForm({ pageTitle }: { pageTitle: string }) {
  return (
    <div className="not-prose mt-12 border-t border-[#0b6b45]/12 pt-10">
      <LeadForm
        embedded
        copy={{
          kicker: "Op. Dr. Eyüp Baykara",
          title: "Ücretsiz ön değerlendirme",
          description: `${pageTitle} hakkında sorularınız için formu doldurun; sizi arayalım.`,
          ctaLabel: "İletişime geç",
        }}
      />
    </div>
  );
}
