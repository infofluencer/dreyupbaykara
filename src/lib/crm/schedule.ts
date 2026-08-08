export function appointmentEndIso(
  startsAt: string,
  endsAt?: string | null,
): string {
  if (endsAt) return new Date(endsAt).toISOString();
  return new Date(new Date(startsAt).getTime() + 30 * 60 * 1000).toISOString();
}

export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return (
    new Date(startA).getTime() < new Date(endB).getTime() &&
    new Date(startB).getTime() < new Date(endA).getTime()
  );
}

export function findOverlappingAppointments<
  T extends {
    id: string;
    starts_at: string;
    ends_at?: string | null;
    status?: string;
  },
>(
  appointments: T[],
  startsAt: string,
  endsAt: string,
  ignoreId?: string,
): T[] {
  return appointments.filter((item) => {
    if (item.id === ignoreId) return false;
    if (item.status === "cancelled") return false;
    return intervalsOverlap(
      startsAt,
      endsAt,
      item.starts_at,
      appointmentEndIso(item.starts_at, item.ends_at),
    );
  });
}

export function coversHour(
  startsAt: string,
  endsAt: string | null | undefined,
  ymd: string,
  hour: number,
): boolean {
  return coversSlot(startsAt, endsAt, ymd, hour, 0, 60);
}

export function coversSlot(
  startsAt: string,
  endsAt: string | null | undefined,
  ymd: string,
  hour: number,
  minute: number,
  slotMinutes = 30,
): boolean {
  const slotStart = new Date(
    `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`,
  ).getTime();
  const slotEnd = slotStart + slotMinutes * 60 * 1000;
  const start = new Date(startsAt).getTime();
  const end = new Date(appointmentEndIso(startsAt, endsAt)).getTime();
  return start < slotEnd && end > slotStart;
}
