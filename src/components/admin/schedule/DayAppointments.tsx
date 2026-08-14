import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { clinicSlots, coversSlot } from "@/lib/crm/schedule";
import { istanbulHourMinute, istanbulYmd } from "@/lib/date/tr";

const SLOTS = clinicSlots();

export function DayAppointments({
  date,
  todayYmd,
  appointments,
  emptyText,
}: {
  date: string;
  todayYmd: string;
  appointments: ScheduleAppointment[];
  emptyText: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {SLOTS.map(({ hour, minute, label: slot }) => {
          const covering = appointments.filter((appointment) =>
            coversSlot(appointment.starts_at, appointment.ends_at, date, hour, minute),
          );
          const starting = covering.filter((appointment) => {
            if (istanbulYmd(appointment.starts_at) !== date) return false;
            const start = istanbulHourMinute(appointment.starts_at);
            return (
              start.hour === hour &&
              (start.minute < 30 ? 0 : 30) === minute
            );
          });
          const continuing = covering.filter(
            (appointment) => !starting.some((item) => item.id === appointment.id),
          );
          const occupied = covering.length > 0;
          return (
            <div
              key={slot}
              className={`flex min-h-[6.25rem] flex-col overflow-hidden rounded-2xl border p-2.5 sm:min-h-0 sm:aspect-square ${
                occupied
                  ? "border-[#0b6b45]/25 bg-[#f3faf6]"
                  : "border-[#123524]/10 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-1">
                <p className="text-sm font-semibold tabular-nums">{slot}</p>
                {occupied ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0b6b45]">
                    Dolu
                  </span>
                ) : (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#8a9a90]">
                    Boş
                  </span>
                )}
              </div>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                {starting.length || continuing.length ? (
                  <div className="space-y-1.5">
                    {starting.map((appointment) => {
                      const info = appointmentInfo(appointment);
                      return (
                        <div key={appointment.id} className="space-y-1">
                          <p className="text-xs font-semibold leading-snug text-[#123524]">
                            {info.name}
                          </p>
                          <p className="text-[10px] leading-snug text-[#466254]">
                            {info.duration} · {info.status}
                          </p>
                          {info.notes ? (
                            <p className="line-clamp-2 text-[10px] leading-snug text-[#24543e]">
                              {info.notes}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <Link
                              href={`/admin/calendar/${appointment.id}`}
                              className="inline-flex min-h-8 items-center text-xs font-semibold text-[#0b6b45]"
                            >
                              Detay
                            </Link>
                            {info.contactId ? (
                              <Link
                                href={`/admin/patients/${info.contactId}`}
                                className="inline-flex min-h-8 items-center text-xs font-semibold text-[#0b6b45]"
                              >
                                Hasta
                              </Link>
                            ) : null}
                            <DeleteAppointmentButton id={appointment.id} />
                          </div>
                        </div>
                      );
                    })}
                    {continuing.map((appointment) => {
                      const info = appointmentInfo(appointment);
                      return (
                        <p
                          key={`${appointment.id}-cont`}
                          className="rounded-lg bg-[#d8efe3] px-1.5 py-1 text-[10px] font-medium leading-snug text-[#24543e]"
                        >
                          {info.name} devam ediyor
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug text-[#8a9a90]">
                    {date === todayYmd
                      ? "Bu saat boş"
                      : "Bu tarihte boş"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!appointments.length ? (
        <p className="rounded-xl bg-[#f7f9f8] px-4 py-3 text-sm text-[#466254]">
          {emptyText}
        </p>
      ) : null}
    </div>
  );
}
