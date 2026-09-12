import Link from "next/link";
import { markLeadContacted } from "@/app/admin/actions";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import { planHref } from "@/components/admin/schedule/href";
import {
  EMPTY_WORKLIST,
  loadAdminHomeWorklist,
  type AdminHomeWorklistData,
  type LeadTask,
  type TodayAppointmentRow,
  type WaitingConversation,
} from "@/lib/crm/admin-home-worklist";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/crm/labels";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import { formatTimeTr } from "@/lib/date/tr";

export function AdminHomeWorklistFallback() {
  return (
    <section aria-busy="true" aria-label="Bugün yapılacaklar yükleniyor">
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-4 h-4 w-72" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#123524]/08 bg-white px-5 py-5"
          >
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, row) => (
                <Skeleton key={row} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function AdminHomeWorklist() {
  const todayYmd = await getIstanbulTodayYmd();
  let data: AdminHomeWorklistData = EMPTY_WORKLIST;
  try {
    data = await loadAdminHomeWorklist();
  } catch {
    /* tablo/migration eksikse özet yine açılsın */
  }

  const nothingToDo =
    data.waiting.total === 0 &&
    data.leads.total === 0 &&
    data.appointments.total === 0;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Bugün yapılacaklar
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Sırayla: bekleyen mesajları yanıtlayın, bugün gelen talepleri
            karşılayın, günün randevularını kontrol edin.
          </p>
        </div>
        {nothingToDo ? null : (
          <Link
            href="/admin/pipeline"
            className="text-sm font-semibold text-[#0b6b45]"
          >
            Durum panosu →
          </Link>
        )}
      </div>

      {nothingToDo ? (
        <div className="mt-4 rounded-2xl border border-[#123524]/08 bg-white px-5 py-8">
          <p className="text-center text-sm text-[#466254]">
            Bekleyen iş yok 👍 Yanıtlanmamış mesaj, yeni talep ve bugüne randevu
            bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <WaitingCard block={data.waiting} />
          <LeadsCard block={data.leads} todayYmd={todayYmd} />
          <AppointmentsCard block={data.appointments} todayYmd={todayYmd} />
        </div>
      )}
    </section>
  );
}

/* ── Bloklar ─────────────────────────────────────────────────────────── */

function WaitingCard({
  block,
}: {
  block: { rows: WaitingConversation[]; total: number };
}) {
  return (
    <Card
      title="Yanıt bekleyen mesajlar"
      hint="Son 24 saatte yazdı, cevap bekliyor · en yeni üstte"
      count={block.total}
      shown={block.rows.length}
      allHref="/admin/messages"
      empty="Yanıt bekleyen mesaj yok."
    >
      {block.rows.map((row) => (
        <li key={row.conversationId}>
          <Link
            href={`/admin/messages?c=${row.conversationId}`}
            className="block py-3 transition hover:bg-[#f4f6f5]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-[#123524]">
                {row.name || row.phone || "İsimsiz"}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {row.unreadCount > 0 ? (
                  <span className="rounded-full bg-[#0b6b45] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {row.unreadCount}
                  </span>
                ) : null}
                <span
                  className={`text-[11px] font-semibold ${
                    isClosingSoon(row.lastMessageAt)
                      ? "text-amber-700"
                      : "text-[#6b7d73]"
                  }`}
                >
                  {agoLabel(row.lastMessageAt)}
                </span>
              </span>
            </div>
            {row.preview ? (
              <p className="mt-0.5 truncate text-sm text-[#466254]">
                {row.preview}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </Card>
  );
}

function LeadsCard({
  block,
  todayYmd,
}: {
  block: { rows: LeadTask[]; total: number };
  todayYmd: string;
}) {
  return (
    <Card
      title="Bugün gelen talepler"
      hint="Henüz dokunulmamış yeni kayıtlar ve tekrar aranacaklar"
      count={block.total}
      shown={block.rows.length}
      allHref="/admin/pipeline"
      empty="Bugün yeni talep yok."
    >
      {block.rows.map((row) => (
        <li key={row.leadId} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/messages?lead=${row.leadId}`}
              className="truncate font-semibold text-[#123524] hover:text-[#0b6b45]"
            >
              {row.name || row.phone || "İsimsiz"}
            </Link>
            {row.reason === "tekrar" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                Tekrar ara
              </span>
            ) : (
              <span className="rounded-full bg-[#e7f5ed] px-2 py-0.5 text-[10px] font-semibold text-[#0b6b45]">
                Yeni
              </span>
            )}
          </div>
          {row.phone ? (
            <p className="mt-0.5 text-sm text-[#466254]">{row.phone}</p>
          ) : null}
          <div className="mt-2 flex gap-1.5">
            <form action={markLeadContacted} className="flex-1">
              <input type="hidden" name="lead_id" value={row.leadId} />
              <button className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-[#0b6b45] px-3 text-xs font-semibold text-white">
                Arandı işaretle
              </button>
            </form>
            <Link
              href={planHref({ date: todayYmd, lead: row.leadId })}
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full border border-[#0b6b45]/25 px-3 text-xs font-semibold text-[#0b6b45]"
            >
              Randevu ver
            </Link>
          </div>
        </li>
      ))}
    </Card>
  );
}

function AppointmentsCard({
  block,
  todayYmd,
}: {
  block: { rows: TodayAppointmentRow[]; total: number };
  todayYmd: string;
}) {
  return (
    <Card
      title="Bugünün randevuları"
      hint="Saat sırasına göre"
      count={block.total}
      shown={block.rows.length}
      allHref={planHref({ date: todayYmd })}
      empty="Bugün randevu yok."
    >
      {block.rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/admin/calendar/${row.id}`}
            className="block py-3 transition hover:bg-[#f4f6f5]"
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-lg bg-[#e7f5ed] px-2 py-1 text-xs font-bold text-[#0b6b45]">
                {formatTimeTr(row.startsAt)}
              </span>
              <span className="truncate font-semibold text-[#123524]">
                {row.name || row.phone || "İsimsiz"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[#466254]">
              {APPOINTMENT_TYPE_LABEL[row.appointmentType] ?? "Muayene"} ·{" "}
              {APPOINTMENT_STATUS_LABEL[row.status] ?? row.status}
            </p>
          </Link>
        </li>
      ))}
    </Card>
  );
}

/* ── Ortak kart ──────────────────────────────────────────────────────── */

function Card({
  title,
  hint,
  count,
  shown,
  allHref,
  empty,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  shown: number;
  allHref: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#123524]/08 bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold text-[#123524]">
            <span className="truncate">{title}</span>
            {count > 0 ? (
              <span className="shrink-0 rounded-full bg-[#123524]/08 px-2 py-0.5 text-xs font-bold text-[#123524]">
                {count}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs text-[#6b7d73]">{hint}</p>
        </div>
      </div>

      {count === 0 ? (
        <p className="mt-6 pb-2 text-center text-sm text-[#466254]">{empty}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-[#123524]/08">{children}</ul>
          {count > shown ? (
            <Link
              href={allHref}
              className="mt-3 text-xs font-semibold text-[#0b6b45]"
            >
              {count - shown} kayıt daha · tümünü aç →
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

/** "12 dk önce" · "3 sa önce" — pencere 24 saat olduğu için gün yok. */
function agoLabel(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 60_000) return "az önce";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} dk önce`;
  return `${Math.floor(minutes / 60)} sa önce`;
}

/** Serbest mesaj penceresinin kapanmasına 4 saatten az kaldı mı? */
function isClosingSoon(iso: string | null): boolean {
  if (!iso) return false;
  const diff = Date.now() - new Date(iso).getTime();
  return diff > 20 * 60 * 60 * 1000;
}
