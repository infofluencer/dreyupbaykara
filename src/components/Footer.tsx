import Image from "next/image";
import Link from "next/link";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";
import { CookiePreferencesButton } from "@/components/layouts/footer/cookie-preferences-button";
import { VectorPattern } from "@/components/VectorPattern";

const TREATMENTS = [
  {
    href: "/tedaviler/bel-fitigi-ameliyati",
    label: "Bel Fıtığı Ameliyatı",
  },
  {
    href: "/tedaviler/boyun-fitigi-ameliyati",
    label: "Boyun Fıtığı Ameliyatı",
  },
  {
    href: "/tedaviler/kanal-darligi-ameliyati",
    label: "Kanal Darlığı Ameliyatı",
  },
] as const;

const NAV = [
  { href: "/", label: "Anasayfa" },
  { href: "/hasta-deneyimleri", label: "Hasta Deneyimleri" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/blog", label: "Blog" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-20 overflow-hidden bg-[#123524] text-white">
      <VectorPattern tone="dark" opacity={0.06} size={400} />
      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-10 md:px-10 lg:px-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div>
            <p className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold tracking-tight text-white">
              Op. Dr. Eyüp Baykara
            </p>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
              Full endoskopik tam kapalı bel, boyun fıtığı ve kanal darlığı
              cerrahisi.
            </p>
            <TrackedWhatsAppLink
              channel="footer"
              className="mt-6 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-sm font-semibold text-white transition hover:border-white"
            >
              Randevu al
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TrackedWhatsAppLink>
          </div>

          <div>
            <p className="font-[family-name:var(--font-instrument-sans)] text-sm font-semibold tracking-wide text-white">
              Tedaviler
            </p>
            <ul className="mt-5 space-y-3">
              {TREATMENTS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-[family-name:var(--font-instrument-sans)] text-sm font-semibold tracking-wide text-white">
              Keşfet
            </p>
            <ul className="mt-5 space-y-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-[family-name:var(--font-instrument-sans)] text-sm font-semibold tracking-wide text-white">
              İletişim
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-white/60">
              <li>
                <p className="text-white/40">Klinik</p>
                <p className="mt-1 text-white/75">
                  Özel Silivri Anadolu Hastanesi
                  <br />
                  Silivri / İstanbul
                </p>
              </li>
              <li>
                <p className="text-white/40">Telefon</p>
                <a
                  href="tel:+905307837224"
                  className="mt-1 block text-white/75 transition hover:text-white"
                >
                  0530 783 72 24
                </a>
              </li>
              <li>
                <p className="text-white/40">E-posta</p>
                <a
                  href="mailto:info@endospineistanbul.com"
                  className="mt-1 block text-white/75 transition hover:text-white"
                >
                  info@endospineistanbul.com
                </a>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://www.instagram.com/doktoreyupbaykara/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/55 transition hover:text-white"
                aria-label="Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@opdreyupbaykara"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/55 transition hover:text-white"
                aria-label="YouTube"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.7 4.8 12 4.8 12 4.8s-6.7 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1.2 12a29 29 0 0 0 .3 4.8 2.8 2.8 0 0 0 2 2c1.8.4 8.5.4 8.5.4s6.7 0 8.5-.4a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .3-4.8 29 29 0 0 0-.3-4.8z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M10 15.2V8.8L15.5 12 10 15.2z" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-10">
          <Link
            href="/#home"
            className="mb-8 flex justify-center sm:mb-10"
            aria-label="Endospine İstanbul"
          >
            <Image
              src="/hero/endospinelogo.png"
              alt="Endospine İstanbul"
              width={942}
              height={382}
              sizes="384px"
              className="h-16 w-auto brightness-0 invert sm:h-20 md:h-24 lg:h-28"
            />
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/40">
              © {year} Op. Dr. Eyüp Baykara. Tüm hakları saklıdır.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs text-white/45">
              <Link href="/cerezler" className="transition hover:text-white">
                Çerez politikası
              </Link>
              <CookiePreferencesButton className="text-left transition hover:text-white" />
              <a
                href="https://593emarketing.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition hover:bg-white/95"
                aria-label="Powered by 593 EMarketing"
              >
                <span className="text-[10px] font-medium tracking-[0.12em] text-[#9ca3af] uppercase">
                  Powered by
                </span>
                <Image
                  src="/593-emarketing-logo.png"
                  alt=""
                  width={512}
                  height={512}
                  className="h-5 w-5 rounded-full"
                />
                <span className="text-[12px] font-semibold tracking-tight text-[#1f2937]">
                  593 EMarketing
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
