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
  ctwa_clid?: string | null;
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

/** Platform + UI’da gösterilecek kısa sinyal (neden bu kaynak?). */
export type PlatformEvidence = {
  platform: AdPlatform;
  /** Örn. "fbclid", "ctwa_clid", "utm_source=facebook", "sinyal yok" */
  signal: string;
};

export function classifyAdPlatform(row: SourceRow): AdPlatform {
  return classifyAdPlatformWithEvidence(row).platform;
}

export function classifyAdPlatformWithEvidence(row: SourceRow): PlatformEvidence {
  if (hasGoogleClickId(row)) {
    const id = row.gclid?.trim()
      ? "gclid"
      : row.gbraid?.trim()
        ? "gbraid"
        : "wbraid";
    return { platform: "google_ads", signal: id };
  }
  if (row.ctwa_clid?.trim()) {
    return { platform: "meta", signal: "ctwa_clid" };
  }
  if (row.fbclid?.trim()) {
    return { platform: "meta", signal: "fbclid" };
  }
  if ((row.channel || "").trim().toLowerCase() === "meta_ctwa") {
    return { platform: "meta", signal: "channel=meta_ctwa" };
  }

  const source = (row.utm_source || "").trim().toLowerCase();
  const medium = (row.utm_medium || "").trim().toLowerCase();
  if (GOOGLE_SOURCES.has(source)) {
    return { platform: "google_ads", signal: `utm_source=${source}` };
  }
  if (META_SOURCES.has(source)) {
    return { platform: "meta", signal: `utm_source=${source}` };
  }
  if (META_SOURCES.has(medium)) {
    return { platform: "meta", signal: `utm_medium=${medium}` };
  }
  if (
    source ||
    row.utm_medium?.trim() ||
    row.utm_campaign?.trim() ||
    row.campaign?.trim() ||
    row.msclkid?.trim() ||
    row.ttclid?.trim()
  ) {
    const signal = row.msclkid?.trim()
      ? "msclkid"
      : row.ttclid?.trim()
        ? "ttclid"
        : source
          ? `utm_source=${source}`
          : row.utm_medium?.trim()
            ? `utm_medium=${medium}`
            : row.utm_campaign?.trim()
              ? "utm_campaign"
              : "campaign";
    return { platform: "other", signal };
  }
  return { platform: "organic", signal: "sinyal yok" };
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
