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

type PatientMode = "existing" | "new";

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
  const [patientMode, setPatientMode] = useState<PatientMode>(
    selectedLeadId ? "existing" : "new",
  );
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
    if (selectedLeadId) {
      setPatientMode("existing");
      setLeadId(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Kayıtlı hasta modunda listeyi yükle (leadsLoading dependency yok — sonsuz yükleme yarışı olmasın)
  useEffect(() => {
    if (!open || patientMode !== "existing" || leadsLoaded) return;

    let cancelled = false;
    setLeadsLoading(true);
    setLeadsError(null);

    void loadScheduleLeads({ stage, q: search }).then((result) => {
      if (cancelled) return;
      setLeadsLoading(false);
      if (!result.ok) {
        setLeadsError(result.error);
        setLeads([]);
        return;
      }
      setLeads(result.leads);
      setLeadsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, patientMode, leadsLoaded, stage, search]);

  useEffect(() => {
    if (patientMode !== "existing" || !leadsLoaded || !selectedLeadId) return;
    const contact = firstRelation(
      leads.find((lead) => lead.id === selectedLeadId)?.contacts,
    );
    setLeadId(selectedLeadId);
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
  }, [patientMode, leadsLoaded, selectedLeadId, leads]);

  function switchMode(mode: PatientMode) {
    setPatientMode(mode);
    setLeadsError(null);
    if (mode === "new") {
      setLeadId("");
      setName("");
      setPhone("");
      return;
    }
    if (!selectedLeadId) {
      setLeadId("");
      setName("");
      setPhone("");
    }
  }

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

  const usingExisting = patientMode === "existing";

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
          key={`${selectedLeadId ?? "new"}-${date}-${time}-${patientMode}`}
          onSubmit={onSubmit}
          className="mb-4 grid gap-3 rounded-2xl border border-[#123524]/10 bg-[#f7f9f8] p-4 sm:grid-cols-2 lg:grid-cols-4 xl:items-end"
        >
          {view && view !== "day" ? (
            <input type="hidden" name="redirect_view" value={view} />
          ) : null}

          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-medium text-[#123524]">Hasta</p>
            <div
              className="mt-1.5 inline-flex rounded-full border border-[#123524]/15 bg-white p-1"
              role="group"
              aria-label="Hasta türü"
            >
              <button
                type="button"
                onClick={() => switchMode("existing")}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${
                  usingExisting
                    ? "bg-[#0b6b45] text-white"
                    : "text-[#466254] hover:bg-[#f4f6f5]"
                }`}
              >
                Kayıtlı hasta
              </button>
              <button
                type="button"
                onClick={() => switchMode("new")}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${
                  !usingExisting
                    ? "bg-[#0b6b45] text-white"
                    : "text-[#466254] hover:bg-[#f4f6f5]"
                }`}
              >
                Yeni hasta
              </button>
            </div>
          </div>

          {usingExisting ? (
            <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">
              Hasta seç
              <select
                name="lead_id"
                value={leadId}
                onChange={(event) => onLeadChange(event.target.value)}
                required
                disabled={leadsLoading}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base disabled:opacity-60"
              >
                <option value="">
                  {leadsLoading
                    ? "Hastalar yükleniyor…"
                    : "Kayıtlı hasta seçin"}
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
                <span className="mt-1 block text-xs text-red-700">
                  {leadsError}
                </span>
              ) : null}
              {!leadsLoading && leadsLoaded && leads.length === 0 ? (
                <span className="mt-1 block text-xs text-[#466254]">
                  Kayıtlı hasta bulunamadı. Yeni hasta ile devam edin.
                </span>
              ) : null}
            </label>
          ) : (
            <>
              <input type="hidden" name="lead_id" value="" />
              <label className="text-sm font-medium">
                Ad soyad
                <input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Hasta adı"
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
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
                  required
                  placeholder="0530 123 45 67"
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
                />
              </label>
            </>
          )}

          {usingExisting && leadId ? (
            <>
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="phone" value={phone} />
              <div className="rounded-xl border border-[#123524]/10 bg-white px-3 py-3 text-sm text-[#466254] sm:col-span-2">
                <p className="font-semibold text-[#123524]">
                  {name || "İsimsiz"}
                </p>
                <p className="mt-0.5">{phone || "Telefon yok"}</p>
              </div>
            </>
          ) : null}

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
            disabled={status === "loading" || (usingExisting && leadsLoading)}
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
