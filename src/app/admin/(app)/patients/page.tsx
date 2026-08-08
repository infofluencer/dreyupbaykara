import Link from "next/link";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
            Hastalar
          </h1>
          <p className="mt-2 text-sm text-[#466254]">
            Hasta kimliği, klinik notlar ve takvim randevuları burada.
          </p>
        </div>
        <Link
          href="/admin/patients/new"
          className="rounded-full bg-[#0b6b45] px-4 py-2 text-sm font-semibold text-white"
        >
          Yeni hasta
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Ad, telefon, TC veya hasta no"
          className="min-w-64 flex-1 rounded-xl border border-[#123524]/15 px-3 py-2.5 text-sm"
        />
        <button className="rounded-full border border-[#123524]/15 px-4 py-2 text-sm font-semibold">
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

      <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
        {!patients?.length ? (
          <p className="p-5 text-sm text-[#466254]">
            {search
              ? "Eşleşen hasta yok."
              : "Henüz hasta yok. Yeni hasta ekleyin veya takvimden randevu yazın."}
          </p>
        ) : (
          <div className="divide-y divide-[#123524]/08">
            {patients.map((patient) => {
              const age = patientAge(patient.birth_date);
              return (
                <Link
                  key={patient.id}
                  href={`/admin/patients/${patient.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[#f7f9f8]"
                >
                  <div>
                    <p className="font-semibold">
                      {patient.name || "İsimsiz"}{" "}
                      <span className="text-xs font-semibold text-[#0b6b45]">
                        {formatPatientNo(patient.patient_no)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-[#466254]">
                      {patient.phone}
                      {age ? ` · ${age} yaş` : ""}
                      {patient.city ? ` · ${patient.city}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#0b6b45]">
                    Kimliği aç →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
