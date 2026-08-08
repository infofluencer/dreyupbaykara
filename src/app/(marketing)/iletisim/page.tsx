import type { Metadata } from "next";
import { CmsSections } from "@/components/cms/CmsSections";
import { PageShell } from "@/components/PageShell";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";
import { getPublishedPage, getPublicSettings } from "@/lib/cms/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/iletisim");
  return {
    title: content?.seo_title || "İletişim | Op. Dr. Eyüp Baykara",
    description:
      content?.seo_description ||
      "Randevu ve iletişim: Özel Silivri Anadolu Hastanesi. Telefon 0530 783 72 24.",
    alternates: { canonical: content?.canonical_url || "/iletisim" },
  };
}

const PHONE_TEL = "+905307837224";
const PHONE_DISPLAY = "0530 783 72 24";
const EMAIL = "info@endospineistanbul.com";

export default async function IletisimPage() {
  const [content, settings] = await Promise.all([
    getPublishedPage("/iletisim"),
    getPublicSettings([
      "contact.phone",
      "contact.email",
      "contact.clinic",
    ]),
  ]);
  const phoneDisplay =
    typeof settings["contact.phone"] === "string"
      ? settings["contact.phone"]
      : PHONE_DISPLAY;
  const phoneDigits = phoneDisplay.replace(/\D/g, "");
  const phoneTel = phoneDigits.startsWith("0")
    ? `+90${phoneDigits.slice(1)}`
    : `+${phoneDigits}`;
  const email =
    typeof settings["contact.email"] === "string"
      ? settings["contact.email"]
      : EMAIL;
  const clinic =
    typeof settings["contact.clinic"] === "object" &&
    settings["contact.clinic"] !== null
      ? (settings["contact.clinic"] as { name?: string; city?: string })
      : {};

  return (
    <PageShell
      title={content?.title || "Bize Ulaşın"}
      description={
        content?.excerpt ||
        "Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz."
      }
      breadcrumb={[
        { label: "Anasayfa", href: "/" },
        { label: "İletişim", href: "/iletisim" },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a
          href={`tel:${phoneTel || PHONE_TEL}`}
          className="rounded-[1.5rem] border border-[#0b6b45]/10 bg-white p-6 shadow-[0_12px_36px_rgba(18,53,36,0.05)] transition hover:border-[#0b6b45]/25"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
            Telefon
          </p>
          <p className="mt-3 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold text-[#123524]">
            {phoneDisplay}
          </p>
        </a>

        <TrackedWhatsAppLink
          channel="iletisim"
          className="rounded-[1.5rem] border border-[#0b6b45]/10 bg-white p-6 shadow-[0_12px_36px_rgba(18,53,36,0.05)] transition hover:border-[#0b6b45]/25"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
            WhatsApp
          </p>
          <p className="mt-3 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold text-[#123524]">
            Hemen yazın
          </p>
        </TrackedWhatsAppLink>

        <a
          href={`mailto:${email}`}
          className="rounded-[1.5rem] border border-[#0b6b45]/10 bg-white p-6 shadow-[0_12px_36px_rgba(18,53,36,0.05)] transition hover:border-[#0b6b45]/25 md:col-span-2 lg:col-span-1"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
            E-posta
          </p>
          <p className="mt-3 break-all font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
            {email}
          </p>
        </a>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-[#0b6b45]/10 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
          Klinik
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold text-[#123524]">
          {clinic.name || "Özel Silivri Anadolu Hastanesi"}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#466254]">
          {clinic.city || "Mimar Sinan Mah, Silivri / İstanbul"}
        </p>
        <a
          href="https://maps.google.com/?q=%C3%96zel+Silivri+Anadolu+Hastanesi"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex text-sm font-semibold text-[#0b6b45] transition hover:text-[#085436]"
        >
          Haritada aç →
        </a>
      </div>
      {content?.content_sections.length ? (
        <div className="mt-10">
          <CmsSections sections={content.content_sections} />
        </div>
      ) : null}
    </PageShell>
  );
}
