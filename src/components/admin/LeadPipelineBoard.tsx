"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  stampLeadContacted,
  updateLeadPipeline,
} from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import {
  classifyAdPlatform,
  PLATFORM_LABEL,
} from "@/lib/crm/source-kind";
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
  "mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]";

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
      <div className="flex flex-col gap-3 rounded-2xl border border-[#123524]/08 bg-white p-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setParams({ q: search });
          }}
          placeholder="Ad veya telefon ara…"
          aria-label="Taleplerde ara"
          className="w-full rounded-xl border border-[#123524]/15 px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
        />
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setParams({ filter: item.id, lead: selectedId })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === item.id
                  ? "bg-[#0b6b45] text-white"
                  : "border border-[#0b6b45]/25 text-[#466254]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParams({ sort: "newest" })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              sort === "newest"
                ? "bg-[#123524] text-white"
                : "border border-[#123524]/15 text-[#466254]"
            }`}
          >
            En yeni
          </button>
          <button
            type="button"
            onClick={() => setParams({ sort: "action" })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              sort === "action"
                ? "bg-[#123524] text-white"
                : "border border-[#123524]/15 text-[#466254]"
            }`}
          >
            Sıradaki aksiyon
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#123524]/08 bg-white">
        {!filtered.length ? (
          <p className="px-5 py-12 text-center text-sm text-[#466254]">
            Bu filtrede talep yok.
          </p>
        ) : (
          <div className="divide-y divide-[#123524]/08">
            {filtered.map((row) => {
              const platform = classifyAdPlatform(row);
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openLead(row.id)}
                  className={`grid w-full grid-cols-1 gap-2 px-4 py-3.5 text-left transition hover:bg-[#f7f9f8] sm:grid-cols-[1.3fr_.7fr_.9fr_.8fr_.8fr] sm:items-center ${
                    active ? "bg-[#e7f5ed]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#123524]">
                      {row.contact_name || "İsimsiz"}
                    </p>
                    <p className="text-xs text-[#466254]">{row.phone}</p>
                  </div>
                  <span className="w-fit rounded-full bg-[#f4f6f5] px-2.5 py-0.5 text-[11px] font-semibold text-[#466254]">
                    {PLATFORM_LABEL[platform]}
                  </span>
                  <LeadStatusBadge status={row.status} />
                  <p className="text-xs text-[#466254]">
                    {row.last_contacted_at
                      ? new Date(row.last_contacted_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                  <p className="text-xs text-[#466254]">
                    {row.next_action_at || "—"}
                    {row.assignee_name ? ` · ${row.assignee_name}` : ""}
                  </p>
                </button>
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
                <button className="w-full rounded-full bg-[#0b6b45] py-2.5 text-sm font-semibold text-white">
                  Kaydet
                </button>
              </form>

              <form action={stampLeadContacted}>
                <input type="hidden" name="lead_id" value={selected.id} />
                <button className="w-full rounded-full border border-[#0b6b45]/25 py-2.5 text-sm font-semibold text-[#0b6b45]">
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
