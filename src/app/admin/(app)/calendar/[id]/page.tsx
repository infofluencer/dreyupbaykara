import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAppointment } from "@/app/admin/actions";
import { DeleteAppointmentButton } from "@/components/admin/DeleteAppointmentButton";
import { TypeAndDurationFields } from "@/components/admin/schedule/TypeAndDurationFields";
import { requireAdminSession } from "@/lib/admin/auth";
import { durationMinutes, formatDurationTr } from "@/lib/crm/duration";
import { appointmentEndIso } from "@/lib/crm/schedule";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/crm/labels";
import { getIstanbulNow } from "@/lib/date/now";
import {
  formatDateLongTr,
  formatTimeTr,
  istanbulYmd,
} from "@/lib/date/tr";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0b6b45]";

function localInputValue(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const now = await getIstanbulNow();
  const { id } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
      .select("*, leads(id, stage, contacts(id, name, phone))")
    .eq("id", id)
    .single();
  if (!appointment) notFound();

  const lead = Array.isArray(appointment.leads)
    ? appointment.leads[0]
    : appointment.leads;
  const contact = Array.isArray(lead?.contacts)
    ? lead.contacts[0]
    : lead?.contacts;
  const start = appointment.starts_at;
  const end = appointmentEndIso(start, appointment.ends_at);
  const minutes = durationMinutes(start, appointment.ends_at);
  const cancelled = appointment.status === "cancelled";
  const past = !cancelled && new Date(end) < now;
  const whenLabel = cancelled ? "İptal" : past ? "Geçmiş randevu" : "Yaklaşan randevu";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/admin/leads?date=${istanbulYmd(start)}`}
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← Takvime dön
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#466254]">
          {whenLabel}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold capitalize">
          {formatDateLongTr(start)}
        </h1>
        <p className="mt-1 text-xl font-semibold text-[#123524]">
          {formatTimeTr(start)} – {formatTimeTr(end)}
        </p>
        <p className="mt-2 text-sm text-[#466254]">
          {contact?.name || "İsimsiz"} · {contact?.phone || "Telefon yok"}
        </p>
      </div>

      <div className="rounded-2xl border border-[#0b6b45]/20 bg-[#e7f5ed] p-4 text-sm text-[#24543e]">
        <p className="font-semibold">Bu sayfa nedir?</p>
        <p className="mt-1">
          Yalnızca <strong>bu randevu</strong> düzenlenir: gün, başlangıç, süre
          (muayene / ameliyat), tür, durum ve not. Hasta kartı ayrıdır.
        </p>
      </div>

      <dl className="grid gap-3 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#6b7d73]">Hasta</dt>
          <dd className="font-semibold">{contact?.name || "İsimsiz"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#6b7d73]">Telefon</dt>
          <dd className="font-semibold">{contact?.phone || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#6b7d73]">Tür</dt>
          <dd className="font-semibold">
            {APPOINTMENT_TYPE_LABEL[appointment.appointment_type] ?? "Muayene"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#6b7d73]">Süre</dt>
          <dd className="font-semibold">{formatDurationTr(minutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#6b7d73]">Durum</dt>
          <dd className="font-semibold">
            {APPOINTMENT_STATUS_LABEL[appointment.status] ?? appointment.status}
          </dd>
        </div>
      </dl>

      <form
        action={updateAppointment}
        className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5"
      >
        <input type="hidden" name="id" value={appointment.id} />
        <input type="hidden" name="lead_id" value={appointment.lead_id} />
        <input type="hidden" name="title" value={appointment.title || "Muayene randevusu"} />
        <h2 className="font-semibold">Randevuyu düzenle</h2>
        {formError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}

        <Field
          label="Başlangıç"
          hint="Randevunun başladığı an. Süre boyunca takvim dolu görünür."
        >
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={localInputValue(appointment.starts_at)}
            className={input}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <TypeAndDurationFields
            defaultType={appointment.appointment_type || "consultation"}
            defaultDuration={minutes}
          />
        </div>
        <Field
          label="Durum"
          hint="Planlandı: henüz gelmedi. Onaylandı: hasta teyit etti. Tamamlandı: muayene bitti. İptal: saat boşalır."
        >
          <select
            name="status"
            defaultValue={appointment.status}
            className={input}
          >
            <option value="scheduled">Planlandı</option>
            <option value="confirmed">Onaylandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
        </Field>
        <Field
          label="Randevu notu"
          hint="Sadece bu saate ait not. Hasta kartındaki genel notlardan ayrıdır."
        >
          <textarea
            name="notes"
            rows={4}
            defaultValue={appointment.notes ?? ""}
            placeholder="Örn. MR getirecek, refakatçi ile gelecek"
            className={input}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-[#0b6b45] px-6 py-2.5 text-sm font-semibold text-white">
            Kaydet
          </button>
          {contact?.id ? (
            <Link
              href={`/admin/patients/${contact.id}`}
              className="rounded-full border border-[#123524]/15 px-5 py-2.5 text-sm font-semibold"
            >
              Hasta kimliği
            </Link>
          ) : null}
        </div>
      </form>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-900">Randevuyu sil</p>
        <p className="mt-1 text-sm text-red-800">
          Bu muayene takvimden kalkar, saat tekrar boşalır. Hasta kartı silinmez.
        </p>
        <div className="mt-4">
          <DeleteAppointmentButton
            id={appointment.id}
            label="Randevuyu sil"
            className="rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700"
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint ? <p className="mt-1 text-xs font-normal text-[#6b7d73]">{hint}</p> : null}
      {children}
    </label>
  );
}
