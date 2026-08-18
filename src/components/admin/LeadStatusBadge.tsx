import {
  asLeadStatus,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
} from "@/lib/crm/lead-status";

export function LeadStatusBadge({ status }: { status: string | null | undefined }) {
  const key = asLeadStatus(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAD_STATUS_TONE[key]}`}
    >
      {LEAD_STATUS_LABEL[key]}
    </span>
  );
}
