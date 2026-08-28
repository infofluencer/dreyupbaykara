import Link from "next/link";
import { notFound } from "next/navigation";
import { createPatientNote, updatePatient } from "@/app/admin/actions";
import { ClinicalFileCard } from "@/components/admin/ClinicalFileCard";
import { DeletePatientButton } from "@/components/admin/DeletePatientButton";
import { DeletePatientNoteButton } from "@/components/admin/DeletePatientNoteButton";
import { FormPendingShell } from "@/components/admin/FormPendingShell";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { PatientSourceCard } from "@/components/admin/PatientSourceCard";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/crm/labels";
import { durationMinutes, formatDurationTr } from "@/lib/crm/duration";
import { PATIENT_NOTE_KIND_LABEL, formatPatientNo } from "@/lib/crm/patient";
import { appointmentEndIso } from "@/lib/crm/schedule";
import { getIstanbulTodayYmd } from "@/lib/date/now";
import { formatDateLongTr, formatTimeTr } from "@/lib/date/tr";
import { pickActiveLead } from "@/lib/crm/lead-status";
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
      supabase
        .from("contacts")
        .select(
          "id, name, phone, patient_no, birth_date, national_id, gender, city, address, allergies, summary, is_patient, created_at, updated_at",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("patient_notes")
        .select(
          "id, kind, body, created_at, created_by, profiles:created_by(full_name)",
        )
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("leads")
        .select(
          "id, stage, status, lost_reason, needs_followup, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, lead_ref, created_at",
        )
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (error || !patient) notFound();

  const leadIds = (leads ?? []).map((lead) => lead.id);
  const leadRefs = (leads ?? [])
    .map((lead) => lead.lead_ref)
    .filter((ref): ref is string => Boolean(ref));
  const activeLead = pickActiveLead(leads ?? []);

  const [{ data: appointments }, { data: sourceClicks }] = await Promise.all([
    leadIds.length
      ? supabase
          .from("appointments")
          .select("id, title, starts_at, ends_at, status, appointment_type")
          .in("lead_id", leadIds)
          .neq("status", "cancelled")
          .order("starts_at", { ascending: false })
          .limit(100)
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

  const noteRows = notes ?? [];

  return (
    <div className="space-y-6">
      {/* 1 — Başlık şeridi */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/patients"
            className="text-sm font-medium text-[#0b6b45]"
          >
            ← Hastalar
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold text-[#123524]">
            {patient.name || "İsimsiz hasta"}
          </h1>
          <p className="mt-1 text-sm text-[#466254]">
            {formatPatientNo(patient.patient_no)} · {patient.phone}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {activeLead ? (
            <LeadStatusBadge
              status={activeLead.status}
              needsFollowup={activeLead.needs_followup}
            />
          ) : (
            <span className="text-xs text-[#466254]">Aktif talep yok</span>
          )}
          <Link
            href={`/admin/messages?lead=${activeLead?.id ?? ""}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#0b6b45]/25 px-4 text-sm font-semibold text-[#0b6b45]"
          >
            WhatsApp
          </Link>
        </div>
      </div>

      {/* 2 — Kimlik */}
      <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Kimlik
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Asistan hızlı girer. Aynı telefon = aynı hasta.
        </p>
        <form action={updatePatient} className="mt-5 space-y-4">
          <FormPendingShell className="space-y-4">
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
                inputMode="numeric"
                defaultValue={patient.national_id ?? ""}
                className={input}
              />
            </Field>
            <Field label="Şehir">
              <input
                name="city"
                defaultValue={patient.city ?? ""}
                placeholder="İstanbul"
                className={input}
              />
            </Field>
          </div>
          </FormPendingShell>
          <SubmitButton pendingLabel="Kimlik kaydediliyor…" className="px-6">
            Kimliği kaydet
          </SubmitButton>
        </form>
        <div className="mt-6 border-t border-[#123524]/08 pt-5">
          <PatientSourceCard leads={leads ?? []} clicks={sourceClicks ?? []} />
        </div>
      </section>

      {/* 3 — Klinik dosya (kapalı başlar) */}
      <ClinicalFileCard noteCount={noteRows.length}>
        <p className="mb-4 text-sm text-[#466254]">
          Tarihli klinik notlar. Alerji veya özet için ayrı kutu yok — not
          olarak yazın.
        </p>
        <form action={createPatientNote} className="space-y-3">
          <FormPendingShell className="space-y-3">
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
            placeholder="Örn. alerji: penisilin · muayene bulgusu · ameliyat öyküsü"
            className={input}
          />
          </FormPendingShell>
          <SubmitButton variant="dark" pendingLabel="Not ekleniyor…">
            Not ekle
          </SubmitButton>
        </form>

        <div className="mt-5 space-y-3">
          {!noteRows.length ? (
            <p className="rounded-xl bg-[#f4f6f5] px-4 py-3 text-sm text-[#466254]">
              Henüz not yok.
            </p>
          ) : (
            noteRows.map((note) => {
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
      </ClinicalFileCard>

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

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <h2 className="text-lg font-semibold text-red-900">Hastayı sil</h2>
        <p className="mt-1 max-w-xl text-sm text-red-900/80">
          Hastalar listesinden kaldırır. WhatsApp konuşması, talepler ve
          randevular silinmez; aynı telefonla yeniden hasta eklenebilir.
        </p>
        <div className="mt-4">
          <DeletePatientButton
            contactId={patient.id}
            patientName={patient.name}
            variant="danger"
          />
        </div>
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
