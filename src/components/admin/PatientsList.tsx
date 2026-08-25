"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DeletePatientButton } from "@/components/admin/DeletePatientButton";
import { formatPatientNo, patientAge } from "@/lib/crm/patient";
import {
  asLeadStatus,
  LEAD_STATUS_FILTERS,
  statusesForFilter,
  type LeadStatusFilter,
} from "@/lib/crm/lead-status";

const LeadStatusControl = dynamic(
  () =>
    import("@/components/admin/LeadStatusControl").then(
      (m) => m.LeadStatusControl,
    ),
  { ssr: false },
);

export type PatientsListRow = {
  id: string;
  name: string | null;
  phone: string | null;
  patient_no: number | null;
  birth_date: string | null;
  city: string | null;
  activeLead: {
    id: string;
    status: string;
    lost_reason: string | null;
    needs_followup?: boolean | null;
  } | null;
};

export function PatientsList({
  rows: initialRows,
  initialFilter,
  initialQuery,
}: {
  rows: PatientsListRow[];
  initialFilter: LeadStatusFilter;
  initialQuery: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const allowed = statusesForFilter(filter);
    return initialRows.filter((row) => {
      if (allowed) {
        if (!row.activeLead) return false;
        if (!allowed.includes(asLeadStatus(row.activeLead.status))) return false;
      }
      if (!q) return true;
      const hay = `${row.name ?? ""} ${row.phone ?? ""} ${row.city ?? ""} ${
        row.patient_no ?? ""
      }`.toLowerCase();
      if (hay.includes(q)) return true;
      if (digits && (row.phone ?? "").includes(digits)) return true;
      if (digits && String(row.patient_no ?? "") === digits) return true;
      return false;
    });
  }, [initialRows, filter, query]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ad, telefon, TC veya hasta no"
          aria-label="Hastalarda ara"
          className="min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-4 py-3 text-base outline-none focus:border-[#0b6b45]"
        />

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Durum filtresi"
        >
          {LEAD_STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                filter === item.id
                  ? "bg-[#0b6b45] text-white"
                  : "border border-[#0b6b45]/25 bg-white text-[#466254] hover:bg-[#f4f6f5]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!filtered.length ? (
        <p className="rounded-2xl border border-[#123524]/10 bg-white px-5 py-10 text-center text-sm text-[#466254]">
          {query.trim() || filter !== "all"
            ? "Eşleşen hasta yok."
            : "Henüz hasta yok. Yeni hasta ekleyin veya takvimden randevu yazın."}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
          {filtered.map((row) => {
            const age = patientAge(row.birth_date);
            const meta = [
              row.phone || "Telefon yok",
              age ? `${age} yaş` : null,
              row.city,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={row.id}
                className="border-b border-[#123524]/08 last:border-b-0"
              >
                <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-4 lg:grid-cols-[minmax(0,1fr)_11rem_auto] lg:items-center lg:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="truncate font-[family-name:var(--font-instrument-sans)] text-base font-semibold text-[#123524]">
                        {row.name || "İsimsiz"}
                      </p>
                      <span className="shrink-0 text-xs font-semibold text-[#0b6b45]">
                        {formatPatientNo(row.patient_no)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[#466254]">
                      {meta}
                    </p>
                  </div>

                  <div className="min-w-0 lg:justify-self-stretch">
                    {row.activeLead ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#466254]/80 lg:sr-only">
                          Durum
                        </p>
                        <LeadStatusControl
                          leadId={row.activeLead.id}
                          status={row.activeLead.status}
                          lostReason={row.activeLead.lost_reason}
                          needsFollowup={row.activeLead.needs_followup}
                          showBadge={false}
                          showFollowupToggle={false}
                          size="sm"
                          className="w-full [&>select]:w-full"
                        />
                        {row.activeLead.needs_followup &&
                        asLeadStatus(row.activeLead.status) === "arandi" ? (
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-900">
                            Tekrar ara
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-[#466254]">Aktif talep yok</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-self-end">
                    <Link
                      href={`/admin/patients/${row.id}`}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-full border border-[#0b6b45]/25 bg-[#f7f9f8] px-4 text-xs font-semibold text-[#0b6b45] transition hover:border-[#0b6b45]/40 hover:bg-[#e7f5ed] lg:w-auto"
                    >
                      Kimliği aç
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <DeletePatientButton
                      contactId={row.id}
                      patientName={row.name}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
