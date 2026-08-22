"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  markLeadAppointmentStatus,
  markLeadContacted,
  stampLeadContacted,
  updateLeadPipeline,
} from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { classifyAdPlatform, PLATFORM_LABEL } from "@/lib/crm/source-kind";
import {
  asLeadStatus,
  isLostLikeStatus,
  LEAD_STATUS_FILTERS,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  statusesForFilter,
  type LeadStatusFilter,
} from "@/lib/crm/lead-status";

export type PipelineLead = {
  id: string;
  status: string | null;
  last_contacted_at: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  assigned_to: string | null;
  lost_reason: string | null;
  site: string | null;
  channel: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  created_at: string;
  contact_name: string | null;
  phone: string | null;
  assignee_name: string | null;
};

export type PipelineHistory = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  from_stage: string | null;
  to_stage: string | null;
  note: string | null;
  created_at: string;
  changer_name: string | null;
};

export type PipelineStaff = {
  id: string;
  full_name: string | null;
};

type SortKey = "newest" | "action";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

export function LeadPipelineBoard({
  leads,
  selectedId,
  history,
  staff,
  filter,
  query,
  sort,
  role,
}: {
  leads: PipelineLead[];
  selectedId: string | null;
  history: PipelineHistory[];
  staff: PipelineStaff[];
  filter: LeadStatusFilter;
  query: string;
  sort: SortKey;
  role: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [statusDraft, setStatusDraft] = useState<string | null>(null);

  const selected = leads.find((row) => row.id === selectedId) ?? null;
  const draftStatus = statusDraft ?? selected?.status ?? "yeni";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const allowed = statusesForFilter(filter);
    return leads.filter((row) => {
      if (allowed && !allowed.includes(asLeadStatus(row.status))) return false;
      if (!q) return true;
      return `${row.contact_name ?? ""} ${row.phone ?? ""}`.toLowerCase().includes(q);
    });
  }, [leads, filter, search]);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams();
    const nextFilter = patch.filter ?? filter;
    const nextSort = patch.sort ?? sort;
    const nextQ = patch.q === undefined ? search : patch.q;
    const nextLead = patch.lead === undefined ? selectedId : patch.lead;
    if (nextFilter && nextFilter !== "all") params.set("status", nextFilter);
    if (nextSort === "action") params.set("sort", "action");
    if (nextQ) params.set("q", nextQ);
    if (nextLead) params.set("lead", nextLead);
    const qs = params.toString();
    router.replace(qs ? `/admin/pipeline?${qs}` : "/admin/pipeline");
  }

  function openLead(id: string) {
    setStatusDraft(null);
    setParams({ lead: id });
  }

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setParams({ q: search });
        }}
        placeholder="Ad veya telefon ara…"
        aria-label="Taleplerde ara"
        className="min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setParams({ filter: item.id, lead: selectedId })}
              className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-xs font-semibold ${
                filter === item.id
                  ? "bg-[#0b6b45] text-white"
                  : "border border-[#0b6b45]/25 text-[#466254]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex w-full shrink-0 items-center gap-2 text-sm text-[#466254] sm:w-auto">
          <span className="font-medium">Sırala:</span>
          <select
            value={sort}
            onChange={(event) =>
              setParams({
                sort: event.target.value === "action" ? "action" : "newest",
              })
            }
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm font-semibold text-[#123524] outline-none focus:border-[#0b6b45] sm:flex-none"
          >
            <option value="newest">En yeni</option>
            <option value="action">Sıradaki aksiyon</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 sm:space-y-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#123524]/08 sm:bg-white">
        {!filtered.length ? (
          <p className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-12 text-center text-sm text-[#466254] sm:rounded-none sm:border-0">
            Bu filtrede talep yok.
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-[#123524]/08">
            {filtered.map((row) => {
              const active = row.id === selectedId;
              return (
                <div
                  key={row.id}
                  className={`flex flex-col gap-3 rounded-2xl border border-[#123524]/10 bg-white px-4 py-4 sm:rounded-none sm:border-0 sm:px-4 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                    active ? "bg-[#e7f5ed] sm:bg-[#e7f5ed]" : "sm:hover:bg-[#f7f9f8]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openLead(row.id)}
                    className="min-h-11 min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-[#123524] sm:text-sm">
                        {row.contact_name || "İsimsiz"}
                      </p>
                      <LeadStatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-[#466254]">{row.phone || "—"}</p>
                  </button>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <form action={markLeadContacted} className="flex-1 sm:flex-none">
                      <input type="hidden" name="lead_id" value={row.id} />
                      <button className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#0b6b45] px-3.5 text-xs font-semibold text-white sm:w-auto">
                        Ara / işaretle
                      </button>
                    </form>
                    <form action={markLeadAppointmentStatus} className="flex-1 sm:flex-none">
                      <input type="hidden" name="lead_id" value={row.id} />
                      <button className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[#0b6b45]/25 px-3.5 text-xs font-semibold text-[#0b6b45] sm:w-auto">
                        Randevu ver
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#123524]/40">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Paneli kapat"
            onClick={() => {
              setStatusDraft(null);
              setParams({ lead: null });
            }}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
            <header className="border-b border-[#123524]/08 px-5 py-4">
              <p className="text-xs font-semibold text-[#0b6b45]">Talep</p>
              <h2 className="mt-1 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold">
                {selected.contact_name || "İsimsiz talep"}
              </h2>
              <p className="text-sm text-[#466254]">{selected.phone}</p>
            </header>

            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap gap-1.5">
                <Tag>{classifyAdPlatform(selected) === "organic" ? "Organik" : PLATFORM_LABEL[classifyAdPlatform(selected)]}</Tag>
                {selected.utm_source ? <Tag>utm: {selected.utm_source}</Tag> : null}
                {selected.utm_campaign ? <Tag>{selected.utm_campaign}</Tag> : null}
                {selected.gclid ? <Tag>gclid</Tag> : null}
                {selected.fbclid ? <Tag>fbclid</Tag> : null}
                {selected.site ? <Tag>{selected.site}</Tag> : null}
              </div>

              <form action={updateLeadPipeline} className="space-y-4">
                <input type="hidden" name="lead_id" value={selected.id} />
                <label className="block text-sm font-medium">
                  Durum
                  <select
                    name="status"
                    value={draftStatus}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    className={input}
                  >
                    {LEAD_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {LEAD_STATUS_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </label>
                {isLostLikeStatus(draftStatus) ? (
                  <label className="block text-sm font-medium">
                    Kayıp / iptal sebebi
                    <input
                      name="lost_reason"
                      required
                      defaultValue={selected.lost_reason ?? ""}
                      placeholder="Neden kaybedildi?"
                      className={input}
                    />
                  </label>
                ) : null}
                <label className="block text-sm font-medium">
                  Sıradaki aksiyon tarihi
                  <input
                    type="date"
                    name="next_action_at"
                    defaultValue={selected.next_action_at ?? ""}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Aksiyon notu
                  <input
                    name="next_action_note"
                    defaultValue={selected.next_action_note ?? ""}
                    placeholder="Yarın tekrar ara"
                    className={input}
                  />
                </label>
                {role === "admin" || role === "assistant" ? (
                  <label className="block text-sm font-medium">
                    Ata
                    <select
                      name="assigned_to"
                      defaultValue={selected.assigned_to ?? ""}
                      className={input}
                    >
                      <option value="">Atanmamış</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="assigned_to" value={selected.assigned_to ?? ""} />
                )}
                <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#0b6b45] px-4 text-sm font-semibold text-white">
                  Kaydet
                </button>
              </form>

              <form action={stampLeadContacted}>
                <input type="hidden" name="lead_id" value={selected.id} />
                <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#0b6b45]/25 px-4 text-sm font-semibold text-[#0b6b45]">
                  Son teması şimdi işaretle
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/leads/${selected.id}`}
                  className="text-sm font-semibold text-[#0b6b45]"
                >
                  Tam kart →
                </Link>
                <Link
                  href={`/admin/messages?lead=${selected.id}`}
                  className="text-sm font-semibold text-[#0b6b45]"
                >
                  WhatsApp →
                </Link>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Durum geçmişi</h3>
                {!history.length ? (
                  <p className="mt-2 text-sm text-[#466254]">Henüz kayıt yok.</p>
                ) : (
                  <ol className="mt-3 space-y-3 border-l border-[#123524]/15 pl-4">
                    {history.map((item) => (
                      <li key={item.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0b6b45]" />
                        <p className="text-sm font-medium text-[#123524]">
                          {item.from_status
                            ? LEAD_STATUS_LABEL[asLeadStatus(item.from_status)]
                            : "—"}{" "}
                          →{" "}
                          {item.to_status
                            ? LEAD_STATUS_LABEL[asLeadStatus(item.to_status)]
                            : item.to_stage || "—"}
                        </p>
                        <p className="text-xs text-[#466254]">
                          {new Date(item.created_at).toLocaleString("tr-TR")}
                          {item.changer_name ? ` · ${item.changer_name}` : ""}
                        </p>
                        {item.note ? (
                          <p className="mt-0.5 text-xs text-[#466254]">{item.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#e7f5ed] px-2.5 py-1 text-[11px] font-semibold text-[#0b6b45]">
      {children}
    </span>
  );
}
