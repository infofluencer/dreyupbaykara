import Link from "next/link";
import { notFound } from "next/navigation";
import { createPatientNote, updatePatient } from "@/app/admin/actions";
import { DeletePatientNoteButton } from "@/components/admin/DeletePatientNoteButton";
import { PatientSourceCard } from "@/components/admin/PatientSourceCard";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/crm/labels";
import { durationMinutes, formatDurationTr } from "@/lib/crm/duration";
import {
  PATIENT_GENDER_LABEL,
  PATIENT_NOTE_KIND_LABEL,
  formatPatientNo,
  patientAge,
} from "@/lib/crm/patient";
import { appointmentEndIso } from "@/lib/crm/schedule";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import { formatDateLongTr, formatTimeTr } from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-3 text-base outline-none focus:border-[#0b6b45]";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const { id } = await params;
  const todayYmd = await getIstanbulTodayYmd();
  const supabase = await createClient();

  const [{ data: patient, error }, { data: notes }, { data: leads }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase
        .from("patient_notes")
        .select("*, profiles:created_by(full_name)")
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select(
          "id, stage, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, lead_ref, created_at",
        )
        .eq("contact_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (error || !patient) notFound();

  const leadIds = (leads ?? []).map((lead) => lead.id);
  const leadRefs = (leads ?? [])
    .map((lead) => lead.lead_ref)
    .filter((ref): ref is string => Boolean(ref));
  const activeLead =
    (leads ?? []).find(
      (lead) => !["won", "lost", "spam"].includes(lead.stage),
    ) ?? leads?.[0];

  const [{ data: appointments }, { data: sourceClicks }] = await Promise.all([
    leadIds.length
      ? supabase
          .from("appointments")
          .select("id, title, starts_at, ends_at, status, appointment_type")
          .in("lead_id", leadIds)
          .neq("status", "cancelled")
          .order("starts_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    leadIds.length || leadRefs.length
      ? (() => {
          const query = supabase
            .from("lead_sources")
            .select(
              "lead_ref, site, page_path, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, created_at",
            )
            .order("created_at", { ascending: true });
          if (leadIds.length && leadRefs.length) {
            return query.or(
              `matched_lead_id.in.(${leadIds.join(",")}),lead_ref.in.(${leadRefs.join(",")})`,
            );
          }
          if (leadIds.length) return query.in("matched_lead_id", leadIds);
          return query.in("lead_ref", leadRefs);
        })()
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const age = patientAge(patient.birth_date);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/patients"
            className="text-sm font-medium text-[#0b6b45]"
          >
            ← Hastalar
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
            {patient.name || "İsimsiz hasta"}
          </h1>
          <p className="mt-1 text-sm text-[#466254]">
            {formatPatientNo(patient.patient_no)} · {patient.phone}
            {age ? ` · ${age} yaş` : ""}
            {patient.gender
              ? ` · ${PATIENT_GENDER_LABEL[patient.gender] ?? patient.gender}`
              : ""}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {activeLead ? (
            <Link
              href={`/admin/leads?lead=${activeLead.id}&date=${todayYmd}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#0b6b45] px-4 text-sm font-semibold text-white sm:w-auto sm:min-h-10"
            >
              Takvime randevu yaz
            </Link>
          ) : null}
          <Link
            href={`/admin/messages?lead=${activeLead?.id ?? ""}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#0b6b45]/25 px-4 text-sm font-semibold text-[#0b6b45] sm:w-auto sm:min-h-10"
          >
            WhatsApp
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Hasta kimliği</h2>
          <p className="mt-1 text-sm text-[#466254]">
            Kimlik bilgisi takvim randevularına bağlıdır. Aynı telefon = aynı
            hasta.
          </p>
          <form action={updatePatient} className="mt-5 space-y-4">
            <input type="hidden" name="contact_id" value={patient.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad soyad">
                <input
                  name="name"
                  required
                  defaultValue={patient.name ?? ""}
                  className={input}
                />
              </Field>
              <Field label="Telefon">
                <input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={patient.phone}
                  className={input}
                />
              </Field>
              <Field label="T.C. kimlik no">
                <input
                  name="national_id"
                  defaultValue={patient.national_id ?? ""}
                  className={input}
                />
              </Field>
              <Field label="Doğum tarihi">
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={patient.birth_date ?? ""}
                  className={input}
                />
              </Field>
              <Field label="Cinsiyet">
                <select
                  name="gender"
                  defaultValue={patient.gender ?? ""}
                  className={input}
                >
                  <option value="">Belirtilmedi</option>
                  <option value="female">Kadın</option>
                  <option value="male">Erkek</option>
                  <option value="other">Diğer</option>
                </select>
              </Field>
              <Field label="Şehir">
                <input
                  name="city"
                  defaultValue={patient.city ?? ""}
                  className={input}
                />
              </Field>
            </div>
            <Field label="Adres">
              <input
                name="address"
                defaultValue={patient.address ?? ""}
                className={input}
              />
            </Field>
            <Field label="Alerji / dikkat">
              <input
                name="allergies"
                defaultValue={patient.allergies ?? ""}
                className={input}
              />
            </Field>
            <Field label="Klinik özet">
              <textarea
                name="summary"
                rows={4}
                defaultValue={patient.summary ?? ""}
                placeholder="Tanı, ameliyat öyküsü, önemli uyarılar"
                className={input}
              />
            </Field>
            <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b6b45] px-6 text-sm font-semibold text-white">
              Kimliği kaydet
            </button>
          </form>
          <PatientSourceCard
            leads={leads ?? []}
            clicks={sourceClicks ?? []}
          />
        </section>

        <section className="rounded-2xl border border-[#0b6b45]/20 bg-white p-5">
          <h2 className="text-lg font-semibold">Hasta notları</h2>
          <p className="mt-1 text-sm text-[#466254]">
            Klinik / ameliyat notları. Takvim randevu notundan ayrıdır; hasta
            dosyasında kalır.
          </p>
          <form action={createPatientNote} className="mt-4 space-y-3">
            <input type="hidden" name="contact_id" value={patient.id} />
            <select name="kind" defaultValue="clinical" className={input}>
              <option value="clinical">Klinik not</option>
              <option value="surgery">Ameliyat notu</option>
              <option value="followup">Kontrol notu</option>
              <option value="admin">İdari not</option>
            </select>
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Muayene bulgusu, ameliyat notu, kontrol planı..."
              className={input}
            />
            <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#123524] px-5 text-sm font-semibold text-white">
              Not ekle
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {!notes?.length ? (
              <p className="rounded-xl bg-[#f4f6f5] px-4 py-3 text-sm text-[#466254]">
                Henüz not yok.
              </p>
            ) : (
              notes.map((note) => {
                const author = Array.isArray(note.profiles)
                  ? note.profiles[0]
                  : note.profiles;
                return (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-[#123524]/08 bg-[#f7f9f8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0b6b45]">
                          {PATIENT_NOTE_KIND_LABEL[note.kind] ?? note.kind}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#123524]">
                          {note.body}
                        </p>
                        <p className="mt-2 text-xs text-[#6b7d73]">
                          {new Date(note.created_at).toLocaleString("tr-TR", {
                            timeZone: "Europe/Istanbul",
                          })}
                          {author?.full_name ? ` · ${author.full_name}` : ""}
                        </p>
                      </div>
                      <DeletePatientNoteButton
                        id={note.id}
                        contactId={patient.id}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Takvim randevuları</h2>
            <p className="mt-1 text-sm text-[#466254]">
              Bu hastanın klinik takvimindeki tüm saatler.
            </p>
          </div>
          {activeLead ? (
            <Link
              href={`/admin/leads?lead=${activeLead.id}&date=${todayYmd}`}
              className="text-sm font-semibold text-[#0b6b45]"
            >
              Takvimi aç →
            </Link>
          ) : null}
        </div>
        {!appointments?.length ? (
          <p className="mt-4 text-sm text-[#466254]">
            Bu hastanın henüz randevusu yok.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {appointments.map((appointment) => {
              const end = appointmentEndIso(
                appointment.starts_at,
                appointment.ends_at,
              );
              return (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f6f5] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold capitalize">
                      {formatDateLongTr(appointment.starts_at)} ·{" "}
                      {formatTimeTr(appointment.starts_at)} –{" "}
                      {formatTimeTr(end)}
                    </p>
                    <p className="text-xs text-[#466254]">
                      {formatDurationTr(
                        durationMinutes(
                          appointment.starts_at,
                          appointment.ends_at,
                        ),
                      )}{" "}
                      ·{" "}
                      {APPOINTMENT_TYPE_LABEL[appointment.appointment_type] ??
                        "Muayene"}{" "}
                      ·{" "}
                      {APPOINTMENT_STATUS_LABEL[appointment.status] ??
                        appointment.status}
                    </p>
                  </div>
                  <Link
                    href={`/admin/calendar/${appointment.id}`}
                    className="text-xs font-semibold text-[#0b6b45]"
                  >
                    Randevu detayı
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
