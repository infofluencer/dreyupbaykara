"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
  acceptedConsent,
  deniedConsent,
  serializeCookieConsent,
  updateGoogleConsentMode,
  writeBrowserCookie,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

type CategoryKey = "functional" | "analytics" | "marketing";

const CATEGORIES: {
  key: CategoryKey | "necessary";
  title: string;
  description: string;
  locked?: boolean;
}[] = [
  {
    key: "necessary",
    title: "Zorunlu",
    description:
      "Sitenin çalışması, güvenlik ve çerez tercihlerinizin hatırlanması için gereklidir. Kapatılamaz.",
    locked: true,
  },
  {
    key: "functional",
    title: "Fonksiyonel",
    description:
      "Tercihlerinizi ve site deneyimini hatırlayan isteğe bağlı özellikler.",
  },
  {
    key: "analytics",
    title: "Analitik",
    description:
      "Sayfa kullanımını anlamamıza yardımcı olur (ör. Google Analytics, Microsoft Clarity).",
  },
  {
    key: "marketing",
    title: "Pazarlama",
    description:
      "Reklam ölçümü ve yeniden pazarlama pikselleri (ör. Meta, TikTok, Google Ads).",
  },
];

export function CookieConsentBanner({
  initialConsent,
}: {
  initialConsent: CookieConsentPreferences | null;
}) {
  const pathname = usePathname();
  const titleId = useId();
  const [consent, setConsent] = useState(initialConsent);
  const [visible, setVisible] = useState(!initialConsent);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CookieConsentPreferences>(
    initialConsent ?? deniedConsent(),
  );

  useEffect(() => {
    const open = () => {
      setDraft(consent ?? deniedConsent());
      setExpanded(true);
      setVisible(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, open);
  }, [consent]);

  if (pathname.startsWith("/admin") || !visible) return null;

  async function saveConsent(next: CookieConsentPreferences) {
    if (saving) return;
    setSaving(true);
    const prev = consent;

    try {
      const res = await fetch("/api/cookie-consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("consent api failed");
    } catch {
      writeBrowserCookie(COOKIE_CONSENT_NAME, serializeCookieConsent(next));
    }

    updateGoogleConsentMode(next);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, { detail: next }),
    );
    setConsent(next);
    setDraft(next);
    setExpanded(false);
    setVisible(false);
    setSaving(false);

    if (
      (prev?.analytics && !next.analytics) ||
      (prev?.marketing && !next.marketing)
    ) {
      window.setTimeout(() => window.location.reload(), 50);
    }
  }

  function toggleCategory(key: CategoryKey) {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {expanded ? (
        <button
          type="button"
          className="pointer-events-auto absolute inset-0 bg-[#123524]/20"
          aria-label="Çerez panelini kapat"
          onClick={() => {
            if (consent) {
              setVisible(false);
              setExpanded(false);
            } else {
              setExpanded(false);
            }
          }}
        />
      ) : null}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/15 bg-[#fdfaf5] shadow-[0_20px_60px_rgba(18,53,36,0.18)] sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:w-[24rem]"
      >
        <div className="px-5 py-5 sm:px-5 sm:py-5">
          <p
            id={titleId}
            className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold tracking-tight text-[#123524]"
          >
            Çerez tercihleri
          </p>
          <p className="mt-2 text-sm leading-6 text-[#466254]">
            Sitemizde deneyiminizi iyileştirmek ve yasal yükümlülüklerimizi
            yerine getirmek için çerez kullanıyoruz. Zorunlu çerezler her zaman
            aktiftir. Analitik ve pazarlama çerezleri yalnızca onayınızla
            çalışır. Ayrıntılar için{" "}
            <Link
              href="/cerezler"
              className="font-semibold text-[#0b6b45] underline-offset-2 hover:underline"
            >
              çerez politikası
            </Link>
            .
          </p>

          {expanded ? (
            <ul className="mt-5 space-y-3">
              {CATEGORIES.map((category) => {
                const enabled =
                  category.key === "necessary" ? true : draft[category.key];
                return (
                  <li
                    key={category.key}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[#0b6b45]/10 bg-white px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#123524]">
                        {category.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#466254]/90">
                        {category.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${category.title} çerezleri`}
                      disabled={category.locked || saving}
                      onClick={() => {
                        if (category.key === "necessary") return;
                        toggleCategory(category.key);
                      }}
                      className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
                        enabled ? "bg-[#0b6b45]" : "bg-[#d7e3db]"
                      } ${category.locked ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-5 flex flex-col gap-2">
            {expanded ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveConsent({
                      ...draft,
                      necessary: true,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#085436] disabled:opacity-60"
                >
                  Seçimi kaydet
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDraft(deniedConsent())}
                  className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/20 px-5 py-2.5 text-sm font-semibold text-[#123524] transition hover:border-[#0b6b45]/40 disabled:opacity-60"
                >
                  Tercihleri sıfırla
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDraft(consent ?? deniedConsent());
                    setExpanded(true);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/20 px-5 py-2.5 text-sm font-semibold text-[#123524] transition hover:border-[#0b6b45]/40 disabled:opacity-60"
                >
                  Tercihleri yönet
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveConsent(deniedConsent())}
                  className="inline-flex items-center justify-center rounded-full border border-[#0b6b45]/20 px-5 py-2.5 text-sm font-semibold text-[#123524] transition hover:border-[#0b6b45]/40 disabled:opacity-60"
                >
                  Tümünü reddet
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveConsent(acceptedConsent())}
                  className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#085436] disabled:opacity-60"
                >
                  Tümünü kabul et
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
