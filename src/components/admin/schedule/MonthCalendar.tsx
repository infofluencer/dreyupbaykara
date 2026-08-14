import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { formatMonthYearTr, istanbulYmd } from "@/lib/date/tr";

const WEEKDAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function MonthCalendar({
  year,
  month,
  date,
  todayYmd,
  appointments,
  selectedLeadId,
  stage,
  search,
}: {
  year: number;
  month: number;
  date: string;
  todayYmd: string;
  appointments: ScheduleAppointment[];
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const mondayOffset =
    (new Date(`${monthStart}T12:00:00+03:00`).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${year}-${String(month + 1).padStart(2, "0")}-${day}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, ScheduleAppointment[]>();
  for (const appointment of appointments) {
    const ymd = istanbulYmd(appointment.starts_at);
    const list = byDay.get(ymd) ?? [];
    list.push(appointment);
    byDay.set(ymd, list);
  }

  return (
    <div className="space-y-5">
      <div className="md:overflow-x-auto">
        <div className="md:min-w-[52rem]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#466254] md:gap-2 md:text-xs">
            {WEEKDAYS.map((label, index) => (
              <div key={label} className="py-1">
                <span className="md:hidden">{WEEKDAYS_SHORT[index]}</span>
                <span className="hidden md:inline">{label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {cells.map((ymd, index) => {
              if (!ymd) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-12 rounded-xl bg-[#f7f9f8] md:aspect-square md:rounded-2xl"
                  />
                );
              }
              const items = byDay.get(ymd) ?? [];
              const selected = ymd === date;
              const today = ymd === todayYmd;
              return (
                <div
                  key={ymd}
                  className={`relative flex min-h-12 flex-col overflow-hidden rounded-xl border p-1 md:aspect-square md:rounded-2xl md:p-2 ${
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
                    aria-label={`${Number(ymd.slice(8))} gününü incele`}
                  />
                  <div className="relative z-10 flex items-baseline justify-center gap-1 pointer-events-none md:justify-between">
                    <p className="text-sm font-semibold tabular-nums">
                      {Number(ymd.slice(8))}
                    </p>
                    {today ? (
                      <span className="hidden text-[10px] font-semibold text-[#0b6b45] md:inline">
                        bugün
                      </span>
                    ) : items.length ? (
                      <span className="hidden text-[10px] font-semibold text-[#466254] md:inline">
                        {items.length}
                      </span>
                    ) : null}
                  </div>
                  {items.length ? (
                    <div className="mt-0.5 flex justify-center gap-0.5 md:hidden">
                      {items.slice(0, 3).map((appointment) => (
                        <span
                          key={appointment.id}
                          className="h-1.5 w-1.5 rounded-full bg-[#0b6b45]"
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="relative z-10 mt-1 hidden min-h-0 flex-1 space-y-1 overflow-y-auto pointer-events-none md:block">
                    {items.map((appointment) => {
                      const info = appointmentInfo(appointment);
                      return (
                        <Link
                          key={appointment.id}
                          href={`/admin/calendar/${appointment.id}`}
                          className="pointer-events-auto block rounded-lg bg-white/80 px-1.5 py-1 text-[11px] leading-snug text-[#123524] hover:bg-white"
                        >
                          <span className="font-semibold">{info.timeRange}</span>
                          <span className="block truncate">{info.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold capitalize">
          {formatMonthYearTr(`${monthStart}T12:00:00+03:00`)} randevu listesi
        </h3>
        {!appointments.length ? (
          <p className="mt-3 text-sm text-[#466254]">Bu ayda randevu yok.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {appointments.map((appointment) => {
              const info = appointmentInfo(appointment);
              return (
                <div
                  key={appointment.id}
                    className="flex min-h-[4.75rem] flex-wrap items-start justify-between gap-3 rounded-xl bg-[#f4f6f5] px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                      {info.dateLong}
                    </p>
                    <p className="mt-1 font-semibold">
                      {info.timeRange} · {info.name}
                    </p>
                    <p className="text-xs text-[#466254]">
                      {info.duration} · {info.type} · {info.status}
                      {info.phone ? ` · ${info.phone}` : ""}
                    </p>
                    {info.notes ? (
                      <p className="mt-1 text-xs text-[#24543e]">{info.notes}</p>
                    ) : null}
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
      </div>
    </div>
  );
}
