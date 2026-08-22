import Link from "next/link";
import { planHref } from "@/components/admin/schedule/href";
import {
  AgendaCardList,
  AppointmentActions,
  ScheduleAddBanner,
  StatusLegend,
  resolveAppointmentVisual,
} from "@/components/admin/schedule/schedule-visuals";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import {
  appointmentEndIso,
  CLINIC_END_HOUR,
  CLINIC_START_HOUR,
} from "@/lib/crm/schedule";
import { getIstanbulNow } from "@/lib/date/now";
import { istanbulHourMinute, istanbulYmd } from "@/lib/date/tr";

/** Pixel height for one 30-minute unit (desktop timeline). */
const UNIT_PX = 52;
const HOURS = Array.from(
  { length: CLINIC_END_HOUR - CLINIC_START_HOUR + 1 },
  (_, index) => CLINIC_START_HOUR + index,
);
const TRACK_MINUTES = (CLINIC_END_HOUR - CLINIC_START_HOUR) * 60;
const TRACK_HEIGHT = (TRACK_MINUTES / 30) * UNIT_PX;

type LaidOut = {
  appointment: ScheduleAppointment;
  startMin: number;
  endMin: number;
  column: number;
  columnCount: number;
};

function minutesFromClinicStart(iso: string): number {
  const { hour, minute } = istanbulHourMinute(iso);
  return (hour - CLINIC_START_HOUR) * 60 + minute;
}

function layoutDay(appointments: ScheduleAppointment[]): LaidOut[] {
  const prepared = appointments
    .map((appointment) => {
      const startMin = Math.max(0, minutesFromClinicStart(appointment.starts_at));
      const endIso = appointmentEndIso(appointment.starts_at, appointment.ends_at);
      const endMin = Math.min(
        TRACK_MINUTES,
        Math.max(startMin + 15, minutesFromClinicStart(endIso)),
      );
      return { appointment, startMin, endMin };
    })
    .filter((item) => item.startMin < TRACK_MINUTES && item.endMin > 0)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const columnEnds: number[] = [];
  const withColumns = prepared.map((item) => {
    let column = columnEnds.findIndex((end) => end <= item.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[column] = item.endMin;
    }
    return { ...item, column };
  });

  const columnCount = Math.max(1, columnEnds.length);
  return withColumns.map((item) => ({ ...item, columnCount }));
}

