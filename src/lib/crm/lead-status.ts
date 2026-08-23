export const LEAD_STATUSES = [
  "yeni",
  "arandi",
  "randevulu",
  "bitti",
] as const;

export type LeadPipelineStatus = (typeof LEAD_STATUSES)[number];

/** Varsayılan UI dili (TR). EN/AR etiketleri de mevcut. */
export const LEAD_STATUS_LABEL: Record<LeadPipelineStatus, string> = {
  yeni: "Yeni",
  arandi: "Arandı",
  randevulu: "Randevulu",
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
    bitti: "Bitti",
  },
  en: {
    yeni: "New",
    arandi: "Called",
    randevulu: "Booked",
    bitti: "Done",
  },
  ar: {
    yeni: "جديد",
    arandi: "تم الاتصال",
    randevulu: "موعد",
    bitti: "انتهى",
  },
};

/** yeni=gri, arandi=amber, randevulu=teal, bitti=yeşil */
export const LEAD_STATUS_TONE: Record<LeadPipelineStatus, string> = {
  yeni: "bg-slate-100 text-slate-700",
  arandi: "bg-amber-100 text-amber-900",
  randevulu: "bg-teal-100 text-teal-800",
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
  muayeneye_geldi: "bitti",
  ameliyat_karari: "bitti",
  ameliyat_oldu: "bitti",
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
