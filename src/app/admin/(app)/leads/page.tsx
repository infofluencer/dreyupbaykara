import { Suspense } from "react";
import Link from "next/link";
import { AppointmentQuickForm } from "@/components/admin/schedule/AppointmentQuickForm";
import { CalendarAppointments } from "@/components/admin/schedule/CalendarAppointments";
import { CalendarInspectDate } from "@/components/admin/schedule/CalendarInspectDate";
import { CalendarSkeleton } from "@/components/admin/schedule/CalendarSkeleton";
import { planHref, type PlanView } from "@/components/admin/schedule/href";
import { requireAdminSession } from "@/lib/admin/auth";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import {
  addDaysYmd,
  formatDateLongTr,
  formatMonthYearTr,
  startOfWeekMonday,
} from "@/lib/date/tr";

function parseSlot(raw?: string): { hour: number; minute: number } {
  const match = raw?.match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    lead?: string;
    stage?: string;
    q?: string;
    slot?: string;
    error?: string;
  }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const todayYmd = await getIstanbulTodayYmd();
  const query = await searchParams;
  const view: PlanView =
    query.view === "week" || query.view === "month" || query.view === "year"
      ? query.view
      : "day";
  const date =
    query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : todayYmd;
  const stage = query.stage || "active";
  const search = query.q?.trim() || "";
  const selectedLeadId = query.lead;
  const slot = parseSlot(query.slot);
  const activeSlot = query.slot?.match(/^\d{2}:\d{2}$/) ? query.slot : undefined;
  const formDefaultOpen = Boolean(selectedLeadId || query.error || activeSlot);
  const weekStart = startOfWeekMonday(date);
  const monthDate = new Date(`${date}T12:00:00+03:00`);
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const nextMonthStart = addDaysYmd(monthEnd, 1);
  const nextYearStart = `${year + 1}-01-01`;
  const formTime =
    activeSlot ??
    `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;

  const prevDate =
    view === "week"
      ? addDaysYmd(weekStart, -7)
      : view === "month"
        ? addDaysYmd(monthStart, -1)
        : view === "year"
          ? `${year - 1}-01-01`
          : addDaysYmd(date, -1);
  const nextDate =
    view === "week"
      ? addDaysYmd(weekStart, 7)
      : view === "month"
        ? nextMonthStart
        : view === "year"
          ? nextYearStart
          : addDaysYmd(date, 1);
  const heading =
    view === "week"
      ? `${formatDateLongTr(`${weekStart}T12:00:00+03:00`)} — ${formatDateLongTr(`${addDaysYmd(weekStart, 6)}T12:00:00+03:00`)}`
      : view === "month"
        ? formatMonthYearTr(`${monthStart}T12:00:00+03:00`)
        : view === "year"
          ? `${year}`
          : formatDateLongTr(`${date}T12:00:00+03:00`);

  const appointments = (
    <Suspense fallback={<CalendarSkeleton view={view} />}>
      <CalendarAppointments
        view={view}
        date={date}
        todayYmd={todayYmd}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />
    </Suspense>
  );

  const quickForm = (
    <AppointmentQuickForm
      selectedLeadId={selectedLeadId}
      date={date}
      time={formTime}
      view={view}
      stage={stage}
      search={search}
      error={query.error}
      defaultOpen={formDefaultOpen}
      hideToggleUnlessOpen={view === "day"}
    />
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold sm:text-2xl">
            Takvim
          </h1>
          <p className="mt-1 hidden text-sm text-[#466254] sm:block">
            Günün saatlerini inceleyin; randevu eklemek için + Randevu ekle
            butonunu kullanın.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href={planHref({
              view,
              date: prevDate,
              lead: selectedLeadId,
              q: search,
            })}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#123524]/15 bg-white text-base font-semibold sm:h-10 sm:w-10 sm:rounded-full sm:text-lg"
            aria-label="Önceki"
          >
            ←
          </Link>
          <CalendarInspectDate
            date={date}
            lead={selectedLeadId}
            search={search}
          />
          <Link
            href={planHref({
              view,
              date: nextDate,
              lead: selectedLeadId,
              q: search,
            })}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#123524]/15 bg-white text-base font-semibold sm:h-10 sm:w-10 sm:rounded-full sm:text-lg"
            aria-label="Sonraki"
          >
            →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold capitalize text-[#123524] sm:text-sm">
            {heading}
          </span>
          <Link
            href={planHref({
              view,
              date: todayYmd,
              lead: selectedLeadId,
              q: search,
            })}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#0b6b45]/25 bg-white px-3 text-xs font-semibold text-[#0b6b45] sm:h-10 sm:px-4 sm:text-sm"
          >
            Bugün
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-[#123524]/10 sm:gap-1 sm:rounded-2xl sm:p-1">
        {(
          [
            ["day", "Gün"],
            ["week", "Hafta"],
            ["month", "Ay"],
            ["year", "Yıl"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={planHref({
              view: key,
              date,
              lead: selectedLeadId,
              q: search,
            })}
            className={`flex min-h-9 items-center justify-center rounded-lg px-1 text-xs font-semibold sm:min-h-11 sm:rounded-xl sm:px-2 sm:text-sm ${
              view === key
                ? "bg-[#123524] text-white"
                : "text-[#466254]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {view === "day" ? (
        <section className="rounded-2xl border border-[#123524]/10 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold capitalize">
                {date === todayYmd
                  ? `Bugün · ${formatDateLongTr(`${date}T12:00:00+03:00`)}`
                  : formatDateLongTr(`${date}T12:00:00+03:00`)}
              </h2>
              <p className="mt-1 hidden text-xs text-[#466254] sm:block">
                08:00–20:00 zaman çizelgesi. Blok yüksekliği süreye göre;
                boş saate tıklayınca randevu formu açılır.
              </p>
            </div>
          </div>

          <div className="mt-3">{quickForm}</div>
          <div className="mt-3">{appointments}</div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#123524]/10 bg-white p-3 sm:p-4">
            {appointments}
          </section>
          {quickForm}
        </>
      )}
    </div>
  );
}
