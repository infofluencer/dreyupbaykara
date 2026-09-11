import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadPipelineStatus } from "@/lib/crm/lead-status";

/** ends_at boş randevular için varsayılan süre (DB'deki no-overlap kuralıyla aynı). */
const DEFAULT_DURATION_MS = 30 * 60 * 1000;

/**
 * Geçmişi toplu taşımamak için tarama penceresi. Sisteme geçmeden önceki
 * eski randevular olduğu gibi kalır; yalnızca son 7 günde biten randevular taşınır.
 */
const ADVANCE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

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

/** Bu durumdaki lead, randevu bitince ileri taşınabilir. */
export function advanceableFromStatuses(
  appointmentType: string,
): LeadPipelineStatus[] {
  // Ameliyat: randevulu da olabilir (ameliyat randevusu sonradan eklenmişse)
  return appointmentType === "procedure"
    ? ["ameliyat_olacak", "randevulu", "muayene_edildi"]
    : ["randevulu"];
}

export function appointmentEndMs(row: {
  starts_at: string;
  ends_at?: string | null;
}): number {
  if (row.ends_at) {
    const ends = new Date(row.ends_at).getTime();
    if (!Number.isNaN(ends)) return ends;
  }
  return new Date(row.starts_at).getTime() + DEFAULT_DURATION_MS;
}

/** Randevu bitti mi (ends_at yoksa starts_at + 30dk). */
export function isAppointmentFinished(
  row: { starts_at: string; ends_at?: string | null },
  now = new Date(),
): boolean {
  return appointmentEndMs(row) <= now.getTime();
}

/**
 * Randevu tamamlandığında lead'i ileri taşır.
 * Dönüş: true = lead taşındı, false = zaten ileride / eşleşmedi.
 * Hata durumunda throw eder (çağıran randevuyu completed yapmamalı).
 */
export async function advanceLeadForFinishedAppointment(
  supabase: SupabaseClient,
  input: { leadId: string; appointmentType: string },
): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .update({
      status: leadStatusAfterAppointmentEnds(input.appointmentType),
      needs_followup: false,
      stage: "appointment",
    })
    .eq("id", input.leadId)
    .in("status", advanceableFromStatuses(input.appointmentType))
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * Bitiş saati geçmiş scheduled/confirmed randevular:
 *   1) lead'i muayene_edildi / ameliyat_edildi'ye taşı
 *   2) sonra randevuyu completed yap
 *
 * Sıralama önemli: lead güncellemesi patlarsa (ör. migration uygulanmadıysa)
 * randevu scheduled kalır ve sonraki turda tekrar denenir.
 */
export async function advanceFinishedAppointments(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<{
  appointmentsCompleted: number;
  leadsAdvanced: number;
  pipelineFailures: string[];
}> {
  const lookbackFrom = new Date(now.getTime() - ADVANCE_LOOKBACK_MS);

  // starts_at NOT NULL — ends_at null olabildiği için filtre starts_at üzerinden
  const { data, error } = await supabase
    .from("appointments")
    .select("id, lead_id, appointment_type, starts_at, ends_at, status")
    .in("status", ["scheduled", "confirmed"])
    .gte("starts_at", lookbackFrom.toISOString())
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);

  let appointmentsCompleted = 0;
  let leadsAdvanced = 0;
  const pipelineFailures: string[] = [];

  for (const row of data ?? []) {
    if (!isAppointmentFinished(row, now)) continue;

    try {
      const moved = await advanceLeadForFinishedAppointment(supabase, {
        leadId: row.lead_id,
        appointmentType: row.appointment_type,
      });
      if (moved) leadsAdvanced += 1;
    } catch (err) {
      pipelineFailures.push(
        `lead ${row.lead_id}: ${err instanceof Error ? err.message : "durum taşınamadı"}`,
      );
      continue;
    }

    const { error: apptErr } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", row.id)
      .in("status", ["scheduled", "confirmed"]);

    if (apptErr) {
      pipelineFailures.push(`randevu ${row.id}: ${apptErr.message}`);
      continue;
    }
    appointmentsCompleted += 1;
  }

  return { appointmentsCompleted, leadsAdvanced, pipelineFailures };
}
