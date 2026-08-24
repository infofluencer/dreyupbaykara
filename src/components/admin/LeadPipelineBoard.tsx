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
        Genel bakış. Kartı sürükleyerek durum değiştirin. Günlük takip için{" "}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            className="flex min-h-[240px] flex-col rounded-2xl border border-[#123524]/10 bg-[#f7f9f8]"
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
