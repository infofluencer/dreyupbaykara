import Link from "next/link";
import { planHref } from "@/components/admin/schedule/href";
import {
  AgendaCardList,
  AppointmentActions,
  MiniAppointmentCard,
  ScheduleAddBanner,
  StatusLegend,
  resolveAppointmentVisual,
  sortByStart,
} from "@/components/admin/schedule/schedule-visuals";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { formatDateLongTr, formatMonthYearTr, istanbulYmd } from "@/lib/date/tr";

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
const CELL_PREVIEW = 3;

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
  for (const appointment of sortByStart(appointments)) {
    const ymd = istanbulYmd(appointment.starts_at);
    const list = byDay.get(ymd) ?? [];
    list.push(appointment);
    byDay.set(ymd, list);
  }

  const selectedItems = byDay.get(date) ?? [];
  const selectedInMonth = date.startsWith(
    `${year}-${String(month + 1).padStart(2, "0")}`,
  );
  const monthLabel = formatMonthYearTr(`${monthStart}T12:00:00+03:00`);
  const monthEmpty = appointments.length === 0;

  function dayHref(ymd: string, view: "day" | "month" = "day") {
    return planHref({
      view,
      date: ymd,
      lead: selectedLeadId,
      stage,
      q: search,
    });
  }

  return (
    <div className="space-y-5">
      <ScheduleAddBanner
        message={
          monthEmpty
            ? "Bu ay için randevu yok."
            : "Yeni randevu ekleyin."
        }
        date={date}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />

      {/* Shared weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#466254] sm:gap-2 sm:text-xs">
        {WEEKDAYS.map((label, index) => (
          <div key={label} className="py-1">
            <span className="sm:hidden">{WEEKDAYS_SHORT[index]}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* Mobile compact grid + selected day agenda */}
      <div className="space-y-4 sm:hidden">
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ymd, index) => {
            if (!ymd) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square rounded-xl bg-[#f7f9f8]"
                />
              );
            }
            const items = byDay.get(ymd) ?? [];
            const selected = ymd === date;
            const today = ymd === todayYmd;
            return (
              <Link
                key={ymd}
                href={dayHref(ymd, "month")}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border ${
                  selected
                    ? "border-[#0b6b45] bg-[#e7f5ed]"
                    : today
                      ? "border-[#0b6b45]/40 bg-white"
                      : "border-[#123524]/08 bg-white"
                }`}
              >
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    selected || today ? "text-[#123524]" : "text-[#466254]"
                  }`}
                >
                  {Number(ymd.slice(8))}
                </span>
                <span className="mt-1 flex h-1.5 max-w-full flex-wrap justify-center gap-0.5 px-0.5">
                  {items.slice(0, 4).map((appointment) => {
                    const { status } = resolveAppointmentVisual(appointment);
                    return (
                      <span
                        key={appointment.id}
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                    );
                  })}
                </span>
              </Link>
            );
          })}
        </div>

        {selectedInMonth ? (
          <AgendaCardList
            appointments={selectedItems}
            heading={`${formatDateLongTr(`${date}T12:00:00+03:00`)} · ${selectedItems.length} randevu`}
          />
        ) : null}
        <StatusLegend />
      </div>

      {/* Desktop month grid */}
      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-7 gap-2">
            {cells.map((ymd, index) => {
              if (!ymd) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[7.5rem] rounded-2xl bg-[#f7f9f8]"
                  />
                );
              }
              const items = byDay.get(ymd) ?? [];
              const selected = ymd === date;
              const today = ymd === todayYmd;
              const preview = items.slice(0, CELL_PREVIEW);
              const rest = items.length - preview.length;
              const href = dayHref(ymd);

              return (
                <div
                  key={ymd}
                  className={`flex min-h-[7.5rem] flex-col overflow-hidden rounded-2xl border p-2 ${
                    selected
                      ? "border-[#0b6b45] bg-[#e7f5ed]/40"
                      : today
                        ? "border-[#0b6b45]/35 bg-white"
                        : "border-[#123524]/10 bg-white hover:bg-[#fafbfb]"
                  }`}
                >
                  <Link
                    href={href}
                    className="mb-1.5 flex items-baseline justify-between gap-1"
                  >
                    <span className="text-sm font-semibold tabular-nums text-[#123524]">
                      {Number(ymd.slice(8))}
                    </span>
                    {today ? (
                      <span className="text-[10px] font-semibold text-[#0b6b45]">
                        bugün
                      </span>
                    ) : items.length ? (
                      <span className="text-[10px] font-semibold text-[#6b7d73]">
                        {items.length}
                      </span>
                    ) : null}
                  </Link>
                  <div className="flex min-h-0 flex-1 flex-col gap-1">
                    {preview.map((appointment) => (
                      <MiniAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        href={`/admin/calendar/${appointment.id}`}
                      />
                    ))}
                    {rest > 0 ? (
                      <Link
                        href={href}
                        className="mt-auto text-[10px] font-semibold text-[#0b6b45] hover:underline"
                      >
                        +{rest} daha
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full-month list — desktop only to avoid double DOM on mobile */}
      <div className="hidden sm:block">
        <h3 className="font-semibold capitalize text-[#123524]">
          {monthLabel} randevu listesi
        </h3>
        {!appointments.length ? (
          <p className="mt-3 text-sm text-[#466254]">Bu ayda randevu yok.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {sortByStart(appointments).map((appointment) => {
              const { info, status, type } =
                resolveAppointmentVisual(appointment);
              const TypeIcon = type.Icon;
              return (
                <article
                  key={appointment.id}
                  className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#123524]/08 border-l-[3px] px-4 py-3 ${status.rail} ${status.surface}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      {info.dateLong}
                    </p>
                    <p className="mt-1 font-semibold">
                      <span className="font-mono tabular-nums">
                        {info.timeRange}
                      </span>{" "}
                      · {info.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[#123524] ring-1 ring-[#123524]/08">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${type.dot}`}
                        />
                        <TypeIcon className="h-3 w-3 opacity-70" aria-hidden />
                        {type.label}
                      </span>
                      <span className="text-xs opacity-70">
                        {info.duration}
                        {info.phone ? ` · ${info.phone}` : ""}
                      </span>
                    </div>
                    {info.notes ? (
                      <p className="mt-1 truncate text-xs opacity-70">
                        {info.notes}
                      </p>
                    ) : null}
                  </div>
                  <AppointmentActions
                    appointmentId={appointment.id}
                    contactId={info.contactId}
                  />
                </article>
              );
            })}
          </div>
        )}
        <StatusLegend className="mt-4" />
      </div>
    </div>
  );
}
