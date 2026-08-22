"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/app/admin/actions";
import { loadScheduleLeads } from "@/app/admin/schedule-actions";
import { AppointmentStatusDialog } from "@/components/admin/schedule/AppointmentStatusDialog";
import { TypeAndDurationFields } from "@/components/admin/schedule/TypeAndDurationFields";
import { planHref, type PlanView } from "@/components/admin/schedule/href";
import type { ScheduleLead } from "@/components/admin/schedule/types";
import { clinicSlots } from "@/lib/crm/schedule";
import { firstRelation } from "@/lib/crm/labels";

const TIME_SLOTS = clinicSlots();

export function AppointmentQuickForm({
  selectedLeadId,
  date,
  time,
  view,
  stage = "active",
  search = "",
  error,
  defaultOpen = false,
  hideToggleUnlessOpen = false,
}: {
  selectedLeadId?: string;
  date: string;
  time: string;
  view?: PlanView;
  stage?: string;
  search?: string;
  error?: string | null;
  defaultOpen?: boolean;
  /** Day view: hide "+ Randevu ekle" when closed (empty CTA / slot clicks open form). */
  hideToggleUnlessOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [leads, setLeads] = useState<ScheduleLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [leadId, setLeadId] = useState(selectedLeadId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error" | null>(
    error ? "error" : null,
  );
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [createdDate, setCreatedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    setStatus("error");
    setMessage(error);
    setOpen(true);
  }, [error]);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    setLeadsLoaded(false);
    setLeads([]);
    setLeadsError(null);
  }, [stage, search]);

  useEffect(() => {
    if (!open || leadsLoaded || leadsLoading) return;
    let cancelled = false;
    setLeadsLoading(true);
    setLeadsError(null);
    void loadScheduleLeads({ stage, q: search }).then((result) => {
      if (cancelled) return;
      setLeadsLoading(false);
      if (!result.ok) {
        setLeadsError(result.error);
        return;
      }
      setLeads(result.leads);
      setLeadsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, leadsLoaded, leadsLoading, stage, search]);

  useEffect(() => {
    if (!leadsLoaded || !selectedLeadId) return;
    const contact = firstRelation(
      leads.find((lead) => lead.id === selectedLeadId)?.contacts,
    );
    setLeadId(selectedLeadId);
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
  }, [leadsLoaded, selectedLeadId, leads]);

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
      {!hideToggleUnlessOpen || open ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 items-center rounded-full border border-[#0b6b45]/25 bg-white px-4 text-sm font-semibold text-[#0b6b45]"
            aria-expanded={open}
          >
            {open ? "Formu gizle" : "+ Randevu ekle"}
          </button>
        </div>
      ) : null}

      {open ? (
        <form
          key={`${selectedLeadId ?? "new"}-${date}-${time}`}
          onSubmit={onSubmit}
          className="mb-4 grid gap-3 rounded-2xl border border-[#123524]/10 bg-[#f7f9f8] p-4 sm:grid-cols-2 lg:grid-cols-4 xl:items-end"
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
            disabled={leadsLoading}
            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base disabled:opacity-60"
          >
            <option value="">
              {leadsLoading ? "Hastalar yükleniyor…" : "Yeni hasta"}
            </option>
            {leads.map((lead) => {
              const item = firstRelation(lead.contacts);
              return (
                <option key={lead.id} value={lead.id}>
                  {item?.name || "İsimsiz"} · {item?.phone}
                </option>
              );
            })}
          </select>
          {leadsError ? (
            <span className="mt-1 block text-xs text-red-700">{leadsError}</span>
          ) : null}
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
          <input
            name="notes"
            placeholder="Örn. MR getirecek, refakatçi ile gelecek"
            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
          />
        </label>
        <button
          disabled={status === "loading"}
          className="min-h-12 rounded-full bg-[#0b6b45] px-5 text-base font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:text-sm lg:col-span-4"
        >
          Randevu ekle
        </button>
      </form>
      ) : null}
      <AppointmentStatusDialog
        status={status}
        message={message}
        onClose={onDialogClose}
      />
    </>
  );
}
