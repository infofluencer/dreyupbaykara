import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatPatientNo, patientAge } from "@/lib/crm/patient";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const { q } = await searchParams;
  const search = q?.trim() || "";
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select(
      "id, name, phone, patient_no, birth_date, national_id, city, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (search) {
    const safe = search.replace(/[%(),]/g, " ").trim();
    const digits = safe.replace(/\D/g, "");
    const filters = [`name.ilike.%${safe}%`, `phone.ilike.%${safe}%`];
    if (digits) {
      filters.push(`phone.ilike.%${digits}%`);
      filters.push(`national_id.eq.${digits}`);
      if (/^\d+$/.test(digits)) filters.push(`patient_no.eq.${Number(digits)}`);
    }
    query = query.or(filters.join(","));
  }

  const { data: patients, error } = await query;

  return (
    <div className="space-y-5">
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

      <form className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={search}
          placeholder="Ad, telefon, TC veya hasta no"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#123524]/15 px-3 py-3 text-base"
        />
        <button className="min-h-12 rounded-full border border-[#123524]/15 px-4 text-sm font-semibold sm:px-5">
          Ara
        </button>
      </form>

      {error ? (
        <div className="space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <p>{error.message}</p>
          <p>
            Hasta kolonları yoksa Supabase SQL Editor’da{" "}
            <code>supabase/migrations/20260808160000_patients.sql</code>{" "}
            dosyasını çalıştırın.
          </p>
        </div>
      ) : null}

      {!patients?.length ? (
        <p className="rounded-2xl border border-[#123524]/10 bg-white p-5 text-sm text-[#466254]">
          {search
            ? "Eşleşen hasta yok."
            : "Henüz hasta yok. Yeni hasta ekleyin veya takvimden randevu yazın."}
        </p>
      ) : (
        <div className="space-y-3 sm:space-y-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#123524]/10 sm:bg-white sm:divide-y sm:divide-[#123524]/08">
          {patients.map((patient) => {
            const age = patientAge(patient.birth_date);
            return (
              <Link
                key={patient.id}
                href={`/admin/patients/${patient.id}`}
                className="flex min-h-16 flex-col gap-2 rounded-2xl border border-[#123524]/10 bg-white px-4 py-4 active:bg-[#f7f9f8] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-none sm:border-0 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold sm:text-sm">
                    {patient.name || "İsimsiz"}{" "}
                    <span className="text-xs font-semibold text-[#0b6b45]">
                      {formatPatientNo(patient.patient_no)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[#466254]">
                    {patient.phone || "Telefon yok"}
                    {age ? ` · ${age} yaş` : ""}
                    {patient.city ? ` · ${patient.city}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[#0b6b45]">
                  Kimliği aç →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
