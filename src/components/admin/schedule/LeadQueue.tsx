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
  return (
    <aside className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-[#123524]/10 bg-white lg:max-h-[calc(100vh-10rem)]">
      <div className="border-b border-[#123524]/08 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Hastalar</h2>
          <Link
            href="/admin/patients/new"
            className="rounded-full bg-[#0b6b45] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Yeni
          </Link>
        </div>
        <form className="mt-3 space-y-2">
          {view !== "day" ? <input type="hidden" name="view" value={view} /> : null}
          <input type="hidden" name="date" value={date} />
          <input
            name="q"
            defaultValue={search}
            placeholder="Ad veya telefon"
            className="w-full rounded-xl border border-[#123524]/15 px-3 py-2 text-sm"
          />
          <button className="w-full rounded-full border border-[#123524]/15 px-3 py-2 text-sm font-semibold">
            Ara
          </button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!leads.length ? (
          <p className="px-4 py-8 text-center text-sm text-[#466254]">
            Hasta yok. Sağdaki formdan ad ve telefonla randevu ekleyebilirsiniz.
          </p>
        ) : (
          leads.map((lead) => {
            const contact = firstRelation(lead.contacts);
            const selected = selectedLeadId === lead.id;
            return (
              <div
                key={lead.id}
                className={`border-b border-[#123524]/06 px-3 py-3 ${
                  selected ? "bg-[#e7f5ed]" : "hover:bg-[#f7f9f8]"
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
                  <p className="mt-1 text-xs text-[#466254]">{contact?.phone}</p>
                </Link>
                <Link
                  href={
                    contact?.id
                      ? `/admin/patients/${contact.id}`
                      : `/admin/leads/${lead.id}`
                  }
                  className="mt-2 inline-block text-[11px] font-semibold text-[#0b6b45]"
                >
                  Hasta kartı
                </Link>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
