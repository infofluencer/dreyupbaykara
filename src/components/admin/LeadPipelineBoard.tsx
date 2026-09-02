"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setLeadStatus } from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import {
  asLeadStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/crm/lead-status";

export type PipelineLead = {
  id: string;
  status: string | null;
  needs_followup?: boolean | null;
  lost_reason: string | null;
  created_at: string;
  contact_name: string | null;
  phone: string | null;
};

function leadsSnapshotKey(leads: PipelineLead[]) {
  return leads
    .map((row) => `${row.id}:${row.status}:${row.needs_followup ? 1 : 0}`)
    .join("|");
}

/**
 * Salt genel bakış: 4 kolonlu kanban.
 * Günlük iş akışı WhatsApp'ta; burası sürükle-bırak ile durum günceller.
 */
export function LeadPipelineBoard({
  leads: initialLeads,
}: {
  leads: PipelineLead[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<LeadPipelineStatus>("yeni");
  const [, startTransition] = useTransition();
  const initialLeadsRef = useRef(initialLeads);
  initialLeadsRef.current = initialLeads;
  const snapshotKey = leadsSnapshotKey(initialLeads);

  useEffect(() => {
    setLeads(initialLeadsRef.current);
  }, [snapshotKey]);

  const byStatus = useMemo(() => {
    const map: Record<LeadPipelineStatus, PipelineLead[]> = {
      yeni: [],
      arandi: [],
      randevulu: [],
      bitti: [],
    };
    for (const row of leads) {
      map[asLeadStatus(row.status)].push(row);
    }
    for (const key of LEAD_STATUSES) {
      map[key].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return map;
  }, [leads]);

  function moveLead(leadId: string, next: LeadPipelineStatus) {
    const prev = leads.find((row) => row.id === leadId);
    if (!prev) return;
    const prevStatus = asLeadStatus(prev.status);
    if (prevStatus === next) return;

    setLeads((rows) =>
      rows.map((row) =>
        row.id === leadId
          ? {
              ...row,
              status: next,
              needs_followup: next === "arandi" ? row.needs_followup : false,
            }
          : row,
      ),
    );
    setError(null);

    startTransition(() => {
      void setLeadStatus(leadId, next).catch((err: unknown) => {
        setLeads((rows) =>
          rows.map((row) =>
            row.id === leadId
              ? {
                  ...row,
                  status: prev.status,
                  needs_followup: prev.needs_followup,
                }
              : row,
          ),
        );
        setError(
          err instanceof Error ? err.message : "Durum güncellenemedi.",
        );
      });
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#466254]">
        Genel bakış. Telefonda bir duruma dokunun; masaüstünde kartı
        sürükleyerek değiştirin. Günlük takip için{" "}
        <Link href="/admin/messages" className="font-semibold text-[#0b6b45]">
          WhatsApp
        </Link>
        .
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 xl:hidden"
        role="tablist"
        aria-label="Hasta durumu"
      >
        {LEAD_STATUSES.map((column) => (
          <button
            key={column}
            type="button"
            role="tab"
            aria-selected={mobileColumn === column}
            onClick={() => setMobileColumn(column)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
              mobileColumn === column
                ? "bg-[#123524] text-white"
                : "border border-[#123524]/15 bg-white text-[#466254]"
            }`}
          >
            {LEAD_STATUS_LABEL[column]}
            <span
              className={
                mobileColumn === column ? "text-white/80" : "text-[#466254]/80"
              }
            >
              {byStatus[column].length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        {LEAD_STATUSES.map((column) => (
          <section
            key={column}
            aria-label={LEAD_STATUS_LABEL[column]}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = dragId ?? event.dataTransfer.getData("text/lead-id");
              if (id) moveLead(id, column);
              setDragId(null);
            }}
            className={`min-h-[240px] flex-col rounded-2xl border border-[#123524]/10 bg-[#f7f9f8] ${
              column === mobileColumn ? "flex" : "hidden"
            } xl:flex`}
          >
            <header className="flex items-center justify-between gap-2 border-b border-[#123524]/08 px-3 py-2.5">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAD_STATUS_TONE[column]}`}
              >
                {LEAD_STATUS_LABEL[column]}
              </span>
              <span className="text-xs font-medium text-[#466254]">
                {byStatus[column].length}
              </span>
            </header>
            <ul className="flex flex-1 flex-col gap-2 p-2">
              {byStatus[column].length === 0 ? (
                <li className="px-2 py-6 text-center text-xs text-[#466254]">
                  Boş
                </li>
              ) : (
                byStatus[column].map((row) => (
                  <li key={row.id}>
                    <article
                      draggable
                      onDragStart={(event) => {
                        setDragId(row.id);
                        event.dataTransfer.setData("text/lead-id", row.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-xl border border-[#123524]/10 bg-white px-3 py-2.5 shadow-sm active:cursor-grabbing ${
                        dragId === row.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-[#123524]">
                          {row.contact_name || "İsimsiz"}
                        </p>
                        <LeadStatusBadge
                          status={row.status}
                          needsFollowup={row.needs_followup}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-[#466254]">
                        {row.phone || "—"}
                      </p>
                      <label
                        className="mt-2 block xl:hidden"
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <span className="sr-only">Durumu değiştir</span>
                        <select
                          value={asLeadStatus(row.status)}
                          onChange={(event) =>
                            moveLead(
                              row.id,
                              event.target.value as LeadPipelineStatus,
                            )
                          }
                          className="min-h-10 w-full rounded-lg border border-[#123524]/15 bg-white px-2 text-xs font-semibold text-[#123524]"
                        >
                          {LEAD_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {LEAD_STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={`/admin/messages?lead=${row.id}`}
                          className="text-[11px] font-semibold text-[#0b6b45]"
                        >
                          WhatsApp
                        </Link>
                        <Link
                          href={`/admin/leads/${row.id}`}
                          className="text-[11px] font-semibold text-[#0b6b45]"
                        >
                          Kart
                        </Link>
                      </div>
                    </article>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
