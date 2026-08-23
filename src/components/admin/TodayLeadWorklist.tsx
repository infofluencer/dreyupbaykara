import Link from "next/link";
import { markLeadContacted } from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { planHref } from "@/components/admin/schedule/href";

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
  todayYmd,
}: {
  yeni: TodayLeadRow[];
  bugun: TodayLeadRow[];
  geciken: TodayLeadRow[];
  todayYmd: string;
}) {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Bugün ne yapılmalı
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Asistan iş listesi — ara veya takvimden randevu verin.
          </p>
        </div>
        <Link
          href="/admin/pipeline"
          className="text-sm font-semibold text-[#0b6b45]"
        >
          Durum panosu →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <WorkColumn
          title="Yeni lead’ler"
          hint="Hiç aranmamış"
          empty="Yeni bekleyen yok"
          rows={yeni}
          todayYmd={todayYmd}
        />
        <WorkColumn
          title="Bugün aksiyon"
          hint="Sıradaki tarih bugün"
          empty="Bugün aksiyon yok"
          rows={bugun}
          todayYmd={todayYmd}
        />
        <WorkColumn
          title="Geciken"
          hint="Tarihi geçmiş"
          empty="Geciken yok"
          rows={geciken}
          todayYmd={todayYmd}
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
  todayYmd,
  delayed,
}: {
  title: string;
  hint: string;
  empty: string;
  rows: TodayLeadRow[];
  todayYmd: string;
  delayed?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#123524]/08 bg-[#f7f9f8] p-3">
      <h3 className="text-sm font-semibold text-[#123524]">{title}</h3>
      <p className="mt-0.5 text-xs text-[#466254]">{hint}</p>
      {!rows.length ? (
        <p className="mt-4 text-center text-xs text-[#466254]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-[#123524]/08 bg-white px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/admin/messages?lead=${row.id}`}
                  className="truncate text-sm font-semibold text-[#123524] hover:text-[#0b6b45]"
                >
                  {row.contact_name || row.phone || "İsimsiz"}
                </Link>
                <LeadStatusBadge status={row.status} />
                {delayed ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    Gecikmiş
                  </span>
                ) : null}
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
                <Link
                  href={planHref({ date: todayYmd, lead: row.id })}
                  className="rounded-full border border-[#0b6b45]/25 px-3 py-1 text-[11px] font-semibold text-[#0b6b45]"
                >
                  Randevu ver
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
