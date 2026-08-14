"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/app/admin/actions";
import { AppointmentStatusDialog } from "@/components/admin/schedule/AppointmentStatusDialog";
import { TypeAndDurationFields } from "@/components/admin/schedule/TypeAndDurationFields";
import { planHref, type PlanView } from "@/components/admin/schedule/href";
import type { ScheduleLead } from "@/components/admin/schedule/types";
import { clinicSlots } from "@/lib/crm/schedule";
import { firstRelation } from "@/lib/crm/labels";

const TIME_SLOTS = clinicSlots();

export function AppointmentQuickForm({
  leads,
  selectedLeadId,
  date,
  time,
  view,
  error,
}: {
  leads: ScheduleLead[];
  selectedLeadId?: string;
  date: string;
  time: string;
  view?: PlanView;
  error?: string | null;
}) {
  const router = useRouter();
  const initial = selectedLeadId
    ? firstRelation(leads.find((lead) => lead.id === selectedLeadId)?.contacts)
    : null;
  const [leadId, setLeadId] = useState(selectedLeadId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [status, setStatus] = useState<"loading" | "success" | "error" | null>(
    error ? "error" : null,
  );
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [createdDate, setCreatedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    setStatus("error");
    setMessage(error);
  }, [error]);

  function onLeadChange(nextId: string) {
    setLeadId(nextId);
    if (!nextId) {
      setName("");
      setPhone("");
      return;
    }
    const contact = firstRelation(
      leads.find((lead) => lead.id === nextId)?.contacts,
    );
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("loading");
    setMessage(null);
    try {
      const result = await createAppointment(new FormData(form));
      if (result.ok) {
        setCreatedDate(result.date ?? date);
        setStatus("success");
        return;
      }
      setStatus("error");
      setMessage(result.error || "Randevu eklenemedi.");
    } catch (caught) {
      setStatus("error");
      setMessage(
        caught instanceof Error ? caught.message : "Randevu eklenemedi.",
      );
    }
  }

  function onDialogClose() {
    const nextDate = createdDate;
    setStatus(null);
    setMessage(null);
    setCreatedDate(null);
    if (nextDate) {
      router.push(
        planHref({ view: "day", date: nextDate, lead: leadId || undefined }),
      );
      return;
    }
    if (error) {
      router.replace(planHref({ view, date, lead: selectedLeadId }));
    }
  }

  const timeOptions = TIME_SLOTS.some((slot) => slot.label === time)
    ? TIME_SLOTS
    : [{ hour: 0, minute: 0, label: time }, ...TIME_SLOTS];

  return (
    <>
      <form
        key={`${selectedLeadId ?? "new"}-${date}-${time}`}
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-[#123524]/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:items-end"
      >
        {view && view !== "day" ? (
          <input type="hidden" name="redirect_view" value={view} />
        ) : null}
        <label className="text-sm font-medium">
          Kayıtlı hasta
          <select
            name="lead_id"
            value={leadId}
            onChange={(event) => onLeadChange(event.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
          >
            <option value="">Yeni hasta</option>
            {leads.map((lead) => {
              const item = firstRelation(lead.contacts);
              return (
                <option key={lead.id} value={lead.id}>
                  {item?.name || "İsimsiz"} · {item?.phone}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-sm font-medium">
          Ad soyad
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required={!leadId}
            readOnly={Boolean(leadId)}
            placeholder="Hasta adı"
          className={`mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 px-3 py-3 text-base ${
            leadId ? "cursor-not-allowed bg-[#f4f6f5] text-[#466254]" : "bg-white"
          }`}
          />
        </label>
        <label className="text-sm font-medium">
          Telefon
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required={!leadId}
            readOnly={Boolean(leadId)}
            placeholder="0530 123 45 67"
          className={`mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 px-3 py-3 text-base ${
            leadId ? "cursor-not-allowed bg-[#f4f6f5] text-[#466254]" : "bg-white"
          }`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:contents">
        <label className="text-sm font-medium">
          Tarih
          <input
            name="starts_date"
            type="date"
            required
            defaultValue={date}
            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
          />
        </label>
        <label className="text-sm font-medium">
          Saat
          <select
            name="starts_time"
            required
            defaultValue={time}
            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
          >
            {timeOptions.map((slot) => (
              <option key={slot.label} value={slot.label}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
        </div>
        <TypeAndDurationFields />
        <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">
          Not
          <textarea
            name="notes"
            rows={3}
            placeholder="Örn. MR getirecek, refakatçi ile gelecek"
            className="mt-1.5 min-h-[5.5rem] w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
          />
        </label>
        <button
          disabled={status === "loading"}
          className="min-h-12 rounded-full bg-[#0b6b45] px-5 text-base font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:text-sm lg:col-span-4"
        >
          Randevu ekle
        </button>
      </form>
      <AppointmentStatusDialog
        status={status}
        message={message}
        onClose={onDialogClose}
      />
    </>
  );
}
