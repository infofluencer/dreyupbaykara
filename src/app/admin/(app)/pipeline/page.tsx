import Link from "next/link";
import { Archive, LayoutGrid, UserPlus } from "lucide-react";
import { LeadPipelineBoard } from "@/components/admin/LeadPipelineBoard";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const params = await searchParams;
  const showArchive =
    params.archive === "1" || params.archive === "true";
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      `
      id, status, needs_followup, had_surgery, lost_reason, created_at,
      contacts!inner(name, phone, is_patient)
    `,
    )
    .eq("contacts.is_patient", true);

  query = showArchive
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const { data: leadRows, error } = await query
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Durum panosu yüklenemedi. Migration{" "}
        <code>20260824120000_simplify_lead_statuses.sql</code>,{" "}
        <code>20260911140000_lead_statuses_surgery_exam.sql</code>,{" "}
        <code>20260915140000_had_surgery_tag.sql</code> ve{" "}
        <code>20260916120000_lead_archive.sql</code> uygulandı mı?
        <br />
        <span className="mt-1 block text-xs opacity-80">{error.message}</span>
      </p>
    );
  }

  const leads = (leadRows ?? []).map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    return {
      id: row.id,
      status: row.status,
      needs_followup: row.needs_followup ?? false,
      had_surgery: row.had_surgery ?? false,
      lost_reason: row.lost_reason,
      created_at: row.created_at,
      contact_name: contact?.name ?? null,
      phone: contact?.phone ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-2xl">
            Durum Panosu
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#466254]">
            {showArchive
              ? "Arşivlenen hastalar. Kolonlar aynı; yalnızca arşive alınanlar görünür."
              : "Hastanın hangi aşamada olduğunun genel görünümü. Günlük iş WhatsApp üzerinden yürür."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-0.5 rounded-full bg-white p-0.5 ring-1 ring-[#123524]/10">
            <Link
              href="/admin/pipeline"
              aria-current={showArchive ? undefined : "page"}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:min-h-10 ${
                showArchive
                  ? "text-[#466254]"
                  : "bg-[#123524] text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
              Aktif
            </Link>
            <Link
              href="/admin/pipeline?archive=1"
              aria-current={showArchive ? "page" : undefined}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:min-h-10 ${
                showArchive
                  ? "bg-[#123524] text-white"
                  : "text-[#466254]"
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" aria-hidden />
              Arşiv
            </Link>
          </div>
          <Link
            href="/admin/patients/new"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white sm:w-auto sm:min-h-10"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            Yeni hasta
          </Link>
        </div>
      </div>
      <LeadPipelineBoard leads={leads} archivedView={showArchive} />
    </div>
  );
}
