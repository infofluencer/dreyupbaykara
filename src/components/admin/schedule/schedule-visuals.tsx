import Link from "next/link";
import {
  Activity,
  CircleDot,
  Stethoscope,
  Syringe,
  Video,
  type LucideIcon,
} from "lucide-react";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { appointmentInfo } from "@/components/admin/schedule/appointment-display";
import { planHref } from "@/components/admin/schedule/href";
import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import { formatTimeTr } from "@/lib/date/tr";

export const STATUS_STYLE: Record<
  string,
  { rail: string; surface: string; dot: string; muted?: boolean }
> = {
  scheduled: {
    rail: "border-l-[#64748b]",
    surface: "bg-[#f1f5f9] text-[#334155]",
    dot: "bg-[#64748b]",
  },
  confirmed: {
    rail: "border-l-[#2563eb]",
    surface: "bg-[#eff6ff] text-[#1e3a5f]",
    dot: "bg-[#2563eb]",
  },
  completed: {
    rail: "border-l-[#0b6b45]",
    surface: "bg-[#e7f5ed] text-[#123524]",
    dot: "bg-[#0b6b45]",
  },
  cancelled: {
    rail: "border-l-[#b91c1c]",
    surface: "bg-[#fef2f2] text-[#7f1d1d] opacity-70 line-through",
    dot: "bg-[#b91c1c]",
    muted: true,
  },
};

export const TYPE_META: Record<
  string,
  { label: string; dot: string; Icon: LucideIcon }
> = {
  consultation: {
    label: "İlk muayene",
    dot: "bg-[#123524]",
    Icon: Stethoscope,
  },
  control: {
    label: "Kontrol",
    dot: "bg-[#0b6b45]",
    Icon: Activity,
  },
  procedure: {
    label: "Ameliyat",
    dot: "bg-[#b45309]",
    Icon: Syringe,
  },
  online: {
    label: "Online",
    dot: "bg-[#2563eb]",
    Icon: Video,
  },
  other: {
    label: "Diğer",
    dot: "bg-[#6b7d73]",
    Icon: CircleDot,
  },
};

export function resolveAppointmentVisual(appointment: ScheduleAppointment) {
  const statusKey =
    appointment.status in STATUS_STYLE ? appointment.status : "scheduled";
  const typeKey =
    (appointment.appointment_type ?? "consultation") in TYPE_META
      ? (appointment.appointment_type ?? "consultation")
      : "other";
  return {
    info: appointmentInfo(appointment),
    status: STATUS_STYLE[statusKey],
    type: TYPE_META[typeKey],
  };
}

export function AppointmentActions({
  appointmentId,
  contactId,
  compact = false,
}: {
  appointmentId: string;
  contactId: string;
  compact?: boolean;
}) {
  const text = compact ? "text-[10px]" : "text-xs";
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${text}`}>
      <Link
        href={`/admin/calendar/${appointmentId}`}
        className="font-semibold text-[#0b6b45] hover:underline"
      >
        Detay
      </Link>
      {contactId ? (
        <Link
          href={`/admin/patients/${contactId}`}
          className="font-semibold text-[#0b6b45] hover:underline"
        >
          Hasta
        </Link>
      ) : null}
      <DeleteAppointmentButton
        id={appointmentId}
        className={`inline-flex items-center font-semibold text-red-700 hover:underline ${text}`}
      />
    </div>
  );
}

/** Compact week/month cell chip */
export function MiniAppointmentCard({
  appointment,
  href,
}: {
  appointment: ScheduleAppointment;
  href?: string;
}) {
  const { info, status, type } = resolveAppointmentVisual(appointment);
  const inner = (
    <>
      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${type.dot}`} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-mono font-semibold tabular-nums opacity-80">
          {formatTimeTr(appointment.starts_at)}
        </span>{" "}
        <span className="font-medium">{info.name}</span>
      </span>
    </>
  );

  const className = `flex items-start gap-1 rounded-lg border border-[#123524]/06 border-l-[3px] px-1.5 py-1 text-[10px] leading-snug ${status.rail} ${status.surface}`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:brightness-[0.98]`}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

/** Full agenda cards — same language as Day mobile agenda */
export function AgendaCardList({
  appointments,
  heading,
}: {
  appointments: ScheduleAppointment[];
  heading?: string;
}) {
  const sorted = [...appointments].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  if (!sorted.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#123524]/12 bg-[#f7f9f8] px-4 py-5 text-sm text-[#8a9a90]">
        Randevu yok
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {heading ? (
        <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7d73]">
          {heading}
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {sorted.map((appointment) => {
          const { info, status, type } = resolveAppointmentVisual(appointment);
          const TypeIcon = type.Icon;
          return (
            <li key={appointment.id}>
              <article
                className={`rounded-2xl border border-[#123524]/08 border-l-[3px] px-3.5 py-3 shadow-[0_1px_2px_rgba(18,53,36,0.05)] ${status.rail} ${status.surface}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold tabular-nums opacity-80">
                      {info.timeRange}
                    </p>
                    <p className="mt-0.5 truncate text-base font-semibold leading-snug">
                      {info.name}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[10px] font-semibold text-[#123524] ring-1 ring-[#123524]/08">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${type.dot}`}
                      aria-hidden
                    />
                    <TypeIcon className="h-3 w-3 opacity-70" aria-hidden />
                    <span>{type.label}</span>
                  </span>
                </div>
                {info.notes ? (
                  <p className="mt-2 truncate text-xs opacity-70">{info.notes}</p>
                ) : null}
                <div className="mt-3 border-t border-[#123524]/08 pt-2.5">
                  <AppointmentActions
                    appointmentId={appointment.id}
                    contactId={info.contactId}
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatusLegend({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap gap-3 text-[10px] font-medium text-[#6b7d73] ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-1 rounded-sm bg-[#64748b]" /> Planlandı
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-1 rounded-sm bg-[#2563eb]" /> Onaylandı
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-1 rounded-sm bg-[#0b6b45]" /> Tamamlandı
      </span>
    </div>
  );
}

export function sortByStart(appointments: ScheduleAppointment[]) {
  return [...appointments].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/** Top CTA bar — same look on day / week / month / year */
export function ScheduleAddBanner({
  message,
  date,
  selectedLeadId,
  stage = "active",
  search = "",
  slot = "09:00",
}: {
  message: string;
  date: string;
  selectedLeadId?: string;
  stage?: string;
  search?: string;
  slot?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#123524]/15 bg-[#f7f9f8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#466254]">{message}</p>
      <Link
        href={planHref({
          view: "day",
          date,
          lead: selectedLeadId,
          stage,
          q: search,
          slot,
        })}
        className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#0b6b45] px-4 text-sm font-semibold text-white"
      >
        Randevu ekle
      </Link>
    </div>
  );
}
