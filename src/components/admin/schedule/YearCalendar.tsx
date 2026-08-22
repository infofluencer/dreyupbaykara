import Link from "next/link";
import { planHref } from "@/components/admin/schedule/href";
import {
  STATUS_STYLE,
  ScheduleAddBanner,
  StatusLegend,
  TYPE_META,
} from "@/components/admin/schedule/schedule-visuals";
import { formatTimeTr } from "@/lib/date/tr";

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

export type YearMonthPreview = {
  id: string;
  starts_at: string;
  status: string;
  appointment_type: string | null;
  title: string | null;
};

export type YearMonthSummary = {
  month: number;
  count: number;
  byStatus: { scheduled: number; confirmed: number; completed: number };
  preview: YearMonthPreview[];
};

const PREVIEW_LIMIT = 4;

function densityTone(count: number, maxCount: number) {
  if (count <= 0) return "border-[#123524]/08 bg-[#fafbfb]";
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.75) return "border-[#0b6b45]/35 bg-[#e7f5ed]/70";
  if (ratio >= 0.4) return "border-[#0b6b45]/20 bg-[#e7f5ed]/35";
  return "border-[#123524]/10 bg-white";
}

function DensityBar({ count, maxCount }: { count: number; maxCount: number }) {
  const pct =
    count <= 0 || maxCount <= 0
      ? 0
      : Math.max(8, Math.round((count / maxCount) * 100));
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#123524]/08">
      <div
        className="h-full rounded-full bg-[#0b6b45]/75 transition-[width]"
        style={{ width: `${pct}%` }}
        title={`${count} randevu`}
      />
    </div>
  );
}

function StatusPips({ byStatus }: { byStatus: YearMonthSummary["byStatus"] }) {
  const parts: Array<{ key: keyof typeof byStatus; n: number; className: string }> = [
    { key: "scheduled", n: byStatus.scheduled, className: STATUS_STYLE.scheduled.dot },
    { key: "confirmed", n: byStatus.confirmed, className: STATUS_STYLE.confirmed.dot },
    { key: "completed", n: byStatus.completed, className: STATUS_STYLE.completed.dot },
  ];
  const visible = parts.filter((part) => part.n > 0);
  if (!visible.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {visible.map((part) => (
        <span
          key={part.key}
          className="inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold text-[#466254] ring-1 ring-[#123524]/06"
          title={`${part.n}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${part.className}`} />
          {part.n}
        </span>
      ))}
    </div>
  );
}

function PreviewRow({ item }: { item: YearMonthPreview }) {
  const status =
    STATUS_STYLE[item.status] ?? STATUS_STYLE.scheduled;
  const typeKey =
    (item.appointment_type ?? "consultation") in TYPE_META
      ? (item.appointment_type ?? "consultation")
      : "other";
  const type = TYPE_META[typeKey];
  return (
    <Link
      href={`/admin/calendar/${item.id}`}
      className={`flex items-center gap-1.5 rounded-lg border border-[#123524]/06 border-l-[3px] px-1.5 py-1 text-[10px] leading-snug transition hover:brightness-[0.98] ${status.rail} ${status.surface}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${type.dot}`} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-mono font-semibold tabular-nums opacity-80">
          {formatTimeTr(item.starts_at)}
        </span>{" "}
        <span className="font-medium">
          {item.title?.trim() || "Randevu"}
        </span>
      </span>
    </Link>
  );
}

export function YearCalendar({
  year,
  todayYmd,
  months,
  selectedLeadId,
  stage,
  search,
}: {
  year: number;
  todayYmd: string;
  months: YearMonthSummary[];
  selectedLeadId?: string;
  stage: string;
  search: string;
}) {
  const todayMonth =
    todayYmd.startsWith(`${year}-`) ? Number(todayYmd.slice(5, 7)) - 1 : -1;
  const maxCount = Math.max(0, ...months.map((item) => item.count));
  const yearEmpty = months.every((item) => item.count === 0);
  const bannerDate =
    todayYmd.startsWith(`${year}-`)
      ? todayYmd
      : `${year}-01-01`;

  function monthHref(month: number) {
    return planHref({
      view: "month",
      date: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      lead: selectedLeadId,
      stage,
      q: search,
    });
  }

  return (
    <div className="space-y-4">
      <ScheduleAddBanner
        message={
          yearEmpty
            ? "Bu yıl için randevu yok."
            : "Yeni randevu ekleyin."
        }
        date={bannerDate}
        selectedLeadId={selectedLeadId}
        stage={stage}
        search={search}
      />

      {/* Mobile: compact 1–2 col list */}
      <div className="grid grid-cols-1 gap-2 sm:hidden">
        {months.map((summary) => {
          const label = MONTHS[summary.month];
          const current = summary.month === todayMonth;
          const href = monthHref(summary.month);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 ${
                current
                  ? "border-[#0b6b45] bg-[#e7f5ed]"
                  : densityTone(summary.count, maxCount)
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#123524]">
                  {label}{" "}
                  <span className="font-normal text-[#6b7d73]">{year}</span>
                </p>
                <p className="mt-0.5 text-xs text-[#466254]">
                  {summary.count
                    ? `${summary.count} randevu`
                    : "Randevu yok"}
                  {current ? " · bu ay" : ""}
                </p>
                <StatusPips byStatus={summary.byStatus} />
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#0b6b45]">
                Ayı aç
              </span>
            </Link>
          );
        })}
      </div>

      {/* Desktop: 3–4 column cards */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-4">
        {months.map((summary) => {
          const label = MONTHS[summary.month];
          const current = summary.month === todayMonth;
          const href = monthHref(summary.month);
          const rest = Math.max(0, summary.count - summary.preview.length);
          return (
            <section
              key={label}
              className={`flex min-h-[13rem] flex-col overflow-hidden rounded-2xl border p-3 ${
                current
                  ? "border-[#0b6b45] bg-[#e7f5ed]/50 ring-1 ring-[#0b6b45]/20"
                  : densityTone(summary.count, maxCount)
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#123524]">
                    {label}{" "}
                    <span className="font-normal text-[#6b7d73]">{year}</span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#466254]">
                    {summary.count
                      ? `${summary.count} randevu`
                      : "Randevu yok"}
                    {current ? " · bu ay" : ""}
                  </p>
                </div>
                <Link
                  href={href}
                  className="shrink-0 text-[11px] font-semibold text-[#0b6b45] hover:underline"
                >
                  Ayı aç
                </Link>
              </div>

              <DensityBar count={summary.count} maxCount={maxCount} />
              <StatusPips byStatus={summary.byStatus} />

              <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-1">
                {!summary.count ? (
                  <p className="py-2 text-[11px] text-[#b0bab4]">Boş ay</p>
                ) : (
                  <>
                    {summary.preview.map((item) => (
                      <PreviewRow key={item.id} item={item} />
                    ))}
                    {rest > 0 ? (
                      <Link
                        href={href}
                        className="mt-auto pt-1 text-[11px] font-semibold text-[#0b6b45] hover:underline"
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

      <StatusLegend />
      <p className="text-[10px] text-[#8a9a90]">
        Yıl görünümü özetidir (ay başına en fazla {PREVIEW_LIMIT} önizleme).
        Tam liste için ayı açın.
      </p>
    </div>
  );
}

export { PREVIEW_LIMIT as YEAR_MONTH_PREVIEW_LIMIT };
