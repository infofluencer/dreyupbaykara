import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import {
  addDaysYmd,
  formatDateLongTr,
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
    <div className="space-y-3">
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
            className={`rounded-2xl border p-4 ${
              selected
                ? "border-[#0b6b45] bg-[#e7f5ed]"
                : today
                  ? "border-[#0b6b45]/40 bg-white"
                  : "border-[#123524]/10 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                  {formatWeekdayLongTr(iso)}
                  {today ? " · bugün" : ""}
                </p>
                <h3 className="mt-1 text-base font-semibold capitalize">
                  {formatDateLongTr(iso)}
                </h3>
              </div>
              <Link
                href={planHref({
                  view: "day",
                  date: ymd,
                  lead: selectedLeadId,
                  stage,
                  q: search,
                })}
                className="text-xs font-semibold text-[#0b6b45]"
              >
                Saat saat aç
              </Link>
            </div>
            {!items.length ? (
              <p className="mt-3 text-sm text-[#6b7d73]">Bu günde randevu yok.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {items.map((appointment) => {
                  const info = appointmentInfo(appointment);
                  return (
                    <div
                      key={appointment.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white/80 px-3 py-2"
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
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
