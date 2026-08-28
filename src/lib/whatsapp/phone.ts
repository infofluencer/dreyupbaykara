/** WhatsApp Cloud API: E.164 without + (e.g. 905xxxxxxxxx). */
export function normalizeWhatsAppPhone(
  value: string | null | undefined,
): string {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }
  return digits;
}
