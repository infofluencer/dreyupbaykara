export const COOKIE_CONSENT_NAME = "eyupbaykara_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const COOKIE_CONSENT_UPDATED_EVENT = "eyupbaykara:cookie-consent-updated";
export const COOKIE_PREFERENCES_OPEN_EVENT =
  "eyupbaykara:open-cookie-preferences";

export type CookieConsentPreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export type GoogleConsentState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  functionality_storage: "granted" | "denied";
  personalization_storage: "granted" | "denied";
  security_storage: "granted";
  wait_for_update: 500;
};

const UPDATED_AT_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isCookieConsentPreferences(
  value: unknown,
): value is CookieConsentPreferences {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    c.necessary === true &&
    typeof c.functional === "boolean" &&
    typeof c.analytics === "boolean" &&
    typeof c.marketing === "boolean" &&
    typeof c.updatedAt === "string" &&
    c.updatedAt.length <= 40 &&
    UPDATED_AT_RE.test(c.updatedAt)
  );
}

export function deniedConsent(
  updatedAt = new Date().toISOString(),
): CookieConsentPreferences {
  return {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    updatedAt,
  };
}

export function acceptedConsent(
  updatedAt = new Date().toISOString(),
): CookieConsentPreferences {
  return {
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
    updatedAt,
  };
}

export function serializeCookieConsent(
  consent: CookieConsentPreferences,
): string {
  return encodeURIComponent(JSON.stringify(consent));
}

export function parseCookieConsent(
  raw: string | null | undefined,
): CookieConsentPreferences | null {
  if (!raw) return null;

  const tryParse = (value: string): CookieConsentPreferences | null => {
    try {
      const parsed: unknown = JSON.parse(value);
      return isCookieConsentPreferences(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  try {
    const once = tryParse(decodeURIComponent(raw));
    if (once) return once;
  } catch {
    /* ignore malformed encoding */
  }

  try {
    const twice = tryParse(decodeURIComponent(decodeURIComponent(raw)));
    if (twice) return twice;
  } catch {
    /* ignore malformed encoding */
  }

  return null;
}

export function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((row) => row.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

export function writeBrowserCookie(
  name: string,
  value: string,
  maxAge = COOKIE_CONSENT_MAX_AGE,
): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function toGoogleConsentState(
  consent: CookieConsentPreferences | null,
): GoogleConsentState {
  const analytics = consent?.analytics ? "granted" : "denied";
  const marketing = consent?.marketing ? "granted" : "denied";
  const functional = consent?.functional ? "granted" : "denied";

  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    functionality_storage: functional,
    personalization_storage: functional,
    security_storage: "granted",
    wait_for_update: 500,
  };
}

export function updateGoogleConsentMode(
  consent: CookieConsentPreferences,
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("consent", "update", toGoogleConsentState(consent));
}
