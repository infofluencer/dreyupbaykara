export const WHATSAPP_E164 = "905307837224";
export const DEFAULT_SITE = "endoskopikbelameliyati";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short human-readable tracking ref (e.g. K7M2XQ). */
export function generateLeadRef(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_ALPHABET[bytes[i]! % REF_ALPHABET.length];
  }
  return out;
}

export type TrackingParams = {
  site?: string | null;
  page?: string | null;
  channel?: string | null;
  campaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
};

export const TRACKING_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ttclid",
  "campaign",
  "channel",
  "site",
  "page",
] as const;

/** First-touch: once set, these should not be overwritten by later page views. */
const FIRST_TOUCH_KEYS = new Set<string>([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ttclid",
  "campaign",
]);

const ATTRIBUTION_STORAGE_KEY = "eyupbaykara_attribution";

function trimParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function pickTrackingParams(
  searchParams: URLSearchParams,
): TrackingParams {
  const get = (key: string) => trimParam(searchParams.get(key));

  return {
    site: get("site"),
    page: get("page"),
    channel: get("channel"),
    campaign: get("campaign"),
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
    gclid: get("gclid"),
    fbclid: get("fbclid"),
    gbraid: get("gbraid"),
    wbraid: get("wbraid"),
    msclkid: get("msclkid"),
    ttclid: get("ttclid"),
  };
}

/** URL (referer / landing_url) içinden takip parametrelerini okur. */
export function pickTrackingParamsFromUrl(
  url: string | null | undefined,
): TrackingParams {
  if (!url?.trim()) return {};
  try {
    return pickTrackingParams(new URL(url).searchParams);
  } catch {
    return {};
  }
}

/** Mevcut alanları koruyarak URL'den eksik parametreleri doldurur. */
export function mergeTrackingParams(
  primary: TrackingParams,
  fallback: TrackingParams,
): TrackingParams {
  const merged: TrackingParams = { ...primary };
  for (const key of TRACKING_QUERY_KEYS) {
    const current = trimParam(merged[key as keyof TrackingParams] as string | null);
    if (current) continue;
    const fb = trimParam(fallback[key as keyof TrackingParams] as string | null);
    if (fb) merged[key as keyof TrackingParams] = fb;
  }
  return merged;
}

export function hasPaidTrackingParams(params: TrackingParams): boolean {
  return Boolean(
    params.gclid ||
      params.fbclid ||
      params.gbraid ||
      params.wbraid ||
      params.msclkid ||
      params.ttclid ||
      params.utm_source ||
      params.utm_medium ||
      params.utm_campaign ||
      params.campaign,
  );
}

function readStoredAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeAttribution(
  existing: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    const trimmed = trimParam(value);
    if (!trimmed) continue;

    if (FIRST_TOUCH_KEYS.has(key)) {
      if (!merged[key]) merged[key] = trimmed;
    } else {
      merged[key] = trimmed;
    }
  }

  if (incoming.landing_page && !merged.landing_page) {
    merged.landing_page = incoming.landing_page;
  }

  if (!merged.captured_at && incoming.captured_at) {
    merged.captured_at = incoming.captured_at;
  }

  return merged;
}

function applyTrackingParams(
  params: URLSearchParams,
  stored: Record<string, string>,
  current: URLSearchParams,
) {
  for (const key of TRACKING_QUERY_KEYS) {
    const storedValue = trimParam(stored[key]);
    if (storedValue) params.set(key, storedValue);
  }

  for (const key of TRACKING_QUERY_KEYS) {
    if (params.has(key)) continue;
    const currentValue = trimParam(current.get(key));
    if (currentValue) params.set(key, currentValue);
  }
}

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}

export function buildDefaultWhatsAppMessage(leadRef: string): string {
  return [
    "Merhaba Op. Dr. Eyüp Baykara,",
    "",
    "Web sitesinden yazıyorum. Bilgi almak istiyorum.",
    "",
    `Ref: ${leadRef}`,
  ].join("\n");
}

