"use client";

import { useState } from "react";
import Link from "next/link";
import { planHref, type PlanView } from "@/components/admin/schedule/href";
import type { ScheduleLead } from "@/components/admin/schedule/types";
import { firstRelation, STAGE_LABEL } from "@/lib/crm/labels";

const STAGE_TONE: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-800",
  contacted: "bg-blue-50 text-blue-800",
  qualified: "bg-violet-50 text-violet-800",
  appointment: "bg-amber-50 text-amber-800",
};

export function LeadQueue({
  leads,
  selectedLeadId,
  view,
  date,
  stage,
  search,
}: {
  leads: ScheduleLead[];
  selectedLeadId?: string;
  view: PlanView;
  date: string;
  stage: string;
  search: string;
}) {
  const selected = leads.find((lead) => lead.id === selectedLeadId);
  const selectedName = selected
    ? firstRelation(selected.contacts)?.name || "Seçili hasta"
    : null;
  const [open, setOpen] = useState(Boolean(selectedLeadId));

  return (
    <aside className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white xl:flex xl:max-h-[calc(100vh-10rem)] xl:min-h-[28rem] xl:flex-col">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left xl:hidden"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="font-semibold">
          Hastalar
          <span className="ml-2 text-sm font-medium text-[#466254]">
            ({leads.length})
          </span>
        </span>
        <span className="text-sm font-semibold text-[#0b6b45]">
          {open ? "Gizle" : selectedName ? selectedName : "Aç"}
        </span>
      </button>
      <div className="hidden border-b border-[#123524]/08 p-4 xl:block">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Hastalar</h2>
          <Link
            href="/admin/patients/new"
            className="rounded-full bg-[#0b6b45] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Yeni
          </Link>
        </div>
      </div>
      <div className={`${open ? "block" : "hidden"} xl:flex xl:min-h-0 xl:flex-1 xl:flex-col`}>
        <div className="border-b border-[#123524]/08 px-4 pb-4 xl:pt-0">
          <div className="mb-3 flex items-center justify-between xl:hidden">
            <Link
              href="/admin/patients/new"
              className="rounded-full bg-[#0b6b45] px-3 py-2 text-sm font-semibold text-white"
            >
              Yeni hasta
            </Link>
          </div>
          <form className="space-y-2">
            {view !== "day" ? (
              <input type="hidden" name="view" value={view} />
            ) : null}
            <input type="hidden" name="date" value={date} />
            <input
              name="q"
              defaultValue={search}
              placeholder="Ad veya telefon"
              className="min-h-12 w-full rounded-xl border border-[#123524]/15 px-3 py-3 text-base"
            />
            <button className="min-h-12 w-full rounded-full border border-[#123524]/15 px-3 text-sm font-semibold">
              Ara
            </button>
          </form>
        </div>
        <div className="max-h-72 overflow-y-auto xl:max-h-none xl:flex-1">
          {!leads.length ? (
            <p className="px-4 py-8 text-center text-sm text-[#466254]">
              Hasta yok. Formdan ad ve telefonla randevu ekleyebilirsiniz.
            </p>
          ) : (
            leads.map((lead) => {
              const contact = firstRelation(lead.contacts);
              const isSelected = selectedLeadId === lead.id;
              return (
                <div
                  key={lead.id}
                  className={`border-b border-[#123524]/06 px-4 py-3.5 ${
                    isSelected ? "bg-[#e7f5ed]" : "active:bg-[#f7f9f8]"
                  }`}
                >
                  <Link
                    href={planHref({
                      view,
                      date,
                      lead: lead.id,
                      q: search,
                      stage,
                    })}
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#123524]">
                        {contact?.name || "İsimsiz"}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          STAGE_TONE[lead.stage] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STAGE_LABEL[lead.stage] ?? lead.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#466254]">{contact?.phone}</p>
                  </Link>
                  <Link
                    href={
                      contact?.id
                        ? `/admin/patients/${contact.id}`
                        : `/admin/leads/${lead.id}`
                    }
                    className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#0b6b45]"
                  >
                    Hasta kartı
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
