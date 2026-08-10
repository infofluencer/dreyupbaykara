"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_UPDATED_EVENT,
  parseCookieConsent,
  readBrowserCookie,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

export function useCookieConsent(
  initialConsent: CookieConsentPreferences | null,
) {
  const [consent, setConsent] = useState(initialConsent);

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent<CookieConsentPreferences | null>)
        ?.detail;
      const next =
        detail ?? parseCookieConsent(readBrowserCookie(COOKIE_CONSENT_NAME));
      setConsent(next);
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
  }, []);

  return consent;
}
