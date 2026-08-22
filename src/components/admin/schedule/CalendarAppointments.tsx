import { Suspense } from "react";
import { DayAppointments } from "@/components/admin/schedule/DayAppointments";
import { MonthCalendar } from "@/components/admin/schedule/MonthCalendar";
import { WeekList } from "@/components/admin/schedule/WeekList";
import { CalendarSkeleton } from "@/components/admin/schedule/CalendarSkeleton";
import {
  YearCalendar,
  YEAR_MONTH_PREVIEW_LIMIT,
  type YearMonthPreview,
  type YearMonthSummary,
} from "@/components/admin/schedule/YearCalendar";
import type { PlanView } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { requireAdminSession } from "@/lib/admin/auth";
import { addDaysYmd, istanbulYmd, startOfWeekMonday } from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

const DETAIL_SELECT =
  "id, lead_id, title, starts_at, ends_at, status, appointment_type, location, notes, leads(id, contact_id, contacts(id, name, phone))";

/** Lightweight year fields — no lead/contact embed. */
const YEAR_LIGHT_SELECT = "id, starts_at, status, appointment_type, title";

async function loadYearOverview(year: number): Promise<YearMonthSummary[]> {
  const supabase = await createClient();
  const yearFrom = new Date(`${year}-01-01T00:00:00+03:00`).toISOString();
  const yearTo = new Date(`${year + 1}-01-01T00:00:00+03:00`).toISOString();

  const [statusResult, ...previewResults] = await Promise.all([
    // One light scan for accurate monthly counts + status mix (2 columns, no joins)
    supabase
      .from("appointments")
      .select("starts_at, status")
      .gte("starts_at", yearFrom)
      .lt("starts_at", yearTo)
      .neq("status", "cancelled"),
    // 12× max 4 preview rows — titles only, no lead/contact embed
    ...Array.from({ length: 12 }, (_, month) => {
      const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const nextMonthStart =
        month === 11
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 2).padStart(2, "0")}-01`;
      return supabase
        .from("appointments")
        .select(YEAR_LIGHT_SELECT)
        .gte(
          "starts_at",
          new Date(`${monthStart}T00:00:00+03:00`).toISOString(),
        )
        .lt(
          "starts_at",
          new Date(`${nextMonthStart}T00:00:00+03:00`).toISOString(),
        )
        .neq("status", "cancelled")
        .order("starts_at")
        .limit(YEAR_MONTH_PREVIEW_LIMIT);
    }),
  ]);

  const months: YearMonthSummary[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    count: 0,
    byStatus: { scheduled: 0, confirmed: 0, completed: 0 },
    preview: (previewResults[month]?.data ?? []) as YearMonthPreview[],
  }));

  for (const row of statusResult.data ?? []) {
    const ymd = istanbulYmd(row.starts_at as string);
    if (!ymd.startsWith(`${year}-`)) continue;
    const m = Number(ymd.slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    months[m].count += 1;
    if (row.status === "scheduled") months[m].byStatus.scheduled += 1;
    else if (row.status === "confirmed") months[m].byStatus.confirmed += 1;
    else if (row.status === "completed") months[m].byStatus.completed += 1;
  }

  return months;
}

async function YearOverview({
  year,
  todayYmd,
  selectedLeadId,
  stage,
  search,
}: {
  year: number;
  todayYmd: string;
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const months = await loadYearOverview(year);
  return (
    <YearCalendar
      year={year}
      todayYmd={todayYmd}
      months={months}
      selectedLeadId={selectedLeadId}
      stage={stage}
      search={search}
    />
  );
}

export async function CalendarAppointments({
  view,
  date,
  todayYmd,
  selectedLeadId,
  stage,
  search,
}: {
  view: PlanView;
  date: string;
  todayYmd: string;
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);

  const weekStart = startOfWeekMonday(date);
  const monthDate = new Date(`${date}T12:00:00+03:00`);
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const nextMonthStart = addDaysYmd(monthEnd, 1);

  if (view === "year") {
    return (
      <Suspense fallback={<CalendarSkeleton view="year" />}>
        <YearOverview
          year={year}
          todayYmd={todayYmd}
          selectedLeadId={selectedLeadId}
          stage={stage}
          search={search}
        />
      </Suspense>
    );
  }

  const rangeStart =
    view === "week"
      ? `${weekStart}T00:00:00+03:00`
      : view === "month"
        ? `${monthStart}T00:00:00+03:00`
        : `${date}T00:00:00+03:00`;
  const rangeEnd =
    view === "week"
      ? `${addDaysYmd(weekStart, 7)}T00:00:00+03:00`
      : view === "month"
        ? `${nextMonthStart}T00:00:00+03:00`
        : `${addDaysYmd(date, 1)}T00:00:00+03:00`;

  const supabase = await createClient();
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(DETAIL_SELECT)
    .gte("starts_at", new Date(rangeStart).toISOString())
    .lt("starts_at", new Date(rangeEnd).toISOString())
    .neq("status", "cancelled")
    .order("starts_at");

  const items = (appointments ?? []) as ScheduleAppointment[];

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {error.message}
      </p>
    );
  }

  if (view === "day") {
    return (
      <DayAppointments
        date={date}
        todayYmd={todayYmd}
        appointments={items}
        emptyText={
          date === todayYmd
            ? "Bugün için randevu yok."
            : "Bu tarihte randevu yok."
        }
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />
    );
  }

  if (view === "week") {
    return (
      <WeekList
        weekStart={weekStart}
        todayYmd={todayYmd}
        date={date}
        appointments={items}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />
    );
  }

  return (
    <MonthCalendar
      year={year}
      month={month}
      date={date}
      todayYmd={todayYmd}
      appointments={items}
      selectedLeadId={selectedLeadId}
      stage={stage}
      search={search}
    />
  );
}
