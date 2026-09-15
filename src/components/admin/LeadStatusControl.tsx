"use client";

import { useEffect, useState, useTransition } from "react";
import { updateLeadStatus } from "@/app/admin/actions";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { Spinner } from "@/components/admin/Spinner";
import {
  asLeadStatus,
  isDoneStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/crm/lead-status";

const selectClass =
  "min-h-10 rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm font-semibold text-[#123524] outline-none focus:border-[#0b6b45]";

export function LeadStatusControl({
  leadId,
  status,
  lostReason,
  needsFollowup,
  hadSurgery,
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
  hadSurgery?: boolean | null;
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

  useEffect(() => {
    setDisplay(asLeadStatus(status));
    setFollowup(Boolean(needsFollowup));
    setDoneReason(lostReason ?? "");
    setError(null);
    setDoneReasonOpen(false);
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
    if (isDoneStatus(next)) {
      setDoneReasonOpen(true);
      setDoneReason(lostReason ?? "");
      setError(null);
      return;
    }
    setDoneReasonOpen(false);
    commitStatus(next);
  }

  function confirmDone(withReason: boolean) {
    setDoneReasonOpen(false);
    commitStatus("bitti", {
      lostReason: withReason ? doneReason.trim() : undefined,
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}
    >
      {showBadge ? (
        <LeadStatusBadge
          status={display}
          needsFollowup={followup}
          hadSurgery={hadSurgery}
        />
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
        disabled={pending}
        aria-label="Talep durumu"
        onChange={(event) =>
          onSelectChange(event.target.value as LeadPipelineStatus)
        }
        className={`${selectClass} ${size === "sm" ? "min-h-9 text-xs" : ""} ${
          pending ? "opacity-60" : ""
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
    </div>
  );
}
