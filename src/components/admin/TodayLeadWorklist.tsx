import Link from "next/link";
import {
  markLeadAppointmentStatus,
  markLeadContacted,
} from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";

export type TodayLeadRow = {
  id: string;
  status: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  contact_name: string | null;
  phone: string | null;
};

export function TodayLeadWorklist({
  yeni,
  bugun,
  geciken,
}: {
  yeni: TodayLeadRow[];
  bugun: TodayLeadRow[];
  geciken: TodayLeadRow[];
}) {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Bugün ne yapılmalı
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Asistan iş listesi — ara veya randevu olarak işaretleyin.
          </p>
        </div>
        <Link
          href="/admin/pipeline"
          className="text-sm font-semibold text-[#0b6b45]"
        >
          Tüm talepler →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <WorkColumn
          title="Yeni lead’ler"
          hint="Hiç aranmamış"
          empty="Yeni bekleyen yok"
          rows={yeni}
        />
        <WorkColumn
          title="Bugün aranacaklar"
          hint="Sıradaki aksiyon bugün veya önce"
          empty="Bugün aranacak yok"
          rows={bugun}
        />
        <WorkColumn
          title="Geciken takipler"
          hint="Tarihi geçmiş, hâlâ açık"
          empty="Gecikme yok"
          rows={geciken}
          delayed
        />
      </div>
    </section>
  );
}

function WorkColumn({
  title,
  hint,
  empty,
  rows,
  delayed,
}: {
  title: string;
  hint: string;
  empty: string;
  rows: TodayLeadRow[];
  delayed?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        delayed ? "border-amber-200 bg-amber-50/60" : "border-[#123524]/08 bg-[#f7f9f8]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[#123524]">{title}</p>
        <span className="text-xs font-bold text-[#0b6b45]">{rows.length}</span>
      </div>
      <p className="mt-0.5 text-xs text-[#466254]">{hint}</p>
      {!rows.length ? (
        <p className="mt-4 text-sm text-[#466254]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 8).map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-[#123524]/08 bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/pipeline?lead=${row.id}`}
                  className="min-w-0 font-semibold text-[#123524] hover:text-[#0b6b45]"
                >
                  {row.contact_name || row.phone || "İsimsiz"}
                </Link>
                <LeadStatusBadge status={row.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-[#466254]">
                {row.phone}
                {row.next_action_note ? ` · ${row.next_action_note}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <form action={markLeadContacted}>
                  <input type="hidden" name="lead_id" value={row.id} />
                  <button className="rounded-full bg-[#0b6b45] px-3 py-1 text-[11px] font-semibold text-white">
                    Ara / işaretle
                  </button>
                </form>
                <form action={markLeadAppointmentStatus}>
                  <input type="hidden" name="lead_id" value={row.id} />
                  <button className="rounded-full border border-[#0b6b45]/25 px-3 py-1 text-[11px] font-semibold text-[#0b6b45]">
                    Randevu ver
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
