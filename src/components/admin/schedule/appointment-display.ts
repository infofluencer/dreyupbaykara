import type { ScheduleAppointment } from "@/components/admin/schedule/types";
import {
  durationMinutes,
  formatDurationTr,
} from "@/lib/crm/duration";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  firstRelation,
} from "@/lib/crm/labels";
import { appointmentEndIso } from "@/lib/crm/schedule";
import {
  formatDateLongTr,
  formatTimeRangeTr,
} from "@/lib/date/tr";

export function appointmentInfo(appointment: ScheduleAppointment) {
  const lead = firstRelation(appointment.leads);
  const contact = firstRelation(lead?.contacts);
  const end = appointmentEndIso(appointment.starts_at, appointment.ends_at);
  const minutes = durationMinutes(appointment.starts_at, appointment.ends_at);
  return {
    name: contact?.name || appointment.title || "İsimsiz",
    phone: contact?.phone || "",
    leadId: appointment.lead_id,
    contactId: contact?.id || lead?.contact_id || "",
    end,
    minutes,
    duration: formatDurationTr(minutes),
    timeRange: formatTimeRangeTr(appointment.starts_at, end),
    dateLong: formatDateLongTr(appointment.starts_at),
    status: APPOINTMENT_STATUS_LABEL[appointment.status] ?? appointment.status,
    type:
      APPOINTMENT_TYPE_LABEL[appointment.appointment_type ?? ""] ?? "Muayene",
  };
}
