"use client";

import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/cookie-consent";

export function CookiePreferencesButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_OPEN_EVENT));
      }}
    >
      Çerez tercihlerini güncelle
    </button>
  );
}
