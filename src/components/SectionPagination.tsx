"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const NAV_LINKS = [
  { id: "home", href: "/", label: "Anasayfa" },
  { id: "tedaviler", href: "/#tedavi-arsivi", label: "Tedavilerimiz", dropdown: true },
  { id: "deneyimler", href: "/hasta-deneyimleri", label: "Hasta Deneyimleri" },
  { id: "hakkimizda", href: "/hakkimizda", label: "Hakkımızda" },
  { id: "iletisim", href: "/iletisim", label: "İletişim" },
  { id: "blog", href: "/blog", label: "Blog" },
] as const;

function isActive(pathname: string, id: string, href: string) {
  if (id === "home") return pathname === "/";
  if (id === "tedaviler") return pathname.startsWith("/tedaviler");
  if (id === "deneyimler") return pathname.startsWith("/hasta-deneyimleri");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SectionPagination() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDrop, setDesktopDrop] = useState(false);
  const [mobileDrop, setMobileDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setDesktopDrop(false);
    setMobileDrop(false);
  }, [pathname]);

  useEffect(() => {
    if (!desktopDrop) return;
    const onDoc = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setDesktopDrop(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [desktopDrop]);

  const isHome = pathname === "/";

  return (
    <nav
      className={
        isHome
          ? "pointer-events-none absolute inset-x-0 top-0 z-50"
          : "relative z-50"
      }
      aria-label="Ana navigasyon"
    >
      <div className="h-1.5 w-full bg-[#72a082]" aria-hidden="true" />

      <div className="pointer-events-auto border-b border-black/5 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10">
          <Link href="/" className="shrink-0" aria-label="Anasayfa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/endospinelogo.png"
              alt="Endoskopik Bel Ameliyatı"
              width={942}
              height={382}
              className="h-10 w-auto object-contain sm:h-12"
              decoding="async"
            />
          </Link>

          {/* Desktop */}
          <div className="hidden flex-1 items-center justify-center xl:flex">
            <div className="flex items-center">
              {NAV_LINKS.map((link, i) => {
                const active = isActive(pathname, link.id, link.href);
                const showDivider = i > 0;

                if ("dropdown" in link && link.dropdown) {
                  return (
                    <div key={link.id} className="flex items-center" ref={dropRef}>
                      {showDivider ? (
                        <span className="mx-1 h-4 w-px bg-[#d5ddd8]" aria-hidden />
                      ) : null}
                      <div className="relative">
                        <button
                          type="button"
                          aria-expanded={desktopDrop}
                          aria-haspopup="true"
                          onClick={() => setDesktopDrop((v) => !v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[13px] font-medium transition ${
                            active
                              ? "text-[#72a082]"
                              : "text-[#3d4450] hover:text-[#72a082]"
                          }`}
                        >
                          {link.label}
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className={`transition ${desktopDrop ? "rotate-180" : ""}`}
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {desktopDrop ? (
                          <div className="absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 rounded-2xl border border-black/8 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                            {TREATMENTS.map((t) => (
                              <Link
                                key={t.href}
                                href={t.href}
                                onClick={() => setDesktopDrop(false)}
                                className="block rounded-xl px-3 py-2.5 text-sm text-[#3d4450] transition hover:bg-[#72a082]/10 hover:text-[#72a082]"
                              >
                                {t.label}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={link.id} className="flex items-center">
                    {showDivider ? (
                      <span className="mx-1 h-4 w-px bg-[#d5ddd8]" aria-hidden />
                    ) : null}
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`px-2.5 py-1 text-[13px] font-medium transition ${
                        active
                          ? "text-[#72a082]"
                          : "text-[#3d4450] hover:text-[#72a082]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/iletisim"
              className="hidden items-center justify-center rounded-full border border-[#c9d5ce] px-5 py-2 text-[13px] font-medium text-[#72a082] transition hover:border-[#72a082] hover:bg-[#72a082]/8 sm:inline-flex"
            >
              Randevu Al
            </Link>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#3d4450] transition hover:bg-black/5 xl:hidden"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {mobileOpen ? (
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-black/5 px-4 py-3 xl:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.id, link.href);

                if ("dropdown" in link && link.dropdown) {
                  return (
                    <div key={link.id}>
                      <button
                        type="button"
                        onClick={() => setMobileDrop((v) => !v)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-[#72a082]/12 text-[#72a082]"
                            : "text-[#3d4450] hover:bg-black/[0.03]"
                        }`}
                      >
                        {link.label}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className={`transition ${mobileDrop ? "rotate-180" : ""}`}
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {mobileDrop ? (
                        <div className="ml-2 mt-1 space-y-1 border-l border-[#d5ddd8] pl-3">
                          {TREATMENTS.map((t) => (
                            <Link
                              key={t.href}
                              href={t.href}
                              onClick={() => setMobileOpen(false)}
                              className="block rounded-lg px-3 py-2 text-sm text-[#3d4450]"
                            >
                              {t.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-[#72a082]/12 text-[#72a082]"
                        : "text-[#3d4450] hover:bg-black/[0.03]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/iletisim"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-full border border-[#c9d5ce] px-5 py-2.5 text-sm font-medium text-[#72a082]"
              >
                Randevu Al
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
