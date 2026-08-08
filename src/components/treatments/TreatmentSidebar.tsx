import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Treatment } from "@/data/treatments";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";

const PHONE_DISPLAY = "0530 783 72 24";
const PHONE_TEL = "+905307837224";
const EMAIL = "info@endospineistanbul.com";

type TreatmentSidebarProps = {
  related: Treatment[];
};

export function TreatmentSidebar({ related }: TreatmentSidebarProps) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24">
      {/* İletişim */}
      <div className="overflow-hidden rounded-2xl bg-[#123524] text-white shadow-[0_16px_40px_rgba(18,53,36,0.12)]">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ea67d]">
            İletişim
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight">
            Destek ekibimize ulaşın
          </h2>
        </div>
        <ul className="space-y-4 px-6 py-5 text-sm leading-6 text-[#c9dccf]">
          <li className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4ea67d]" aria-hidden />
            <span>
              Özel Silivri Anadolu Hastanesi
              <br />
              Mimar Sinan Mah, Mimar Sinan Cd. No:72
              <br />
              34570 Silivri / İstanbul
            </span>
          </li>
          <li>
            <a
              href={`tel:${PHONE_TEL}`}
              className="flex items-center gap-3 transition hover:text-white"
            >
              <Phone className="h-4 w-4 shrink-0 text-[#4ea67d]" aria-hidden />
              {PHONE_DISPLAY}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-3 break-all transition hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0 text-[#4ea67d]" aria-hidden />
              {EMAIL}
            </a>
          </li>
        </ul>
      </div>

      {/* Diğer tedaviler */}
      {related.length > 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
            Tedaviler
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
            Diğer tedaviler
          </h2>
          <ul className="mt-5 divide-y divide-[#0b6b45]/10">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/tedaviler/${item.slug}`}
                  className="flex items-center justify-between gap-3 py-3.5 text-sm font-medium text-[#244233] transition hover:text-[#0b6b45]"
                >
                  <span className="leading-snug">
                    {item.navTitle.replace(
                      /^Full Endoskopik Tam Kapalı\s+/i,
                      "",
                    )}
                  </span>
                  <span aria-hidden className="text-[#0b6b45]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Randevu CTA */}
      <div className="rounded-2xl border border-[#0b6b45]/15 bg-white p-6 shadow-sm">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
          Randevu alın
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#466254]">
          Muayene ve görüntüleme sonrası size en uygun full endoskopik yaklaşımı
          birlikte netleştirelim.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            href="/iletisim"
            className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#085436]"
          >
            Randevu Al
          </Link>
          <TrackedWhatsAppLink
            channel="treatment_sidebar"
            className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/25 px-5 py-3 text-sm font-semibold text-[#0b6b45] transition hover:border-[#0b6b45]"
          >
            WhatsApp
          </TrackedWhatsAppLink>
        </div>
      </div>
    </aside>
  );
}
