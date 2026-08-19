"use client";

import { LeadForm } from "@/components/LeadForm";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";

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
      <TrackedWhatsAppLink
        channel="blog_cta"
        campaign={page}
        className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/25 bg-white px-6 py-3 text-sm font-semibold text-[#0b6b45] transition hover:border-[#0b6b45]/45 hover:bg-[#0b6b45]/5"
      >
        Hemen randevu al
      </TrackedWhatsAppLink>
    </div>
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
