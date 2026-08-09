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
};

export const TRACKING_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "campaign",
  "channel",
  "site",
  "page",
] as const;

const ATTRIBUTION_STORAGE_KEY = "eyupbaykara_attribution";

export function pickTrackingParams(
  searchParams: URLSearchParams,
): TrackingParams {
  const get = (key: string) => {
    const v = searchParams.get(key);
    return v && v.trim() ? v.trim() : null;
  };

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
  };
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
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}",
      ) as Record<string, string>;
      for (const key of TRACKING_QUERY_KEYS) {
        if (stored[key]) params.set(key, stored[key]);
      }
      if (stored.landing_page) params.set("page", stored.landing_page);
    } catch {
      // Bozuk/engellenmiş localStorage takip akışını durdurmamalı.
    }
    const current = new URLSearchParams(window.location.search);
    for (const key of TRACKING_QUERY_KEYS) {
      const v = current.get(key);
      if (v) params.set(key, v);
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
      if (v != null && String(v).trim()) params.set(k, String(v));
    }
  }

  return `/r?${params.toString()}`;
}

const LANDING_SENT_KEY = "eyupbaykara_landing_sent";

export function captureAttributionFromCurrentUrl(): void {
  if (typeof window === "undefined") return;
  const current = new URLSearchParams(window.location.search);
  const attribution: Record<string, string> = {};
  for (const key of TRACKING_QUERY_KEYS) {
    const value = current.get(key);
    if (value) attribution[key] = value;
  }
  if (!Object.keys(attribution).length) return;
  attribution.landing_page = window.location.pathname;
  attribution.captured_at = new Date().toISOString();
  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution),
    );
  } catch {
    // Takip engellense de site ve WhatsApp bağlantısı çalışmaya devam eder.
  }
  void reportLanding(attribution);
}

async function reportLanding(attribution: Record<string, string>) {
  if (typeof window === "undefined") return;
  const fingerprint = [
    attribution.gclid || "",
    attribution.fbclid || "",
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
