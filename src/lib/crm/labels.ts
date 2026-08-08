export const STAGE_LABEL: Record<string, string> = {
  new: "Yeni",
  contacted: "İletişime geçildi",
  qualified: "Nitelikli",
  appointment: "Randevu",
  won: "Sonuçlandı",
  lost: "Kayıp",
  spam: "Spam",
};

export const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  consultation: "İlk muayene",
  control: "Kontrol",
  procedure: "Ameliyat",
  online: "Online görüşme",
  other: "Diğer",
};

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Planlandı",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