function DayTimeline({
  date,
  appointments,
  laidOut,
  nowTop,
  selectedLeadId,
  stage,
  search,
}: {
  date: string;
  appointments: ScheduleAppointment[];
  laidOut: LaidOut[];
  nowTop: number | null;
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  /** Shared Y: minutes from 08:00 → px. Labels, lines, slots, blocks all use this. */
  const y = (minutesFromStart: number) => (minutesFromStart / 30) * UNIT_PX;
  /** Room so 08:00 / 20:00 labels centered on the line aren't clipped. */
  const EDGE = 10;

  return (
    <div className="hidden space-y-4 sm:block">
      <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
        <div className="flex border-b border-[#123524]/08 bg-[#f7f9f8] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7d73]">
          <span className="w-14 shrink-0 sm:w-16">Saat</span>
          <span className="min-w-0 flex-1">Randevu akışı · 08:00–20:00</span>
        </div>

        <div
          className="relative flex"
          style={{ height: TRACK_HEIGHT + EDGE * 2 }}
        >
          {/* Hour labels — same y() as grid lines, vertically centered on the line */}
          <div
            className="relative w-14 shrink-0 border-r border-[#123524]/08 bg-[#fafbfb] sm:w-16"
            aria-hidden
          >
            {HOURS.map((hour) => {
              const top = EDGE + y((hour - CLINIC_START_HOUR) * 60);
              return (
                <div
                  key={hour}
                  className="absolute right-2 flex h-0 items-center justify-end"
                  style={{ top }}
                >
                  <span className="font-mono text-[11px] font-semibold leading-none tabular-nums text-[#466254] sm:text-xs">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track — identical coordinate origin as labels (EDGE + y) */}
          <div className="relative min-w-0 flex-1">
            {HOURS.map((hour) => {
              const top = EDGE + y((hour - CLINIC_START_HOUR) * 60);
              return (
                <div
                  key={`line-${hour}`}
                  className="absolute inset-x-0 border-t border-[#123524]/10"
                  style={{ top }}
                />
              );
            })}
            {HOURS.slice(0, -1).map((hour) => {
              const top = EDGE + y((hour - CLINIC_START_HOUR) * 60 + 30);
              return (
                <div
                  key={`half-${hour}`}
                  className="absolute inset-x-0 border-t border-dashed border-[#123524]/06"
                  style={{ top }}
                />
              );
            })}

            {HOURS.slice(0, -1).map((hour) => {
              const hourTop = EDGE + y((hour - CLINIC_START_HOUR) * 60);
              const slot = `${String(hour).padStart(2, "0")}:00`;
              const halfSlot = `${String(hour).padStart(2, "0")}:30`;
              return (
                <div key={`hits-${hour}`}>
                  <Link
                    href={planHref({
                      view: "day",
                      date,
                      lead: selectedLeadId,
                      stage,
                      q: search,
                      slot,
                    })}
                    className="absolute inset-x-0 z-0 transition-colors hover:bg-[#e7f5ed]/70"
                    style={{ top: hourTop, height: UNIT_PX }}
                    aria-label={`${slot} için randevu ekle`}
                    title={`${slot} — randevu ekle`}
                  />
                  <Link
                    href={planHref({
                      view: "day",
                      date,
                      lead: selectedLeadId,
                      stage,
                      q: search,
                      slot: halfSlot,
                    })}
                    className="absolute inset-x-0 z-0 transition-colors hover:bg-[#e7f5ed]/70"
                    style={{ top: hourTop + UNIT_PX, height: UNIT_PX }}
                    aria-label={`${halfSlot} için randevu ekle`}
                    title={`${halfSlot} — randevu ekle`}
                  />
                </div>
              );
            })}

            {laidOut.map(
              ({ appointment, startMin, endMin, column, columnCount }) => {
                const { info, status, type } = resolveAppointmentVisual(appointment);
                const TypeIcon = type.Icon;
                const durationMin = Math.max(15, endMin - startMin);
                const top = EDGE + y(startMin);
                const height = Math.max(
                  (durationMin / 30) * UNIT_PX - 3,
                  UNIT_PX * 0.72,
                );
                const widthPct = 100 / columnCount;
                const leftPct = column * widthPct;

                return (
                  <article
                    key={appointment.id}
                    className={`absolute z-10 overflow-hidden rounded-xl border border-[#123524]/08 border-l-[3px] shadow-[0_1px_2px_rgba(18,53,36,0.06)] ${status.rail} ${status.surface}`}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                    }}
                  >
                    <div className="flex h-full flex-col gap-0.5 px-2.5 py-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-snug">
                            {info.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] font-medium tabular-nums opacity-80">
                            {info.timeRange}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 [&_a]:text-[10px] [&_button]:text-[10px]">
                          <AppointmentActions
                            appointmentId={appointment.id}
                            contactId={info.contactId}
                          />
                        </div>
                      </div>

                      <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-0.5">
                        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#123524] ring-1 ring-[#123524]/08">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${type.dot}`}
                            aria-hidden
                          />
                          <TypeIcon
                            className="h-3 w-3 shrink-0 opacity-70"
                            aria-hidden
                          />
                          <span className="truncate">{type.label}</span>
                        </span>
                        {info.notes && height >= UNIT_PX ? (
                          <span className="min-w-0 flex-1 truncate text-[10px] opacity-70">
                            {info.notes}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              },
            )}

            {nowTop != null ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: EDGE + nowTop }}
                aria-label="Şu an"
              >
                <span className="absolute -left-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#c2410c] ring-2 ring-white" />
                <span className="h-px w-full bg-[#c2410c]/90" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {appointments.length ? (
        <div className="flex flex-wrap items-center gap-3">
          <StatusLegend />
          <span className="text-[10px] font-medium text-[#8a9a90]">
            Boş saate tıklayarak randevu ekleyebilirsiniz
          </span>
        </div>
      ) : null}
    </div>
  );
}

export async function DayAppointments({
  date,
  todayYmd,
  appointments,
  emptyText,
  selectedLeadId,
  stage = "active",
  search = "",
}: {
  date: string;
  todayYmd: string;
  appointments: ScheduleAppointment[];
  emptyText: string;
  selectedLeadId?: string;
  stage?: string;
  search?: string;
}) {
  const isToday = date === todayYmd;
  const now = isToday ? await getIstanbulNow() : null;
  const nowOnDay = now && istanbulYmd(now) === date ? now : null;
  let nowTop: number | null = null;
  if (nowOnDay) {
    const mins = minutesFromClinicStart(nowOnDay.toISOString());
    if (mins >= 0 && mins <= TRACK_MINUTES) {
      nowTop = (mins / 30) * UNIT_PX;
    }
  }

  const laidOut = layoutDay(appointments);
  const hasAppointments = appointments.length > 0;
  const bannerMessage = hasAppointments
    ? "Yeni randevu ekleyin."
    : emptyText;

  return (
    <div className="space-y-4">
      <ScheduleAddBanner
        message={bannerMessage}
        date={date}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />

      {hasAppointments ? (
        <div className="space-y-2.5 sm:hidden">
          <AgendaCardList
            appointments={appointments}
            heading={`Günün randevuları · ${appointments.length}`}
          />
          <StatusLegend />
        </div>
      ) : null}

      <DayTimeline
        date={date}
        appointments={appointments}
        laidOut={laidOut}
        nowTop={nowTop}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />
    </div>
  );
}
