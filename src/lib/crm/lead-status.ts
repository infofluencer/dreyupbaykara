export const LEAD_STATUSES = [
  "yeni",
  "arandi",
  "ulasilamadi",
  "muayene_randevusu",
  "muayeneye_geldi",
  "ameliyat_karari",
  "ameliyat_oldu",
  "donustu",
  "kayip",
  "iptal",
] as const;

export type LeadPipelineStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadPipelineStatus, string> = {
  yeni: "Yeni",
  arandi: "Arandı",
  ulasilamadi: "Ulaşılamadı",
  muayene_randevusu: "Muayene randevusu",
  muayeneye_geldi: "Muayeneye geldi",
  ameliyat_karari: "Ameliyat kararı",
  ameliyat_oldu: "Ameliyat oldu",
  donustu: "Dönüştü",
  kayip: "Kayıp",
  iptal: "İptal",
};

export const LEAD_STATUS_TONE: Record<LeadPipelineStatus, string> = {
  yeni: "bg-[#e7f5ed] text-[#0b6b45]",
  arandi: "bg-sky-100 text-sky-800",
  ulasilamadi: "bg-amber-100 text-amber-900",
  muayene_randevusu: "bg-blue-100 text-blue-800",
  muayeneye_geldi: "bg-teal-100 text-teal-800",
  ameliyat_karari: "bg-indigo-100 text-indigo-800",
  ameliyat_oldu: "bg-emerald-100 text-emerald-900",
  donustu: "bg-[#d9fdd3] text-[#166534]",
  kayip: "bg-red-100 text-red-800",
  iptal: "bg-slate-100 text-slate-700",
};

export const CLOSED_LEAD_STATUSES: LeadPipelineStatus[] = [
  "donustu",
  "kayip",
  "iptal",
];

export function isClosedLeadStatus(status: string): boolean {
  return CLOSED_LEAD_STATUSES.includes(status as LeadPipelineStatus);
}

export function isLostLikeStatus(status: string): boolean {
  return status === "kayip" || status === "iptal";
}

export type LeadStatusFilter =
  | "all"
  | "yeni"
  | "aranacak"
  | "randevulu"
  | "geldi"
  | "donustu"
  | "kayip";

export const LEAD_STATUS_FILTERS: Array<{
  id: LeadStatusFilter;
  label: string;
}> = [
  { id: "all", label: "Tümü" },
  { id: "yeni", label: "Yeni" },
  { id: "aranacak", label: "Aranacak" },
  { id: "randevulu", label: "Randevulu" },
  { id: "geldi", label: "Geldi" },
  { id: "donustu", label: "Dönüştü" },
  { id: "kayip", label: "Kayıp" },
];

export function statusesForFilter(
  filter: LeadStatusFilter,
): LeadPipelineStatus[] | null {
  switch (filter) {
    case "yeni":
      return ["yeni"];
    case "aranacak":
      return ["arandi", "ulasilamadi"];
    case "randevulu":
      return ["muayene_randevusu"];
    case "geldi":
      return ["muayeneye_geldi", "ameliyat_karari", "ameliyat_oldu"];
    case "donustu":
      return ["donustu"];
    case "kayip":
      return ["kayip", "iptal"];
    default:
      return null;
  }
}

export function asLeadStatus(value: string | null | undefined): LeadPipelineStatus {
  if (value && LEAD_STATUSES.includes(value as LeadPipelineStatus)) {
    return value as LeadPipelineStatus;
  }
  return "yeni";
}
