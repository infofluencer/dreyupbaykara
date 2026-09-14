"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setLeadStatus } from "@/app/admin/actions";
import {
  asLeadStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_SURFACE,
  LEAD_STATUS_TONE,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/crm/lead-status";

const CARD_LINK_BASE =
  "inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-3 text-[11px] font-semibold xl:min-h-8 xl:px-2";
const CARD_LINK_PRIMARY = `${CARD_LINK_BASE} bg-[#0b6b45] text-white active:bg-[#095538]`;
const CARD_LINK_SECONDARY = `${CARD_LINK_BASE} border border-[#0b6b45]/30 bg-white text-[#0b6b45] active:bg-[#e7f5ed]`;

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
 * Salt genel bakış. Masaüstünde 7 kolonlu kanban (sürükle-bırak),
 * mobilde aynı durumlar tek akışta yapışkan başlıklarla alt alta;
 * durum kartın içindeki menüden değişir.
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
    const map = Object.fromEntries(
      LEAD_STATUSES.map((key) => [key, [] as PipelineLead[]]),
    ) as Record<LeadPipelineStatus, PipelineLead[]>;
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

  /** "Ulaşılamadı, tekrar ara" — durumu değiştirmez, yalnızca takip işareti. */
  function toggleFollowup(leadId: string, next: boolean) {
    const prev = leads.find((row) => row.id === leadId);
    if (!prev) return;

    setLeads((rows) =>
      rows.map((row) =>
        row.id === leadId ? { ...row, needs_followup: next } : row,
      ),
    );
    setError(null);

    startTransition(() => {
      void setLeadStatus(leadId, "arandi", { needsFollowup: next }).catch(
        (err: unknown) => {
          setLeads((rows) =>
            rows.map((row) =>
              row.id === leadId
                ? { ...row, needs_followup: prev.needs_followup }
                : row,
            ),
          );
          setError(
            err instanceof Error
              ? err.message
              : "Takip işareti güncellenemedi.",
          );
        },
      );
    });
  }

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
        Genel bakış. Telefonda karttaki durum menüsünü kullanın; masaüstünde
        kartı kolonlar arasında sürükleyin. Günlük takip için{" "}
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

      {leads.length === 0 ? (
        <p className="rounded-2xl border border-[#123524]/10 bg-white px-5 py-10 text-center text-sm text-[#466254]">
          Panoda hasta yok. Yeni hasta ekleyin; talep oluştukça buraya düşer.
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5 xl:grid xl:grid-cols-7 xl:gap-3">
        {LEAD_STATUSES.map((column) => {
          const rows = byStatus[column];
          const empty = rows.length === 0;
          return (
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
              className={`flex flex-col rounded-2xl border xl:min-h-[240px] ${LEAD_STATUS_SURFACE[column]}`}
            >
              {/* Başlık bloğun koyu tonu; mobilde yapışkan, kaydırırken hangi
                  aşamada olduğunuz üstte kalır. */}
              <header
                className={`sticky top-14 z-10 flex items-center justify-between gap-2 px-3 py-2.5 lg:top-0 xl:static ${
                  LEAD_STATUS_TONE[column]
                } ${
                  empty
                    ? "rounded-2xl xl:rounded-b-none"
                    : "rounded-t-2xl"
                }`}
              >
                <span className="truncate text-xs font-semibold">
                  {LEAD_STATUS_LABEL[column]}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums opacity-70">
                  {empty ? (
                    <>
                      <span className="xl:hidden">Boş</span>
                      <span className="hidden xl:inline">0</span>
                    </>
                  ) : (
                    rows.length
                  )}
                </span>
              </header>

              {empty ? (
                <p className="hidden flex-1 items-center justify-center px-2 py-6 text-center text-xs text-[#466254] xl:flex">
                  Boş
                </p>
              ) : (
                <ul className="grid flex-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-col">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <article
                        draggable
                        onDragStart={(event) => {
                          setDragId(row.id);
                          event.dataTransfer.setData("text/lead-id", row.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDragId(null)}
                        className={`rounded-xl border border-[#0b6b45] bg-white px-3 py-2.5 shadow-sm xl:cursor-grab xl:active:cursor-grabbing ${
                          dragId === row.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 truncate text-sm font-semibold text-[#123524]">
                            {row.contact_name || "İsimsiz"}
                          </p>
                          {column === "arandi" && row.needs_followup ? (
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-900">
                              Tekrar ara
                            </span>
                          ) : null}
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
                            className="min-h-10 w-full rounded-lg border border-[#0b6b45] bg-white px-2 text-xs font-semibold text-[#0b6b45]"
                          >
                            {LEAD_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {LEAD_STATUS_LABEL[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {column === "arandi" ? (
                          <label
                            className="mt-2 flex min-h-9 items-center gap-1.5 text-[11px] text-[#466254] xl:min-h-0"
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(row.needs_followup)}
                              onChange={(event) =>
                                toggleFollowup(row.id, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-[#123524]/30 accent-[#0b6b45]"
                            />
                            Ulaşılamadı, tekrar ara
                          </label>
                        ) : null}
                        <div className="mt-2 flex gap-2 xl:gap-1.5">
                          <Link
                            href={`/admin/messages?lead=${row.id}`}
                            className={CARD_LINK_PRIMARY}
                          >
                            WhatsApp
                          </Link>
                          <Link
                            href={`/admin/leads/${row.id}`}
                            className={CARD_LINK_SECONDARY}
                          >
                            Kart
                          </Link>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
