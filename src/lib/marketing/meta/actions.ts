/** Meta Ads Insights `actions` — klinik için anlamlı sonuç tipleri. */

export const META_PRIMARY_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "lead",
  "leadgen_grouped",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
] as const;

export const META_TRACKED_ACTION_TYPES = [
  ...META_PRIMARY_ACTION_TYPES,
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection",
  "landing_page_view",
] as const;

export const META_ACTION_LABELS: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "WhatsApp sohbet (7 gün)",
  "onsite_conversion.messaging_first_reply": "İlk mesaj yanıtı",
  "onsite_conversion.total_messaging_connection": "Mesaj bağlantısı",
  lead: "Lead",
  leadgen_grouped: "Lead formu",
  "onsite_conversion.lead_grouped": "Lead (grup)",
  "offsite_conversion.fb_pixel_lead": "Pixel lead",
  landing_page_view: "Landing page",
};

const PRIMARY = new Set<string>(META_PRIMARY_ACTION_TYPES);
const TRACKED = new Set<string>(META_TRACKED_ACTION_TYPES);

export function isMetaPrimaryAction(actionType: string | null | undefined): boolean {
  return Boolean(actionType && PRIMARY.has(actionType));
}

export function isMetaTrackedAction(actionType: string | null | undefined): boolean {
  return Boolean(actionType && TRACKED.has(actionType));
}

export function metaActionLabel(actionType: string): string {
  return META_ACTION_LABELS[actionType] ?? actionType;
}

export const META_PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
  threads: "Threads",
};

export const META_PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  messenger: "#00B2FF",
  audience_network: "#8B5CF6",
  threads: "#000000",
};

export const META_DEVICE_LABELS: Record<string, string> = {
  iphone: "iPhone",
  android_smartphone: "Android telefon",
  ipad: "iPad",
  android_tablet: "Android tablet",
  desktop: "Masaüstü",
  unknown: "Bilinmiyor",
};

export function metaPlatformLabel(value: string): string {
  return META_PLATFORM_LABELS[value] ?? value;
}

export function metaDeviceLabel(value: string): string {
  return META_DEVICE_LABELS[value] ?? value.replaceAll("_", " ");
}