export function buildFormWhatsAppMessage(
  leadRef: string,
  data: {
    name?: string | null;
    surgeryRecommended?: string | null;
    lastMri?: string | null;
    seenSpecialist?: string | null;
    age?: string | null;
  },
): string {
  return [
    "Merhaba Op. Dr. Eyüp Baykara,",
    "",
    "Kalçadan bacağa vuran ağrı / full endoskopik tedavi için bilgi formu:",
    `• İsim: ${data.name?.trim() || "—"}`,
    `• Daha önce ameliyat önerildi mi?: ${data.surgeryRecommended?.trim() || "—"}`,
    `• Son MR: ${data.lastMri?.trim() || "—"}`,
    `• Beyin ve sinir cerrahisi uzmanına muayene: ${data.seenSpecialist?.trim() || "—"}`,
    `• Yaş: ${data.age?.trim() || "—"}`,
    "",
    "Beni aramanızı rica ederim.",
    "",
    `Ref: ${leadRef}`,
  ].join("\n");
}

/** Client helper: /r?... with current page UTMs preserved. */
export function buildTrackingPath(options?: {
  site?: string;
  page?: string;
  channel?: string;
  campaign?: string;
  extra?: Record<string, string | undefined | null>;
}): string {
  const params = new URLSearchParams();

  if (typeof window !== "undefined") {
    const stored = readStoredAttribution();
    const current = new URLSearchParams(window.location.search);
    applyTrackingParams(params, stored, current);

    if (stored.landing_page && !params.has("page")) {
      params.set("page", stored.landing_page);
    }
    if (!params.has("page")) {
      params.set("page", window.location.pathname);
    }
  }

  params.set("site", options?.site ?? DEFAULT_SITE);
  if (options?.page) params.set("page", options.page);
  if (options?.channel) params.set("channel", options.channel);
  if (options?.campaign) params.set("campaign", options.campaign);

  if (options?.extra) {
    for (const [k, v] of Object.entries(options.extra)) {
      const trimmed = trimParam(v == null ? null : String(v));
      if (trimmed) params.set(k, trimmed);
    }
  }

  return `/r?${params.toString()}`;
}

const LANDING_SENT_KEY = "eyupbaykara_landing_sent";

export function captureAttributionFromCurrentUrl(): void {
  if (typeof window === "undefined") return;

  const current = pickTrackingParams(
    new URLSearchParams(window.location.search),
  );
  const incoming: Record<string, string> = {};
  for (const key of TRACKING_QUERY_KEYS) {
    const value = current[key as keyof TrackingParams];
    if (value) incoming[key] = value;
  }

  const existing = readStoredAttribution();
  const hasIncoming = Object.keys(incoming).length > 0;

  if (hasIncoming) {
    incoming.landing_page = existing.landing_page || window.location.pathname;
    incoming.captured_at = existing.captured_at || new Date().toISOString();
  }

  const merged = hasIncoming
    ? mergeAttribution(existing, incoming)
    : existing;

  if (!hasIncoming && !Object.keys(merged).length) return;

  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(merged),
    );
  } catch {
    // Takip engellense de site ve WhatsApp bağlantısı çalışmaya devam eder.
  }

  if (hasIncoming || hasPaidTrackingParams(current)) {
    void reportLanding(merged);
  }
}

async function reportLanding(attribution: Record<string, string>) {
  if (typeof window === "undefined") return;
  const fingerprint = [
    attribution.gclid || "",
    attribution.gbraid || "",
    attribution.wbraid || "",
    attribution.fbclid || "",
    attribution.msclkid || "",
    attribution.ttclid || "",
    attribution.utm_source || "",
    attribution.utm_campaign || "",
    attribution.landing_page || "",
  ].join("|");

  try {
    if (sessionStorage.getItem(LANDING_SENT_KEY) === fingerprint) return;
    sessionStorage.setItem(LANDING_SENT_KEY, fingerprint);
  } catch {
    // sessionStorage kapalıysa yine de bir kez denenecek.
  }

  try {
    const res = await fetch("/api/track/landing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site: attribution.site || DEFAULT_SITE,
        page: attribution.landing_page,
        campaign: attribution.campaign,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        gclid: attribution.gclid,
        fbclid: attribution.fbclid,
        gbraid: attribution.gbraid,
        wbraid: attribution.wbraid,
        msclkid: attribution.msclkid,
        ttclid: attribution.ttclid,
        landing_url: window.location.href,
      }),
      keepalive: true,
    });
    if (!res.ok) {
      try {
        sessionStorage.removeItem(LANDING_SENT_KEY);
      } catch {
        /* ignore */
      }
    }
  } catch {
    try {
      sessionStorage.removeItem(LANDING_SENT_KEY);
    } catch {
      /* ignore */
    }
  }
}
