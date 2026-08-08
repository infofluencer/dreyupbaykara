import Link from "next/link";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { istanbulYmd } from "@/lib/date/tr";

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export function YearCalendar({
  year,
  todayYmd,
  appointments,
  selectedLeadId,
  stage,
  search,
}: {
  year: number;
  todayYmd: string;
  appointments: ScheduleAppointment[];
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  const todayMonth =
    todayYmd.startsWith(`${year}-`) ? Number(todayYmd.slice(5, 7)) - 1 : -1;
  const byMonth = Array.from({ length: 12 }, () => [] as ScheduleAppointment[]);
  for (const appointment of appointments) {
    const ymd = istanbulYmd(appointment.starts_at);
    if (!ymd.startsWith(`${year}-`)) continue;
    byMonth[Number(ymd.slice(5, 7)) - 1].push(appointment);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {MONTHS.map((label, month) => {
        const items = byMonth[month];
        const monthDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const current = month === todayMonth;
        return (
          <section
            key={label}
            className={`rounded-2xl border p-4 ${
              current
                ? "border-[#0b6b45]/40 bg-white"
                : "border-[#123524]/10 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {label} {year}
                </h3>
                <p className="mt-1 text-xs text-[#466254]">
                  {items.length
                    ? `${items.length} randevu`
                    : "Randevu yok"}
                  {current ? " · bu ay" : ""}
                </p>
              </div>
              <Link
                href={planHref({
                  view: "month",
                  date: monthDate,
                  lead: selectedLeadId,
                  stage,
                  q: search,
                })}
                className="text-xs font-semibold text-[#0b6b45]"
              >
                Ayı aç
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {items.slice(0, 6).map((appointment) => {
                const info = appointmentInfo(appointment);
                return (
                  <div
                    key={appointment.id}
                    className="rounded-xl bg-[#f4f6f5] px-3 py-2"
                  >
                    <p className="text-xs font-semibold capitalize text-[#466254]">
                      {info.dateLong}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {info.timeRange} · {info.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-[#466254]">
                        {info.phone || "Telefon yok"}
                      </p>
                      <DeleteAppointmentButton id={appointment.id} />
                    </div>
                  </div>
                );
              })}
              {items.length > 6 ? (
                <Link
                  href={planHref({
                    view: "month",
                    date: monthDate,
                    lead: selectedLeadId,
                    stage,
                    q: search,
                  })}
                  className="block text-xs font-semibold text-[#0b6b45]"
                >
                  +{items.length - 6} randevu daha
                </Link>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
