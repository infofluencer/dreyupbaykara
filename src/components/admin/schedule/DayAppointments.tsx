import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { coversSlot } from "@/lib/crm/schedule";
import { istanbulHourMinute, istanbulYmd } from "@/lib/date/tr";

const HOURS = Array.from({ length: 13 }, (_, index) => index + 8);
const MINUTES = [0, 30] as const;

function slotLabel(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function DayAppointments({
  date,
  todayYmd,
  appointments,
  selectedLeadId,
  stage,
  search,
  activeSlot,
  emptyText,
}: {
  date: string;
  todayYmd: string;
  appointments: ScheduleAppointment[];
  selectedLeadId?: string;
  stage: string;
  search: string;
  activeSlot?: string;
  emptyText: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#123524]/10">
      {HOURS.flatMap((hour) =>
        MINUTES.map((minute) => {
          if (hour === 20 && minute === 30) return null;
          const slot = slotLabel(hour, minute);
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
          const active = activeSlot === slot;
          const occupied = covering.length > 0;
          return (
            <div
              key={slot}
              className={`grid grid-cols-[5.5rem_minmax(0,1fr)] border-b border-[#123524]/08 last:border-0 ${
                active
                  ? "bg-[#e7f5ed]"
                  : occupied
                    ? "bg-[#f3faf6]"
                    : "bg-white"
              }`}
            >
              <Link
                href={planHref({
                  view: "day",
                  date,
                  lead: selectedLeadId,
                  stage,
                  q: search,
                  slot,
                })}
                className="flex items-start border-r border-[#123524]/08 px-3 py-3 text-sm font-semibold text-[#123524]"
              >
                {slot}
              </Link>
              <div className="min-h-[3.25rem] px-3 py-2">
                {starting.length || continuing.length ? (
                  <div className="space-y-2">
                    {starting.map((appointment) => {
                      const info = appointmentInfo(appointment);
                      return (
                        <div
                          key={appointment.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#e7f5ed] px-3 py-2"
                        >
                          <div>
                            <p className="font-semibold">
                              {info.timeRange} · {info.name}
                            </p>
                            <p className="text-xs text-[#466254]">
                              {info.duration} · {info.type} · {info.status}
                              {info.phone ? ` · ${info.phone}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/calendar/${appointment.id}`}
                              className="text-xs font-semibold text-[#0b6b45]"
                            >
                              Detay
                            </Link>
                            {info.contactId ? (
                              <Link
                                href={`/admin/patients/${info.contactId}`}
                                className="text-xs font-semibold text-[#0b6b45]"
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
                          className="rounded-lg bg-[#d8efe3] px-3 py-1.5 text-xs font-medium text-[#24543e]"
                        >
                          Dolu · {info.name} devam ediyor ({info.timeRange},{" "}
                          {info.duration})
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <Link
                    href={planHref({
                      view: "day",
                      date,
                      lead: selectedLeadId,
                      stage,
                      q: search,
                      slot,
                    })}
                    className="block py-1.5 text-xs text-[#6b7d73] hover:text-[#0b6b45]"
                  >
                    {date === todayYmd
                      ? "Boş saat — randevu yaz"
                      : "Boş saat — bu tarihe randevu yaz"}
                  </Link>
                )}
              </div>
            </div>
          );
        }),
      )}
      {!appointments.length ? (
        <p className="bg-[#f7f9f8] px-4 py-3 text-sm text-[#466254]">{emptyText}</p>
      ) : null}
    </div>
  );
}
