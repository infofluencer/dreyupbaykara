export type AdPlatform = "google_ads" | "meta" | "other" | "organic";
export type SourceEvent = "landing" | "whatsapp" | "form";

const GOOGLE_SOURCES = new Set([
  "google",
  "googleads",
  "adwords",
  "google_ads",
  "youtube",
]);

const META_SOURCES = new Set([
  "facebook",
  "fb",
  "ig",
  "instagram",
  "meta",
  "fbads",
  "an",
]);

export type SourceRow = {
  channel?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  campaign?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  ttclid?: string | null;
};

function hasGoogleClickId(row: SourceRow): boolean {
  return Boolean(
    row.gclid?.trim() || row.gbraid?.trim() || row.wbraid?.trim(),
  );
}

export function classifyAdPlatform(row: SourceRow): AdPlatform {
  if (hasGoogleClickId(row)) return "google_ads";
  if (row.fbclid?.trim()) return "meta";

  const source = (row.utm_source || "").trim().toLowerCase();
  if (GOOGLE_SOURCES.has(source)) return "google_ads";
  if (META_SOURCES.has(source)) return "meta";
  if (
    source ||
    row.utm_medium?.trim() ||
    row.utm_campaign?.trim() ||
    row.campaign?.trim() ||
    row.msclkid?.trim() ||
    row.ttclid?.trim()
  ) {
    return "other";
  }
  return "organic";
}

export function classifySourceEvent(channel?: string | null): SourceEvent {
  if (channel === "landing" || channel === "page") return "landing";
  if (channel === "lead_form") return "form";
  return "whatsapp";
}

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  google_ads: "Google Ads",
  meta: "Meta",
  other: "Diğer UTM",
  organic: "Organik",
};

export const EVENT_LABEL: Record<SourceEvent, string> = {
  landing: "Sayfa inişi",
  whatsapp: "WhatsApp",
  form: "Form",
};

export const PLATFORM_COLOR: Record<AdPlatform, string> = {
  google_ads: "#1a56db",
  meta: "#7c3aed",
  other: "#c2410c",
  organic: "#0b6b45",
};

export const EVENT_COLOR: Record<SourceEvent, string> = {
  landing: "#0b6b45",
  whatsapp: "#16a34a",
  form: "#0369a1",
};
