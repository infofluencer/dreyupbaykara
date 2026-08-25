import Link from "next/link";
import { notFound } from "next/navigation";
import { createTask, toggleTask, updateLead } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/crm/labels";
import { durationMinutes, formatDurationTr } from "@/lib/crm/duration";
import { appointmentEndIso } from "@/lib/crm/schedule";
import { getIstanbulNow } from "@/lib/date/now";
import { formatDateLongTr, formatTimeTr, istanbulYmd } from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

const STAGES = [
  ["new", "Yeni"],
  ["contacted", "İletişime geçildi"],
  ["qualified", "Nitelikli"],
  ["appointment", "Randevu"],
  ["won", "Sonuçlandı"],
  ["lost", "Kayıp"],
  ["spam", "Spam"],
] as const;

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const now = await getIstanbulNow();
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: lead },
    { data: profiles },
    { data: tasks },
    { data: appointments },
    { data: history },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, stage, status, lost_reason, needs_followup, site, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, lead_ref, notes, assigned_to, created_at, updated_at, contacts(id, phone, name)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["admin", "doctor", "assistant"])
      .order("full_name"),
    supabase
      .from("tasks")
      .select(
        "id, title, due_at, completed_at, assigned_to, profiles:assigned_to(full_name)",
      )
      .eq("lead_id", id)
      .order("due_at")
      .limit(50),
    supabase
      .from("appointments")
      .select(
        "id, title, starts_at, ends_at, status, appointment_type, location, notes",
      )
      .eq("lead_id", id)
      .order("starts_at", { ascending: false })
      .limit(50),
    supabase
      .from("lead_status_history")
      .select(
        "id, from_stage, to_stage, from_status, to_status, note, created_at, profiles:changed_by(full_name)",
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (!lead) notFound();
  const contact = Array.isArray(lead.contacts)
    ? lead.contacts[0]
    : lead.contacts;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/leads"
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← Takvim
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
              {contact?.name || "İsimsiz talep"}
            </h1>
            <p className="mt-1 text-sm text-[#466254]">{contact?.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contact?.id ? (
              <Link
                href={`/admin/patients/${contact.id}`}
                className="rounded-full bg-[#0b6b45] px-4 py-2 text-sm font-semibold text-white"
              >
                Hasta kimliği
              </Link>
            ) : null}
            <Link
              href={`/admin/messages?lead=${lead.id}`}
              className="rounded-full border border-[#0b6b45]/25 px-4 py-2 text-sm font-semibold text-[#0b6b45]"
            >
              Konuşmayı aç
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Talep bilgileri</h2>
          <p className="mt-1 text-sm text-[#466254]">
            Hastanın kimliği ve satış/operasyon aşaması. Takvime saat yazmaz.
            Reklam kaynağı (site, kanal, kampanya) otomatik gelir.
          </p>
          <form action={updateLead} className="mt-5 space-y-4">
            <input type="hidden" name="lead_id" value={lead.id} />
            <input type="hidden" name="contact_id" value={contact?.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad soyad">
                <input
                  name="name"
                  defaultValue={contact?.name ?? ""}
                  className={input}
                />
              </Field>
              <Field label="Aşama">
                <select name="stage" defaultValue={lead.stage} className={input}>
                  {STAGES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sorumlu">
                <select
                  name="assigned_to"
                  defaultValue={lead.assigned_to ?? ""}
                  className={input}
                >
                  <option value="">Atanmamış</option>
                  {profiles?.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.role}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="rounded-xl bg-[#f4f6f5] p-3 text-xs text-[#466254]">
                <p>Site: {lead.site || "—"}</p>
                <p>Kanal: {lead.channel || "—"}</p>
                <p>Kampanya: {lead.utm_campaign || lead.campaign || "—"}</p>
                <p>Ref: {lead.lead_ref || "—"}</p>
              </div>
            </div>
            <Field label="Notlar">
              <textarea
                name="notes"
                rows={7}
                defaultValue={lead.notes ?? ""}
                className={input}
              />
            </Field>
            <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b6b45] px-6 text-sm font-semibold text-white">
              Değişiklikleri kaydet
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#0b6b45]/20 bg-white p-5">
            <h2 className="text-lg font-semibold">Randevular</h2>
            <p className="mt-1 text-sm text-[#466254]">
              Bu hastanın klinik takvimindeki muayene saatleri. Saati değiştirmek
              veya silmek için randevu detayına girin. Yeni saat Takvimden
              yazılır.
            </p>

            {!appointments?.length ? (
              <p className="mt-4 rounded-xl bg-[#f4f6f5] px-4 py-3 text-sm text-[#466254]">
                Bu hastanın henüz randevusu yok.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {appointments.map((appointment) => {
                  const start = appointment.starts_at;
                  const end = appointmentEndIso(start, appointment.ends_at);
                  const cancelled = appointment.status === "cancelled";
                  const past = !cancelled && new Date(end) < now;
                  const statusLabel =
                    APPOINTMENT_STATUS_LABEL[appointment.status] ??
                    appointment.status;
                  const typeLabel =
                    APPOINTMENT_TYPE_LABEL[appointment.appointment_type] ??
                    "Muayene";
                  return (
                    <article
                      key={appointment.id}
                      className={`rounded-2xl border px-4 py-4 ${
                        cancelled
                          ? "border-red-100 bg-red-50/60"
                          : past
                            ? "border-[#123524]/08 bg-[#f4f6f5]"
                            : "border-[#0b6b45]/20 bg-[#e7f5ed]"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                        {past ? "Geçmiş" : cancelled ? "İptal" : "Yaklaşan"}
                      </p>
                      <p className="mt-1 font-semibold capitalize">
                        {formatDateLongTr(start)}
                      </p>
                      <p className="text-lg font-semibold text-[#123524]">
                        {formatTimeTr(start)} – {formatTimeTr(end)}
                      </p>
                      <p className="mt-1 text-xs text-[#466254]">
                        {formatDurationTr(durationMinutes(start, appointment.ends_at))}{" "}
                        · {typeLabel} · {statusLabel}
                      </p>
                      <Link
                        href={`/admin/calendar/${appointment.id}`}
                        className="mt-3 inline-block text-sm font-semibold text-[#0b6b45]"
                      >
                        Randevu detayı →
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
            <Link
              href={`/admin/leads?lead=${lead.id}&date=${istanbulYmd(now)}`}
              className="mt-4 inline-flex rounded-full bg-[#0b6b45] px-4 py-2 text-sm font-semibold text-white"
            >
              Takvimden randevu ekle
            </Link>
          </section>

          <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
            <h2 className="font-semibold">Geri arama notu</h2>
            <p className="mt-1 text-xs text-[#466254]">
              Takvime yazılmaz, muayene saati değildir. Sadece “hastayı ara”
              hatırlatması. Randevu detayında görünmez.
            </p>
            <form action={createTask} className="mt-4 space-y-3">
              <input type="hidden" name="lead_id" value={lead.id} />
              <input
                name="title"
                required
                placeholder="Hastayı geri ara"
                className={input}
              />
              <textarea
                name="description"
                rows={2}
                placeholder="Açıklama"
                className={input}
              />
              <input name="due_at" type="datetime-local" className={input} />
              <select name="priority" defaultValue="normal" className={input}>
                <option value="low">Düşük öncelik</option>
                <option value="normal">Normal öncelik</option>
                <option value="high">Yüksek öncelik</option>
                <option value="urgent">Acil</option>
              </select>
              <select name="assigned_to" className={input}>
                <option value="">Atanmamış</option>
                {profiles?.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name || profile.role}
                  </option>
                ))}
              </select>
              <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#123524] px-5 text-sm font-semibold text-white">
                Not ekle
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {tasks?.map((task) => (
                <form
                  key={task.id}
                  action={toggleTask}
                  className="flex items-start gap-3 rounded-xl bg-[#f4f6f5] p-3"
                >
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <input
                    name="complete"
                    value="true"
                    type="checkbox"
                    defaultChecked={Boolean(task.completed_at)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${task.completed_at ? "line-through opacity-50" : ""}`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-[#466254]">
                      {task.due_at
                        ? new Date(task.due_at).toLocaleString("tr-TR", {
                            timeZone: "Europe/Istanbul",
                          })
                        : "Tarih yok"}
                    </p>
                  </div>
                  <button className="text-xs font-semibold text-[#0b6b45]">
                    Kaydet
                  </button>
                </form>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Aşama geçmişi</h2>
        <p className="mt-1 text-sm text-[#466254]">
          Hastanın aşamasının (yeni → randevu → sonuçlandı vb.) ne zaman
          değiştiğinin kaydı. Randevu saati değildir.
        </p>
        <div className="mt-3 rounded-2xl border border-[#123524]/10 bg-white">
          {!history?.length ? (
            <p className="p-5 text-sm text-[#466254]">Henüz değişiklik yok.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="border-b border-[#123524]/8 px-5 py-3 text-sm last:border-0"
              >
                {item.from_stage || "—"} → {item.to_stage}
                <span className="ml-2 text-xs text-[#466254]">
                  {new Date(item.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
            ))
          )}
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

