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

/** Country code / leading 0 stripped — 0555…, 555… and 90555… compare equal. */
export function nationalPhoneDigits(value: string | null | undefined): string {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** True when the typed query is a phone fragment of the stored number. */
export function phoneQueryMatches(
  stored: string | null | undefined,
  query: string,
): boolean {
  const queryDigits = query.replace(/\D/g, "");
  if (queryDigits.length < 3) return false;
  const storedDigits = (stored ?? "").replace(/\D/g, "");
  if (!storedDigits) return false;
  if (storedDigits.includes(queryDigits)) return true;
  const queryNational = nationalPhoneDigits(query);
  const storedNational = nationalPhoneDigits(stored);
  if (queryNational.length < 3 || !storedNational) return false;
  return storedNational.includes(queryNational);
}

export function matchesNameOrPhone(
  name: string | null | undefined,
  phone: string | null | undefined,
  query: string,
  extra: Array<string | number | null | undefined> = [],
): boolean {
  const q = query.trim();
  if (!q) return true;
  const hay = [name, phone, ...extra]
    .filter((part) => part != null && String(part).length > 0)
    .join(" ")
    .toLocaleLowerCase("tr");
  if (hay.includes(q.toLocaleLowerCase("tr"))) return true;
  if (phoneQueryMatches(phone, q)) return true;
  const digits = q.replace(/\D/g, "");
  if (!digits) return false;
  return extra.some((part) => String(part ?? "").replace(/\D/g, "") === digits);
}
