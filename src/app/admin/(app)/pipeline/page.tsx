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
        <code>20260824120000_simplify_lead_statuses.sql</code> uygulandı mı?
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
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-2xl">
          Durum Panosu
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#466254]">
          Dört durumun genel görünümü. Günlük iş WhatsApp üzerinden yürür.
        </p>
      </div>
      <LeadPipelineBoard leads={leads} />
    </div>
  );
}
