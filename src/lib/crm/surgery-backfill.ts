/**
 * Durum Panosu'nda elle "Ameliyat edildi"ye taşınan hastalar için ameliyat
 * randevusunun geriye dönük oluşturulması.
 *
 * Ameliyat sonrası otomatik mesajlar randevuya bağlıdır: `message_dispatches`
 * satırı `appointment_id` olmadan yazılamaz ve mükerrer engeli bu kolona
 * dayanır. Takvimde ameliyat kaydı olmayan hasta bu yüzden mesaj alamıyordu.
 * Burada kayıt tamamlanır, mesaj yolu ise değişmeden kalır.
 */

/** Takvimdeki çakışma engeli: ends_at yoksa starts_at + 30 dk sayılır. */
export const IMPLIED_APPOINTMENT_MS = 30 * 60 * 1000;

export type OccupiedRange = { startMs: number; endMs: number };

/**
 * Gün içinde boş bir 30 dakikalık slot bulur.
 *
 * Tercih edilen saatten (taşınma anı) geriye doğru yarım saatlik adımlarla
 * arar, gün başına ulaşırsa ileri doğru dener. `appointments_no_overlap`
 * exclusion constraint'i yüzünden dolu bir aralığa yazmak hata verir.
 */
export function findFreeAppointmentSlot(input: {
  occupied: OccupiedRange[];
  preferredMs: number;
  dayStartMs: number;
  dayEndMs: number;
  durationMs?: number;
}): number | null {
  const duration = input.durationMs ?? IMPLIED_APPOINTMENT_MS;
  const step = IMPLIED_APPOINTMENT_MS;

  // Yarım saatlik ızgaraya hizala — takvimdeki diğer kayıtlarla aynı düzen
  const aligned = Math.floor(input.preferredMs / step) * step;

  const isFree = (startMs: number) => {
    const endMs = startMs + duration;
    if (startMs < input.dayStartMs || endMs > input.dayEndMs) return false;
    return !input.occupied.some(
      (range) => startMs < range.endMs && endMs > range.startMs,
    );
  };

  for (let t = aligned; t >= input.dayStartMs; t -= step) {
    if (isFree(t)) return t;
  }
  for (let t = aligned + step; t + duration <= input.dayEndMs; t += step) {
    if (isFree(t)) return t;
  }
  return null;
}

/** Çakışma engeli için dolu aralık — ends_at boşsa 30 dk varsayılır. */
export function toOccupiedRange(row: {
  starts_at: string;
  ends_at?: string | null;
}): OccupiedRange {
  const startMs = new Date(row.starts_at).getTime();
  const endMs = row.ends_at
    ? new Date(row.ends_at).getTime()
    : startMs + IMPLIED_APPOINTMENT_MS;
  return { startMs, endMs };
}
