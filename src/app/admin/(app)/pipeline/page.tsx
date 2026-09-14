import Link from "next/link";
import { UserPlus } from "lucide-react";
import { LeadPipelineBoard } from "@/components/admin/LeadPipelineBoard";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPipelinePage() {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();

  const { data: leadRows, error } = await supabase
    .from("leads")
    .select(
      `
      id, status, needs_followup, lost_reason, created_at,
      contacts!inner(name, phone, is_patient)
    `,
    )
    .eq("contacts.is_patient", true)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Durum panosu yüklenemedi. Migration{" "}
        <code>20260824120000_simplify_lead_statuses.sql</code> ve{" "}
        <code>20260911140000_lead_statuses_surgery_exam.sql</code> uygulandı mı?
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
            Hastanın hangi aşamada olduğunun genel görünümü. Günlük iş WhatsApp
            üzerinden yürür.
          </p>
        </div>
        <Link
          href="/admin/patients/new"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white sm:w-auto sm:min-h-10"
        >
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          Yeni hasta
        </Link>
      </div>
      <LeadPipelineBoard leads={leads} />
    </div>
  );
}
