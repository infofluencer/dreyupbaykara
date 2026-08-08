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
      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#466254]">
            {WEEKDAYS.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((ymd, index) => {
              if (!ymd) {
                return <div key={`empty-${index}`} className="min-h-32" />;
              }
              const items = byDay.get(ymd) ?? [];
              const selected = ymd === date;
              const today = ymd === todayYmd;
              return (
                <Link
                  key={ymd}
                  href={planHref({
                    view: "day",
                    date: ymd,
                    lead: selectedLeadId,
                    stage,
                    q: search,
                  })}
                  className={`min-h-32 rounded-xl border p-2 text-left ${
                    selected
                      ? "border-[#0b6b45] bg-[#e7f5ed]"
                      : today
                        ? "border-[#0b6b45]/40 bg-white"
                        : "border-[#123524]/10 bg-white hover:bg-[#f7f9f8]"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-sm font-semibold">{Number(ymd.slice(8))}</p>
                    {today ? (
                      <span className="text-[10px] font-semibold text-[#0b6b45]">
                        bugün
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {items.map((appointment) => {
                      const info = appointmentInfo(appointment);
                      return (
                        <p
                          key={appointment.id}
                          className="rounded-lg bg-white/80 px-1.5 py-1 text-[11px] leading-snug text-[#123524]"
                        >
                          <span className="font-semibold">{info.timeRange}</span>
                          <br />
                          {info.name}
                          {info.phone ? (
                            <span className="block text-[10px] text-[#466254]">
                              {info.phone}
                            </span>
                          ) : null}
                        </p>
                      );
                    })}
                  </div>
                </Link>
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
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#f4f6f5] px-4 py-3"
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
