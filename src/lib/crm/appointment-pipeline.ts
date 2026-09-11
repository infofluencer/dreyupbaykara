import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadPipelineStatus } from "@/lib/crm/lead-status";

/** Randevu oluşturulunca / tipi güncellenince lead durumu. */
export function leadStatusForBookedAppointment(
  appointmentType: string,
): Extract<LeadPipelineStatus, "ameliyat_olacak" | "randevulu"> {
  return appointmentType === "procedure" ? "ameliyat_olacak" : "randevulu";
}

/** Randevu bitiş saati geçince lead durumu. */
export function leadStatusAfterAppointmentEnds(
  appointmentType: string,
): Extract<LeadPipelineStatus, "ameliyat_edildi" | "muayene_edildi"> {
  return appointmentType === "procedure" ? "ameliyat_edildi" : "muayene_edildi";
}

const BOOKED_STATUSES_FOR_SURGERY: LeadPipelineStatus[] = [
  "ameliyat_olacak",
  "randevulu",
];
const BOOKED_STATUSES_FOR_EXAM: LeadPipelineStatus[] = ["randevulu"];

/**
 * ends_at geçmiş scheduled/confirmed randevuları completed yapar;
 * lead’i muayene_edildi / ameliyat_edildi’ye taşır.
 */
export async function advanceFinishedAppointments(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<{ appointmentsCompleted: number; leadsAdvanced: number }> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, lead_id, appointment_type, ends_at, status")
    .in("status", ["scheduled", "confirmed"])
    .lte("ends_at", now.toISOString())
    .order("ends_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);

  let appointmentsCompleted = 0;
  let leadsAdvanced = 0;

  for (const row of data ?? []) {
    const { error: apptErr } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", row.id)
      .in("status", ["scheduled", "confirmed"]);
    if (apptErr) continue;
    appointmentsCompleted += 1;

    const nextStatus = leadStatusAfterAppointmentEnds(row.appointment_type);
    const fromStatuses =
      row.appointment_type === "procedure"
        ? BOOKED_STATUSES_FOR_SURGERY
        : BOOKED_STATUSES_FOR_EXAM;

    const { data: updated, error: leadErr } = await supabase
      .from("leads")
      .update({
        status: nextStatus,
        needs_followup: false,
        stage: "appointment",
      })
      .eq("id", row.lead_id)
      .in("status", fromStatuses)
      .select("id")
      .maybeSingle();

    if (!leadErr && updated) leadsAdvanced += 1;
  }

  return { appointmentsCompleted, leadsAdvanced };
}
