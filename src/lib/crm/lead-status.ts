export const LEAD_STATUSES = [
  "yeni",
  "arandi",
  "randevulu",
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
  randevulu: "Randevulu",
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
    randevulu: "Randevulu",
    muayene_edildi: "Muayene edildi",
    ameliyat_olacak: "Ameliyat olacak",
    ameliyat_edildi: "Ameliyat edildi",
    bitti: "Bitti",
  },
  en: {
    yeni: "New",
    arandi: "Called",
    randevulu: "Booked",
    muayene_edildi: "Examined",
    ameliyat_olacak: "Surgery planned",
    ameliyat_edildi: "Surgery done",
    bitti: "Done",
  },
  ar: {
    yeni: "جديد",
    arandi: "تم الاتصال",
    randevulu: "موعد",
    muayene_edildi: "تم الفحص",
    ameliyat_olacak: "سيتم إجراء العملية",
    ameliyat_edildi: "تمت العملية",
    bitti: "انتهى",
  },
};

/** yeni=gri, arandi=amber, randevulu=teal, muayene=sky, ameliyat_olacak=orange, ameliyat_edildi=stone, bitti=yeşil */
export const LEAD_STATUS_TONE: Record<LeadPipelineStatus, string> = {
  yeni: "bg-slate-100 text-slate-700",
  arandi: "bg-amber-100 text-amber-900",
  randevulu: "bg-teal-100 text-teal-800",
  muayene_edildi: "bg-sky-100 text-sky-900",
  ameliyat_olacak: "bg-orange-100 text-orange-900",
  ameliyat_edildi: "bg-stone-200 text-stone-800",
  bitti: "bg-emerald-100 text-emerald-900",
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
  { id: "randevulu", label: "Randevulu" },
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
  muayene_randevusu: "randevulu",
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
