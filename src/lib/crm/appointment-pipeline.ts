import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadPipelineStatus } from "@/lib/crm/lead-status";

/** ends_at boş ameliyatlar için varsayılan süre (DB'deki no-overlap kuralıyla aynı). */
const DEFAULT_DURATION_MS = 30 * 60 * 1000;

/**
 * Geçmişi toplu taşımamak için tarama penceresi. Sisteme geçmeden önceki
 * eski kayıtlar olduğu gibi kalır; yalnızca son 7 günde biten ameliyatlar taşınır.
 */
const ADVANCE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** Ameliyat oluşturulunca / tipi güncellenince lead durumu. */
export function leadStatusForBookedAppointment(
  _appointmentType?: string,
): Extract<LeadPipelineStatus, "ameliyat_olacak"> {
  return "ameliyat_olacak";
}

/** Ameliyat bitiş saati geçince lead durumu. */
export function leadStatusAfterAppointmentEnds(
  _appointmentType?: string,
): Extract<LeadPipelineStatus, "ameliyat_edildi"> {
  return "ameliyat_edildi";
}

/** Bu durumdaki lead, ameliyat bitince ileri taşınabilir. */
export function advanceableFromStatuses(
  _appointmentType?: string,
): LeadPipelineStatus[] {
  return ["ameliyat_olacak", "muayene_edildi"];
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

/** Ameliyat bitti mi (ends_at yoksa starts_at + 30dk). */
export function isAppointmentFinished(
  row: { starts_at: string; ends_at?: string | null },
  now = new Date(),
): boolean {
  return appointmentEndMs(row) <= now.getTime();
}

/**
 * Ameliyat tamamlandığında lead'i ileri taşır.
 * Dönüş: true = lead taşındı, false = zaten ileride / eşleşmedi.
 * Hata durumunda throw eder (çağıran kaydı completed yapmamalı).
 */
export async function advanceLeadForFinishedAppointment(
  supabase: SupabaseClient,
  input: { leadId: string; appointmentType: string },
): Promise<boolean> {
  // Yalnızca ameliyat (procedure) lead durumunu ilerletir.
  if (input.appointmentType !== "procedure") return false;

  const { data, error } = await supabase
    .from("leads")
    .update({
      status: leadStatusAfterAppointmentEnds(input.appointmentType),
      needs_followup: false,
      stage: "appointment",
      had_surgery: true,
    })
    .eq("id", input.leadId)
    .in("status", advanceableFromStatuses(input.appointmentType))
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * Bitiş saati geçmiş scheduled/confirmed procedure kayıtları:
 *   1) lead'i ameliyat_edildi'ye taşı
 *   2) sonra kaydı completed yap
 *
 * Sıralama önemli: lead güncellemesi patlarsa
 * kayıt scheduled kalır ve sonraki turda tekrar denenir.
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
    .eq("appointment_type", "procedure")
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
      pipelineFailures.push(`ameliyat ${row.id}: ${apptErr.message}`);
      continue;
    }
    appointmentsCompleted += 1;
  }

  return { appointmentsCompleted, leadsAdvanced, pipelineFailures };
}
