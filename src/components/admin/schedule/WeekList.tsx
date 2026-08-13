import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import {
  addDaysYmd,
  formatWeekdayLongTr,
  istanbulYmd,
} from "@/lib/date/tr";

export function WeekList({
  weekStart,
  todayYmd,
  date,
  appointments,
  selectedLeadId,
  stage,
  search,
}: {
  weekStart: string;
  todayYmd: string;
  date: string;
  appointments: ScheduleAppointment[];
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDaysYmd(weekStart, index),
  );

  return (
    <div className="md:overflow-x-auto">
      <div className="grid grid-cols-1 gap-2 md:min-w-[64rem] md:grid-cols-7">
        {days.map((ymd) => {
          const items = appointments.filter(
            (item) => istanbulYmd(item.starts_at) === ymd,
          );
          const selected = ymd === date;
          const today = ymd === todayYmd;
          const iso = `${ymd}T12:00:00+03:00`;
          return (
            <section
              key={ymd}
              className={`relative flex min-h-[7.5rem] flex-col overflow-hidden rounded-2xl border p-3 md:aspect-square md:min-h-0 ${
                selected
                  ? "border-[#0b6b45] bg-[#e7f5ed]"
                  : today
                    ? "border-[#0b6b45]/40 bg-white"
                    : "border-[#123524]/10 bg-white hover:bg-[#f7f9f8]"
              }`}
            >
              <Link
                href={planHref({
                  view: "day",
                  date: ymd,
                  lead: selectedLeadId,
                  stage,
                  q: search,
                })}
                className="absolute inset-0 z-0"
                aria-label={`${formatWeekdayLongTr(iso)} gününü incele`}
              />
              <div className="relative z-10 flex items-baseline justify-between gap-1 pointer-events-none">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#466254]">
                    {formatWeekdayLongTr(iso)}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {Number(ymd.slice(8))}
                  </p>
                </div>
                {today ? (
                  <span className="text-[10px] font-semibold text-[#0b6b45]">
                    bugün
                  </span>
                ) : null}
              </div>
              <div className="relative z-10 mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pointer-events-none">
                {!items.length ? (
                  <p className="text-[11px] text-[#8a9a90]">Randevu yok</p>
                ) : (
                  items.map((appointment) => {
                    const info = appointmentInfo(appointment);
                    return (
                      <div
                        key={appointment.id}
                        className="pointer-events-auto rounded-lg bg-white/80 px-2 py-1.5"
                      >
                        <p className="text-[11px] font-semibold leading-snug">
                          {info.timeRange}
                        </p>
                        <p className="truncate text-[11px] text-[#123524]">
                          {info.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2">
                          <Link
                            href={`/admin/calendar/${appointment.id}`}
                            className="text-[10px] font-semibold text-[#0b6b45]"
                          >
                            Detay
                          </Link>
                          {info.contactId ? (
                            <Link
                              href={`/admin/patients/${info.contactId}`}
                              className="text-[10px] font-semibold text-[#0b6b45]"
                            >
                              Hasta
                            </Link>
                          ) : null}
                          <DeleteAppointmentButton id={appointment.id} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
