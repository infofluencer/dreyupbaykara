"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/app/admin/actions";
import { loadScheduleLeads } from "@/app/admin/schedule-actions";
import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";
import { TypeAndDurationFields } from "@/components/admin/schedule/TypeAndDurationFields";
import { Spinner } from "@/components/admin/Spinner";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [patientMode, setPatientMode] = useState<PatientMode>(
    selectedLeadId ? "existing" : "new",
  );
  const [leads, setLeads] = useState<ScheduleLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState(selectedLeadId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialog, setDialog] = useState<AdminDialogStatus>(
    error ? "error" : null,
  );
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [createdDate, setCreatedDate] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  function resetFormAfterCreate() {
    setFormVersion((value) => value + 1);
    if (selectedLeadId) {
      setPatientMode("existing");
      setLeadId(selectedLeadId);
    } else {
      setPatientMode("new");
      setLeadId("");
      setName("");
      setPhone("");
    }
  }

  useEffect(() => {
    if (!error) return;
    setDialog("error");
    setMessage(error);
    setOpen(true);
  }, [error]);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (selectedLeadId) {
      setPatientMode("existing");
      setLeadId(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Form her açıldığında taze çek — client cache ile silinmiş hasta kalmasın
  useEffect(() => {
    if (!open || patientMode !== "existing") return;

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
      if (
        selectedLeadId &&
        !result.leads.some((lead) => lead.id === selectedLeadId)
      ) {
        setLeadId("");
        setName("");
        setPhone("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, patientMode, stage, search, selectedLeadId]);

  useEffect(() => {
    if (patientMode !== "existing" || !selectedLeadId || !leads.length) return;
    const match = leads.find((lead) => lead.id === selectedLeadId);
    if (!match) return;
    const contact = firstRelation(match.contacts);
    setLeadId(selectedLeadId);
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
  }, [patientMode, selectedLeadId, leads]);

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    const who =
      patientMode === "existing"
        ? name || "seçili hasta"
        : name || "yeni hasta";
    setMessage(
      `${who} için ${date} tarihinde randevu oluşturulsun mu?\n\nKayıt sonrası Durum Panosu’nda “Randevulu” görünür.`,
    );
    setPendingSubmit(true);
    setDialog("confirm");
  }

  async function runCreate() {
    const form = formRef.current;
    if (!form) return;
    setDialog("loading");
    setMessage(null);
    setPendingSubmit(false);
    try {
      const result = await createAppointment(new FormData(form));
      if (result.ok) {
        resetFormAfterCreate();
        setCreatedDate(result.date ?? date);
        setMessage(
          "Randevu kaydedildi. Hasta listesi ve Durum Panosu güncellendi.",
        );
        setDialog("success");
        router.refresh();
        return;
      }
      setDialog("error");
      setMessage(result.error || "Randevu eklenemedi.");
    } catch (caught) {
      setDialog("error");
      setMessage(
        caught instanceof Error ? caught.message : "Randevu eklenemedi.",
      );
    }
  }

  function onDialogClose() {
    if (dialog === "loading") return;
    const nextDate = createdDate;
    const wasSuccess = dialog === "success";
    setDialog(null);
    setMessage(null);
    setPendingSubmit(false);
    setCreatedDate(null);
    if (wasSuccess && nextDate) {
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
  const busy = dialog === "loading" || dialog === "confirm";

  return (
    <>
      {!hideToggleUnlessOpen || open ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-[#0b6b45]/25 bg-white px-4 text-sm font-semibold text-[#0b6b45]"
            aria-expanded={open}
          >
            {open ? "Formu gizle" : "+ Randevu ekle"}
          </button>
        </div>
      ) : null}

      {open ? (
        <form
          ref={formRef}
          key={`${formVersion}-${selectedLeadId ?? "new"}-${date}-${time}-${patientMode}`}
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
                className={`min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition ${
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
                className={`min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition ${
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
              {!leadsLoading && leads.length === 0 ? (
                <span className="mt-1 block text-xs text-[#466254]">
                  Kayıtlı hasta yok (Hastalar listesinde olanlar burada
                  görünür). Yeni hasta ile devam edin.
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
          <TypeAndDurationFields key={formVersion} />
          <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">
            Not
            <input
              name="notes"
              placeholder="Örn. MR getirecek, refakatçi ile gelecek"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
            />
          </label>
          <button
            type="submit"
            disabled={busy || (usingExisting && leadsLoading)}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0b6b45] px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 sm:text-sm lg:col-span-4"
          >
            {busy ? (
              <>
                <Spinner size="sm" className="text-white" label="Randevu kaydediliyor" />
                Kaydediliyor…
              </>
            ) : (
              "Randevu ekle"
            )}
          </button>
        </form>
      ) : null}
      <AdminConfirmDialog
        status={dialog}
        title="Randevu oluşturulsun mu?"
        message={message}
        confirmLabel="Evet, kaydet"
        loadingTitle="Randevu kaydediliyor"
        loadingMessage="Hasta ve Durum Panosu güncelleniyor…"
        successTitle="Randevu eklendi"
        errorTitle="Randevu eklenemedi"
        onConfirm={() => {
          if (pendingSubmit) void runCreate();
        }}
        onClose={onDialogClose}
      />
    </>
  );
}
