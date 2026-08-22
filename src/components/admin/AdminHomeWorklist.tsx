import Link from "next/link";
import {
  markLeadAppointmentStatus,
  markLeadContacted,
} from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import type { TodayLeadRow } from "@/components/admin/TodayLeadWorklist";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import { loadTodayLeadWorklist } from "@/lib/crm/today-leads";
import { getIstanbulTodayYmd } from "@/lib/date/now";

export function AdminHomeWorklistFallback() {
  return (
    <section
      className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5"
      aria-busy="true"
      aria-label="Bugün aranacaklar yükleniyor"
    >
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-4 h-4 w-64" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </section>
  );
}

export async function AdminHomeWorklist() {
  const todayYmd = await getIstanbulTodayYmd();
  let todayWork = { yeni: [], bugun: [], geciken: [] } as Awaited<
    ReturnType<typeof loadTodayLeadWorklist>
  >;
  try {
    todayWork = await loadTodayLeadWorklist(todayYmd);
  } catch {
    /* migration henüz yoksa özet yine açılsın */
  }
  const callList = mergeTodayCalls(todayWork);

  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Bugün aranacaklar
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Gecikenler üstte. Ara veya randevu olarak işaretleyin.
          </p>
        </div>
        <Link
          href="/admin/pipeline"
          className="text-sm font-semibold text-[#0b6b45]"
        >
          Tüm talepler →
        </Link>
      </div>
      {!callList.length ? (
        <p className="mt-8 pb-2 text-center text-sm text-[#466254]">
          Bugün aranacak kimse yok 👍
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#123524]/08">
          {callList.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/pipeline?lead=${row.id}`}
                    className="font-semibold text-[#123524] hover:text-[#0b6b45]"
                  >
                    {row.contact_name || row.phone || "İsimsiz"}
                  </Link>
                  <LeadStatusBadge status={row.status} />
                  {row.delayed ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      Gecikmiş
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-[#466254]">
                  {row.phone}
                  {row.next_action_note ? ` · ${row.next_action_note}` : ""}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-1.5">
                <form action={markLeadContacted} className="flex-1 sm:flex-none">
                  <input type="hidden" name="lead_id" value={row.id} />
                  <button className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#0b6b45] px-3.5 text-xs font-semibold text-white sm:w-auto">
                    Ara / işaretle
                  </button>
                </form>
                <form
                  action={markLeadAppointmentStatus}
                  className="flex-1 sm:flex-none"
                >
                  <input type="hidden" name="lead_id" value={row.id} />
                  <button className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[#0b6b45]/25 px-3.5 text-xs font-semibold text-[#0b6b45] sm:w-auto">
                    Randevu ver
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function mergeTodayCalls(todayWork: {
  yeni: TodayLeadRow[];
  bugun: TodayLeadRow[];
  geciken: TodayLeadRow[];
}) {
  const seen = new Set<string>();
  const list: Array<TodayLeadRow & { delayed?: boolean }> = [];
  for (const row of todayWork.geciken) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push({ ...row, delayed: true });
  }
  for (const row of todayWork.bugun) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push(row);
  }
  for (const row of todayWork.yeni) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    list.push(row);
  }
  return list;
}
