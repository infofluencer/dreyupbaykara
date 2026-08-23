import Link from "next/link";
import { UserPlus } from "lucide-react";
import {
  PatientsList,
  type PatientsListRow,
} from "@/components/admin/PatientsList";
import { requireAdminSession } from "@/lib/admin/auth";
import { pickActiveLead } from "@/lib/crm/lead-status";
import {
  LEAD_STATUS_FILTERS,
  type LeadStatusFilter,
} from "@/lib/crm/lead-status";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const params = await searchParams;
  const initialQuery = params.q?.trim() || "";
  const initialFilter: LeadStatusFilter = LEAD_STATUS_FILTERS.some(
    (item) => item.id === params.status,
  )
    ? (params.status as LeadStatusFilter)
    : "all";
  const supabase = await createClient();

  const { data: patients, error } = await supabase
    .from("contacts")
    .select(
      "id, name, phone, patient_no, birth_date, national_id, city, updated_at",
    )
    .eq("is_patient", true)
    .order("updated_at", { ascending: false })
    .limit(200);

  const contactIds = (patients ?? []).map((patient) => patient.id);
  const { data: leadRows } = contactIds.length
    ? await supabase
        .from("leads")
        .select(
          "id, contact_id, stage, status, lost_reason, needs_followup, created_at",
        )
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false })
    : { data: [] as never[] };

  const leadsByContact = new Map<
    string,
    Array<{
      id: string;
      stage: string;
      status: string;
      lost_reason: string | null;
      needs_followup: boolean | null;
      created_at: string;
    }>
  >();
  for (const lead of leadRows ?? []) {
    if (!lead.contact_id) continue;
    const list = leadsByContact.get(lead.contact_id) ?? [];
    list.push(lead);
    leadsByContact.set(lead.contact_id, list);
  }

  const rows: PatientsListRow[] = (patients ?? []).map((patient) => {
    const activeLead = pickActiveLead(leadsByContact.get(patient.id) ?? []);
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      patient_no: patient.patient_no,
      birth_date: patient.birth_date,
      city: patient.city,
      activeLead: activeLead
        ? {
            id: activeLead.id,
            status: activeLead.status,
            lost_reason: activeLead.lost_reason,
            needs_followup: activeLead.needs_followup ?? false,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold sm:text-2xl">
            Hastalar
          </h1>
          <p className="mt-1 text-sm text-[#466254]">
            Hasta kimliği, klinik notlar ve takvim randevuları burada.
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

      {error ? (
        <div className="space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <p>{error.message}</p>
          <p>
            Hasta kolonları yoksa Supabase SQL Editor’da{" "}
            <code>supabase/migrations/20260808160000_patients.sql</code> ve{" "}
            <code>
              supabase/migrations/20260823190000_contacts_is_patient.sql
            </code>{" "}
            dosyalarını çalıştırın.
          </p>
        </div>
      ) : (
        <PatientsList
          rows={rows}
          initialFilter={initialFilter}
          initialQuery={initialQuery}
        />
      )}
    </div>
  );
}
