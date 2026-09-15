export const LEAD_STATUSES = [
  "yeni",
  "arandi",
  "muayene_edildi",
  "ameliyat_olacak",
  "ameliyat_edildi",
  "bitti",
] as const;

export type LeadPipelineStatus = (typeof LEAD_STATUSES)[number];

/** Varsayılan UI dili (TR). EN/AR etiketleri de mevcut. */
export const LEAD_STATUS_LABEL: Record<LeadPipelineStatus, string> = {
  yeni: "Yeni",
  arandi: "Arandı",
  muayene_edildi: "Muayene edildi",
  ameliyat_olacak: "Ameliyat olacak",
  ameliyat_edildi: "Ameliyat edildi",
  bitti: "Bitti",
};

export const LEAD_STATUS_LABEL_I18N: Record<
  "tr" | "en" | "ar",
  Record<LeadPipelineStatus, string>
> = {
  tr: {
    yeni: "Yeni",
    arandi: "Arandı",
    muayene_edildi: "Muayene edildi",
    ameliyat_olacak: "Ameliyat olacak",
    ameliyat_edildi: "Ameliyat edildi",
    bitti: "Bitti",
  },
  en: {
    yeni: "New",
    arandi: "Called",
    muayene_edildi: "Examined",
    ameliyat_olacak: "Surgery planned",
    ameliyat_edildi: "Surgery done",
    bitti: "Done",
  },
  ar: {
    yeni: "جديد",
    arandi: "تم الاتصال",
    muayene_edildi: "تم الفحص",
    ameliyat_olacak: "سيتم إجراء العملية",
    ameliyat_edildi: "تمت العملية",
    bitti: "انتهى",
  },
};

/**
 * Renkler renk çemberinde kasıtlı olarak birbirinden uzak seçildi; yan yana
 * duran iki aşama asla aynı aileden olmasın diye:
 * yeni=gri, arandi=sarı, muayene=mavi,
 * ameliyat_olacak=kırmızı, ameliyat_edildi=mor, bitti=yeşil.
 */
export const LEAD_STATUS_TONE: Record<LeadPipelineStatus, string> = {
  yeni: "bg-slate-100 text-slate-700",
  arandi: "bg-amber-100 text-amber-900",
  muayene_edildi: "bg-blue-100 text-blue-900",
  ameliyat_olacak: "bg-rose-100 text-rose-900",
  ameliyat_edildi: "bg-purple-100 text-purple-900",
  bitti: "bg-green-100 text-green-900",
};

/**
 * Durum bloğunun gövdesi: rozetle aynı renk ailesi, bir ton açığı. Her aşama
 * panoda tek renkli bir blok olarak okunsun diye (kartlar blok içinde beyaz).
 */
export const LEAD_STATUS_SURFACE: Record<LeadPipelineStatus, string> = {
  yeni: "border-slate-200 bg-slate-50",
  arandi: "border-amber-200 bg-amber-50",
  muayene_edildi: "border-blue-200 bg-blue-50",
  ameliyat_olacak: "border-rose-200 bg-rose-50",
  ameliyat_edildi: "border-purple-200 bg-purple-50",
  bitti: "border-green-200 bg-green-50",
};

export const CLOSED_LEAD_STATUSES: LeadPipelineStatus[] = ["bitti"];

export function isClosedLeadStatus(status: string): boolean {
  return CLOSED_LEAD_STATUSES.includes(status as LeadPipelineStatus);
}

/** Kapalı / sonuçlanmış (bitti). Sebep opsiyonel. */
export function isDoneStatus(status: string): boolean {
  return status === "bitti";
}

export type LeadStatusFilter = "all" | LeadPipelineStatus;

export const LEAD_STATUS_FILTERS: Array<{
  id: LeadStatusFilter;
  label: string;
}> = [
  { id: "all", label: "Tümü" },
  { id: "yeni", label: "Yeni" },
  { id: "arandi", label: "Arandı" },
  { id: "muayene_edildi", label: "Muayene edildi" },
  { id: "ameliyat_olacak", label: "Ameliyat olacak" },
  { id: "ameliyat_edildi", label: "Ameliyat edildi" },
  { id: "bitti", label: "Bitti" },
];

export function statusesForFilter(
  filter: LeadStatusFilter,
): LeadPipelineStatus[] | null {
  if (filter === "all") return null;
  if (LEAD_STATUSES.includes(filter as LeadPipelineStatus)) {
    return [filter as LeadPipelineStatus];
  }
  return null;
}

const LEGACY_STATUS_MAP: Record<string, LeadPipelineStatus> = {
  ulasilamadi: "arandi",
  randevulu: "muayene_edildi",
  muayene_randevusu: "muayene_edildi",
  muayeneye_geldi: "muayene_edildi",
  ameliyat_karari: "ameliyat_olacak",
  ameliyat_oldu: "ameliyat_edildi",
  donustu: "bitti",
  kayip: "bitti",
  iptal: "bitti",
};

export function asLeadStatus(
  value: string | null | undefined,
): LeadPipelineStatus {
  if (value && LEAD_STATUSES.includes(value as LeadPipelineStatus)) {
    return value as LeadPipelineStatus;
  }
  if (value && LEGACY_STATUS_MAP[value]) {
    return LEGACY_STATUS_MAP[value];
  }
  return "yeni";
}

const CLOSED_STAGES = new Set(["won", "lost", "spam"]);

/** Aktif talep: stage ∉ won/lost/spam; birden fazla varsa en yeni. */
export function pickActiveLead<
  T extends { stage: string; created_at: string },
>(leads: T[]): T | null {
  const active = leads
    .filter((lead) => !CLOSED_STAGES.has(lead.stage))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  return active[0] ?? null;
}

/** Liste / filtre: aktif talep; yoksa en yeni (bitti dahil). */
export function pickDisplayLead<
  T extends { stage: string; created_at: string },
>(leads: T[]): T | null {
  const active = pickActiveLead(leads);
  if (active) return active;
  const latest = [...leads].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return latest[0] ?? null;
}
