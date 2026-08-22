import Link from "next/link";
import { planHref } from "@/components/admin/schedule/href";
import {
  AgendaCardList,
  MiniAppointmentCard,
  ScheduleAddBanner,
  StatusLegend,
  sortByStart,
} from "@/components/admin/schedule/schedule-visuals";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import {
  addDaysYmd,
  formatDateLongTr,
  formatWeekdayLongTr,
  istanbulYmd,
} from "@/lib/date/tr";

const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const PREVIEW = 4;

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

  const byDay = new Map<string, ScheduleAppointment[]>();
  for (const day of days) byDay.set(day, []);
  for (const appointment of appointments) {
    const ymd = istanbulYmd(appointment.starts_at);
    const list = byDay.get(ymd);
    if (list) list.push(appointment);
  }
  for (const [ymd, list] of byDay) {
    byDay.set(ymd, sortByStart(list));
  }

  const selectedItems = byDay.get(date) ?? [];
  const selectedIso = `${date}T12:00:00+03:00`;
  const weekEmpty = appointments.length === 0;

  return (
    <div className="space-y-4">
      <ScheduleAddBanner
        message={
          weekEmpty
            ? "Bu hafta için randevu yok."
            : "Yeni randevu ekleyin."
        }
        date={date}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />

      {/* Mobile: horizontal day strip + agenda */}
      <div className="space-y-4 sm:hidden">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((ymd, index) => {
            const items = byDay.get(ymd) ?? [];
            const selected = ymd === date;
            const today = ymd === todayYmd;
            const iso = `${ymd}T12:00:00+03:00`;
            return (
              <Link
                key={ymd}
                href={planHref({
                  view: "week",
                  date: ymd,
                  lead: selectedLeadId,
                  stage,
                  q: search,
                })}
                className={`flex min-w-[3.25rem] flex-col items-center rounded-2xl px-2 py-2.5 ${
                  selected
                    ? "bg-[#123524] text-white shadow-sm"
                    : today
                      ? "bg-[#e7f5ed] text-[#0b6b45] ring-1 ring-[#0b6b45]/30"
                      : "bg-[#f4f6f5] text-[#466254]"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {WEEKDAY_SHORT[index]}
                </span>
                <span className="mt-0.5 text-lg font-semibold tabular-nums">
                  {Number(ymd.slice(8))}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {items.length ? (
                    items.slice(0, 3).map((appointment) => (
                      <span
                        key={appointment.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-[#73df68]" : "bg-[#0b6b45]"
                        }`}
                      />
                    ))
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                  )}
                </span>
                <span className="sr-only">{formatWeekdayLongTr(iso)}</span>
              </Link>
            );
          })}
        </div>

        <AgendaCardList
          appointments={selectedItems}
          heading={`${formatDateLongTr(selectedIso)} · ${selectedItems.length} randevu`}
        />
        <StatusLegend />
      </div>

      {/* Desktop: 7-column mini agendas */}
      <div className="hidden overflow-x-auto sm:block">
        <div className="grid min-w-[64rem] grid-cols-7 gap-2">
          {days.map((ymd, index) => {
            const items = byDay.get(ymd) ?? [];
            const selected = ymd === date;
            const today = ymd === todayYmd;
            const iso = `${ymd}T12:00:00+03:00`;
            const preview = items.slice(0, PREVIEW);
            const rest = items.length - preview.length;
            const dayHref = planHref({
              view: "day",
              date: ymd,
              lead: selectedLeadId,
              stage,
              q: search,
            });

            return (
              <section
                key={ymd}
                className={`flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border ${
                  selected
                    ? "border-[#0b6b45] bg-[#e7f5ed]/50"
                    : today
                      ? "border-[#0b6b45]/35 bg-white"
                      : "border-[#123524]/10 bg-white"
                }`}
              >
                <Link
                  href={dayHref}
                  className="flex items-baseline justify-between gap-1 border-b border-[#123524]/08 px-3 py-2.5 transition hover:bg-[#f7f9f8]"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#466254]">
                      {WEEKDAY_SHORT[index]}
                    </p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#123524]">
                      {Number(ymd.slice(8))}
                    </p>
                  </div>
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

                <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
                  {!items.length ? (
                    <p className="px-1 py-3 text-[11px] text-[#b0bab4]">
                      Randevu yok
                    </p>
                  ) : (
                    <>
                      {preview.map((appointment) => (
                        <MiniAppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          href={`/admin/calendar/${appointment.id}`}
                        />
                      ))}
                      {rest > 0 ? (
                        <Link
                          href={dayHref}
                          className="mt-auto rounded-lg px-1.5 py-1 text-[11px] font-semibold text-[#0b6b45] hover:underline"
                        >
                          +{rest} daha
                        </Link>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <StatusLegend className="mt-3" />
      </div>
    </div>
  );
}
