"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createAppointment, updateLeadStatus } from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { Spinner } from "@/components/admin/Spinner";
import {
  asLeadStatus,
  isDoneStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/crm/lead-status";
import { clinicSlots } from "@/lib/crm/schedule";
import { istanbulYmd } from "@/lib/date/tr";

const selectClass =
  "min-h-10 rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm font-semibold text-[#123524] outline-none focus:border-[#0b6b45]";

const TIME_SLOTS = clinicSlots();

function defaultTimeLabel() {
  const now = new Date();
  const label = `${String(now.getHours()).padStart(2, "0")}:00`;
  return TIME_SLOTS.some((s) => s.label === label)
    ? label
    : (TIME_SLOTS[8]?.label ?? "10:00");
}

export function LeadStatusControl({
  leadId,
  status,
  lostReason,
  needsFollowup,
  onOptimisticChange,
  showBadge = true,
  showFollowupToggle = true,
  size = "md",
  className,
}: {
  leadId: string;
  status: string | null | undefined;
  lostReason?: string | null;
  needsFollowup?: boolean | null;
  onOptimisticChange?: (next: LeadPipelineStatus) => void;
  showBadge?: boolean;
  /** Liste satırlarında takip checkbox’ını gizle */
  showFollowupToggle?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [display, setDisplay] = useState(asLeadStatus(status));
  const [followup, setFollowup] = useState(Boolean(needsFollowup));
  const [error, setError] = useState<string | null>(null);
  const [doneReasonOpen, setDoneReasonOpen] = useState(false);
  const [doneReason, setDoneReason] = useState(lostReason ?? "");
  const [apptOpen, setApptOpen] = useState(false);
  const [apptPending, setApptPending] = useState(false);
  const [apptFormVersion, setApptFormVersion] = useState(0);

  useEffect(() => {
    setDisplay(asLeadStatus(status));
    setFollowup(Boolean(needsFollowup));
    setDoneReason(lostReason ?? "");
    setError(null);
    setDoneReasonOpen(false);
    setApptOpen(false);
  }, [leadId, status, needsFollowup, lostReason]);

  function commitStatus(
    next: LeadPipelineStatus,
    opts?: { lostReason?: string; needsFollowup?: boolean },
  ) {
    const prev = display;
    const prevFollowup = followup;
    setDisplay(next);
    if (next === "arandi" && opts?.needsFollowup !== undefined) {
      setFollowup(opts.needsFollowup);
    } else if (next !== "arandi") {
      setFollowup(false);
    }
    setError(null);
    onOptimisticChange?.(next);

    const fd = new FormData();
    fd.set("lead_id", leadId);
    fd.set("status", next);
    if (opts?.lostReason) fd.set("lost_reason", opts.lostReason);
    if (opts?.needsFollowup) fd.set("needs_followup", "1");

    startTransition(() => {
      void updateLeadStatus(fd).catch((err: unknown) => {
        setDisplay(prev);
        setFollowup(prevFollowup);
        onOptimisticChange?.(prev);
        setError(
          err instanceof Error ? err.message : "Durum güncellenemedi.",
        );
      });
    });
  }

  function onSelectChange(next: LeadPipelineStatus) {
    if (next === "randevulu") {
      setApptOpen(true);
      setDoneReasonOpen(false);
      setError(null);
      return;
    }
    if (isDoneStatus(next)) {
      setDoneReasonOpen(true);
      setDoneReason(lostReason ?? "");
      setApptOpen(false);
      setError(null);
      return;
    }
    setDoneReasonOpen(false);
    setApptOpen(false);
    commitStatus(next);
  }

  function confirmDone(withReason: boolean) {
    setDoneReasonOpen(false);
    commitStatus("bitti", {
      lostReason: withReason ? doneReason.trim() : undefined,
    });
  }

  async function onAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setApptPending(true);
    setError(null);
    try {
      const result = await createAppointment(new FormData(form));
      if (!result.ok) {
        setError(result.error || "Randevu eklenemedi.");
        return;
      }
      setApptFormVersion((value) => value + 1);
      setApptOpen(false);
      setDisplay("randevulu");
      setFollowup(false);
      onOptimisticChange?.("randevulu");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Randevu eklenemedi.");
    } finally {
      setApptPending(false);
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}
    >
      {showBadge ? (
        <LeadStatusBadge status={display} needsFollowup={followup} />
      ) : null}
      {pending ? (
        <Spinner size="sm" className="text-[#0b6b45]" label="Durum güncelleniyor" />
      ) : null}
      <label className="sr-only" htmlFor={`lead-status-${leadId}`}>
        Talep durumu
      </label>
      <select
        id={`lead-status-${leadId}`}
        value={display}
        disabled={pending || apptPending}
        aria-label="Talep durumu"
        onChange={(event) =>
          onSelectChange(event.target.value as LeadPipelineStatus)
        }
        className={`${selectClass} ${size === "sm" ? "min-h-9 text-xs" : ""} ${
          pending || apptPending ? "opacity-60" : ""
        }`}
      >
        {LEAD_STATUSES.map((value) => (
          <option key={value} value={value}>
            {LEAD_STATUS_LABEL[value]}
          </option>
        ))}
      </select>

      {showFollowupToggle && display === "arandi" ? (
        <label className="inline-flex items-center gap-1.5 text-xs text-[#466254]">
          <input
            type="checkbox"
            checked={followup}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.checked;
              setFollowup(next);
              commitStatus("arandi", { needsFollowup: next });
            }}
            className="rounded border-[#123524]/30"
          />
          Ulaşılamadı, tekrar ara
        </label>
      ) : null}

      {error ? (
        <p className="w-full text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {doneReasonOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#123524]/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby={`done-reason-title-${leadId}`}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3
              id={`done-reason-title-${leadId}`}
              className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]"
            >
              Bitti olarak işaretle
            </h3>
            <p className="mt-1 text-sm text-[#466254]">
              Kapanış sebebi isteğe bağlı (kayıp / iptal vb.).
            </p>
            <label className="mt-4 block text-sm font-medium text-[#123524]">
              Sebep (opsiyonel)
              <input
                value={doneReason}
                onChange={(event) => setDoneReason(event.target.value)}
                placeholder="Örn. iptal, kayıp, ameliyat oldu"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => confirmDone(true)}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#0b6b45] px-4 text-sm font-semibold text-white"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => confirmDone(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#0b6b45]/25 px-4 text-sm font-semibold text-[#0b6b45]"
              >
                Sebepsiz bitti
              </button>
              <button
                type="button"
                onClick={() => setDoneReasonOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-[#466254]"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {apptOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#123524]/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby={`appt-title-${leadId}`}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3
              id={`appt-title-${leadId}`}
              className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]"
            >
              Randevu tarihi seç
            </h3>
            <p className="mt-1 text-sm text-[#466254]">
              Takvime randevu yazılır ve durum Randevulu olur.
            </p>
            <form
              key={apptFormVersion}
              onSubmit={onAppointmentSubmit}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="lead_id" value={leadId} />
              <input type="hidden" name="appointment_type" value="consultation" />
              <input type="hidden" name="duration_minutes" value="30" />
              <label className="block text-sm font-medium text-[#123524]">
                Tarih
                <input
                  name="starts_date"
                  type="date"
                  required
                  defaultValue={istanbulYmd()}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
                />
              </label>
              <label className="block text-sm font-medium text-[#123524]">
                Saat
                <select
                  name="starts_time"
                  required
                  defaultValue={defaultTimeLabel()}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.label} value={slot.label}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={apptPending}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0b6b45] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {apptPending ? (
                    <>
                      <Spinner size="sm" className="text-white" label="Kaydediliyor" />
                      Kaydediliyor…
                    </>
                  ) : (
                    "Randevu oluştur"
                  )}
                </button>
                <button
                  type="button"
                  disabled={apptPending}
                  onClick={() => setApptOpen(false)}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium text-[#466254] disabled:cursor-not-allowed"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
