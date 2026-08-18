import Link from "next/link";
import { AppointmentQuickForm } from "@/components/admin/schedule/AppointmentQuickForm";
import { CalendarInspectDate } from "@/components/admin/schedule/CalendarInspectDate";
import { DayAppointments } from "@/components/admin/schedule/DayAppointments";
import { planHref, type PlanView } from "@/components/admin/schedule/href";
import { MonthCalendar } from "@/components/admin/schedule/MonthCalendar";
import { WeekList } from "@/components/admin/schedule/WeekList";
import { YearCalendar } from "@/components/admin/schedule/YearCalendar";
import type {
  ScheduleAppointment,
  ScheduleLead,
} from "@/components/admin/schedule/types";
import { requireAdminSession } from "@/lib/admin/auth";
import { firstRelation } from "@/lib/crm/labels";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import {
  addDaysYmd,
  formatDateLongTr,
  formatMonthYearTr,
  startOfWeekMonday,
} from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

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
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;

  const rangeStart =
    view === "week"
      ? `${weekStart}T00:00:00+03:00`
      : view === "month"
        ? `${monthStart}T00:00:00+03:00`
        : view === "year"
          ? `${yearStart}T00:00:00+03:00`
          : `${date}T00:00:00+03:00`;
  const rangeEnd =
    view === "week"
      ? `${addDaysYmd(weekStart, 7)}T00:00:00+03:00`
      : view === "month"
        ? `${nextMonthStart}T00:00:00+03:00`
        : view === "year"
          ? `${nextYearStart}T00:00:00+03:00`
          : `${addDaysYmd(date, 1)}T00:00:00+03:00`;

  const supabase = await createClient();
  const [{ data: leads, error: leadsError }, { data: appointments, error }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, stage, site, channel, utm_source, created_at, contacts(id, name, phone)",
        )
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("appointments")
        .select(
          "id, lead_id, title, starts_at, ends_at, status, appointment_type, location, notes, leads(id, contact_id, contacts(id, name, phone))",
        )
        .gte("starts_at", new Date(rangeStart).toISOString())
        .lt("starts_at", new Date(rangeEnd).toISOString())
        .neq("status", "cancelled")
        .order("starts_at"),
    ]);

  const visibleLeads = ((leads ?? []) as ScheduleLead[]).filter((lead) => {
    if (stage === "active" && ["won", "lost", "spam"].includes(lead.stage)) {
      return false;
    }
    if (!search) return true;
    const contact = firstRelation(lead.contacts);
    return `${contact?.name ?? ""} ${contact?.phone ?? ""}`
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR"));
  });

  const items = (appointments ?? []) as ScheduleAppointment[];
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
        <div className="flex items-center gap-2">
          <Link
            href={planHref({
              view,
              date: prevDate,
              lead: selectedLeadId,
              q: search,
            })}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#123524]/15 bg-white text-lg font-semibold sm:h-10 sm:w-10 sm:rounded-full"
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#123524]/15 bg-white text-lg font-semibold sm:h-10 sm:w-10 sm:rounded-full"
            aria-label="Sonraki"
          >
            →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-[#123524]">
            {heading}
          </span>
          <Link
            href={planHref({
              view,
              date: todayYmd,
              lead: selectedLeadId,
              q: search,
            })}
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#0b6b45]/25 bg-white px-4 text-sm font-semibold text-[#0b6b45]"
          >
            Bugün
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 ring-1 ring-[#123524]/10">
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
            className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold ${
              view === key
                ? "bg-[#123524] text-white"
                : "text-[#466254]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

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
                08:00–20:00. Soluk kutular boş; yeşil kutularda hasta adı ve tür
                görünür.
              </p>
            </div>
          </div>

          {leadsError ? (
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {leadsError.message}
            </p>
          ) : null}

          <div className="mt-3">
            <AppointmentQuickForm
              leads={visibleLeads}
              selectedLeadId={selectedLeadId}
              date={date}
              time={
                activeSlot ??
                `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`
              }
              view={view}
              error={query.error}
              defaultOpen={formDefaultOpen}
            />
          </div>

          <DayAppointments
            date={date}
            todayYmd={todayYmd}
            appointments={items}
            emptyText="Bu tarihte randevu yok. + Randevu ekle ile yeni kayıt açın."
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-[#123524]/10 bg-white p-3 sm:p-4">
          {view === "week" ? (
            <WeekList
              weekStart={weekStart}
              todayYmd={todayYmd}
              date={date}
              appointments={items}
              selectedLeadId={selectedLeadId}
              stage={stage}
              search={search}
            />
          ) : view === "month" ? (
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
          ) : (
            <YearCalendar
              year={year}
              todayYmd={todayYmd}
              appointments={items}
              selectedLeadId={selectedLeadId}
              stage={stage}
              search={search}
            />
          )}
        </section>
      )}

      {view !== "day" ? (
        <>
          {leadsError ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {leadsError.message}
            </p>
          ) : null}
          <AppointmentQuickForm
            leads={visibleLeads}
            selectedLeadId={selectedLeadId}
            date={date}
            time={
              activeSlot ??
              `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`
            }
            view={view}
            error={query.error}
            defaultOpen={formDefaultOpen}
          />
        </>
      ) : null}
    </div>
  );
}
