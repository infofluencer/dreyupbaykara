import {
  asLeadStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
} from "@/lib/crm/lead-status";

export function LeadStatusBadge({
  status,
  needsFollowup,
}: {
  status: string | null | undefined;
  needsFollowup?: boolean | null;
}) {
  const key = asLeadStatus(status);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAD_STATUS_TONE[key]}`}
      >
        {LEAD_STATUS_LABEL[key]}
      </span>
      {needsFollowup && key === "arandi" ? (
        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-900">
          Tekrar ara
        </span>
      ) : null}
    </span>
  );
}
