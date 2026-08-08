export const PATIENT_NOTE_KIND_LABEL: Record<string, string> = {
  clinical: "Klinik not",
  surgery: "Ameliyat notu",
  followup: "Kontrol notu",
  admin: "İdari not",
};

export const PATIENT_GENDER_LABEL: Record<string, string> = {
  female: "Kadın",
  male: "Erkek",
  other: "Diğer",
  unspecified: "Belirtilmedi",
};

export function formatPatientNo(value?: number | null): string {
  if (!value) return "—";
  return `HST-${String(value).padStart(4, "0")}`;
}

export function patientAge(birthDate?: string | null): string | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) age -= 1;
  return age >= 0 && age < 130 ? String(age) : null;
}
