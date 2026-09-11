import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/send-message";
import {
  buildTemplateBodyComponents as buildTimingBodyComponents,
  istanbulDayBoundsUtc,
  isPostStatusSendDue,
  isRuleDueNow,
  offsetDueAtMs,
  previewAutomationBody,
  type AutomationTimingMode,
} from "@/lib/whatsapp/automation-timing";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import { istanbulYmd } from "@/lib/date/tr";

export {
  istanbulDayBoundsUtc,
  isPostStatusSendDue,
  isRuleDueNow,
  normalizeWhatsAppPhone as normalizePhoneDigits,
  offsetDueAtMs,
  previewAutomationBody,
};

export type MessageRule = {
  key: string;
  label: string;
  enabled: boolean;
  template_name: string;
  language: string;
  offset_minutes: number;
  send_at_local_time: string | null;
  /** before_start = randevu öncesi; calendar_day = aynı gün yerel saat */
  timing_mode: AutomationTimingMode;
  appointment_types: string[];
  appointment_statuses: string[];
  /** Durum Panosu: yeni | arandi | randevulu | muayene_edildi | ameliyat_olacak | ameliyat_edildi | bitti */
  lead_statuses: string[];
  include_body_params: boolean;
  sort_order: number;
};

export type AppointmentForAutomation = {
  id: string;
  lead_id: string;
  starts_at: string;
  ends_at?: string | null;
  appointment_type: string;
  status: string;
  /** Yalnızca ameliyat sonrası adaylarında dolu (bkz. loadSurgeryPostopCandidates). */
  status_changed_at?: string | null;
  contact: {
    id: string;
    phone: string | null;
    name: string | null;
  } | null;
};

export function buildTemplateBodyComponents(
  contactName: string | null | undefined,
  startsAt: string,
): WhatsAppTemplateComponent[] {
  return buildTimingBodyComponents(
    contactName,
    startsAt,
  ) as WhatsAppTemplateComponent[];
}

export async function loadEnabledRules(
  supabase: SupabaseClient,
): Promise<MessageRule[]> {
  const { data, error } = await supabase
    .from("message_rules")
    .select(
      "key, label, enabled, template_name, language, offset_minutes, send_at_local_time, timing_mode, appointment_types, appointment_statuses, lead_statuses, include_body_params, sort_order",
    )
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageRule[];
}

export async function isPhoneOptedOut(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return true;
  const { data } = await supabase
    .from("wa_message_opt_outs")
    .select("phone")
    .eq("phone", digits)
    .maybeSingle();
  return Boolean(data);
}

export async function loadCandidateAppointments(
  supabase: SupabaseClient,
  rule: MessageRule,
  now = new Date(),
): Promise<AppointmentForAutomation[]> {
  const statuses = rule.appointment_statuses?.length
    ? rule.appointment_statuses
    : rule.timing_mode === "calendar_day"
      ? ["scheduled", "confirmed", "completed"]
      : ["scheduled", "confirmed"];
  const types = rule.appointment_types?.length
    ? rule.appointment_types
    : ["consultation"];
  // Hatırlatma randevuya bağlıdır: hasta ameliyat olmuş olsa da (10. gün
  // kontrolü vb.) mesaj gitmeli. Kuralda liste boşsa aktif durumların hepsi.
  const leadStatuses = rule.lead_statuses?.length
    ? rule.lead_statuses
    : ["randevulu", "muayene_edildi", "ameliyat_olacak", "ameliyat_edildi"];

  const { from, to } =
    rule.timing_mode === "calendar_day"
      ? istanbulDayBoundsUtc(now)
      : {
          // 1 gün kuralı için gelecek ~2 gün; biraz geçmiş tampon
          from: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          to: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        };

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      lead_id,
      starts_at,
      appointment_type,
      status,
      leads!inner (
        contact_id,
        status,
        contacts ( id, phone, name )
      )
    `,
    )
    .in("status", statuses)
    .in("appointment_type", types)
    .in("leads.status", leadStatuses)
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .limit(200);

  if (error) throw new Error(error.message);

  const rows: AppointmentForAutomation[] = [];
  for (const row of data ?? []) {
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    const contactRaw = lead?.contacts;
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
    rows.push({
      id: row.id,
      lead_id: row.lead_id,
      starts_at: row.starts_at,
      appointment_type: row.appointment_type,
      status: row.status,
      contact: contact
        ? {
            id: contact.id,
            phone: contact.phone,
            name: contact.name,
          }
        : null,
    });
  }
  return rows;
}

export function isSurgeryPostopRule(ruleKey: string): boolean {
  return ruleKey === "surgery_day" || ruleKey === "surgery_google_review";
}

export type SurgeryPostopCandidate = AppointmentForAutomation & {
  /** Lead'in bugün ameliyat_edildi'ye taşındığı an. */
  status_changed_at: string;
};

/**
 * Ameliyat sonrası mesaj adayları.
 *
 * Aday ölçütü **bugün ameliyat_edildi'ye taşınmış olmak** (lead_status_history).
 * Anlık lead durumuna bakılmaz: ameliyattan sonra aynı gün kontrol randevusu
 * açılıp lead "randevulu"ya dönse bile bilgilendirme mesajı kaybolmaz.
 * Lead başına yalnızca en güncel ameliyat randevusu döner.
 */
export async function loadSurgeryPostopCandidates(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<SurgeryPostopCandidate[]> {
  const { from } = istanbulDayBoundsUtc(now);

  const { data: history, error: historyError } = await supabase
    .from("lead_status_history")
    .select("lead_id, created_at")
    .eq("to_status", "ameliyat_edildi")
    .gte("created_at", from.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (historyError) throw new Error(historyError.message);

  const changedAtByLead = new Map<string, string>();
  for (const row of history ?? []) {
    // created_at desc — lead başına ilk gelen en güncel geçiş
    if (!changedAtByLead.has(row.lead_id)) {
      changedAtByLead.set(row.lead_id, row.created_at);
    }
  }
  if (changedAtByLead.size === 0) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      lead_id,
      starts_at,
      ends_at,
      appointment_type,
      status,
      leads!inner (
        contact_id,
        contacts ( id, phone, name )
      )
    `,
    )
    .eq("appointment_type", "procedure")
    .neq("status", "cancelled")
    .in("lead_id", [...changedAtByLead.keys()])
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const byLead = new Map<string, SurgeryPostopCandidate>();
  for (const row of data ?? []) {
    // starts_at desc — lead başına ilk gelen en güncel randevu
    if (byLead.has(row.lead_id)) continue;
    const changedAt = changedAtByLead.get(row.lead_id);
    if (!changedAt) continue;
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    const contactRaw = lead?.contacts;
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
    byLead.set(row.lead_id, {
      id: row.id,
      lead_id: row.lead_id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      appointment_type: row.appointment_type,
      status: row.status,
      status_changed_at: changedAt,
      contact: contact
        ? {
            id: contact.id,
            phone: contact.phone,
            name: contact.name,
          }
        : null,
    });
  }
  return [...byLead.values()];
}

const FAILED_DISPATCH_RETRY_MS = 60 * 60 * 1000;
/** Stuck pending claim (process crash mid-send) — allow reclaim after this. */
const PENDING_CLAIM_STALE_MS = 15 * 60 * 1000;
/** Aynı kişiye aynı kuraldan tekrar spam’i kes (çoklu randevu / kayıp satır). */
const RECIPIENT_DEDUP_MS = 48 * 60 * 60 * 1000;

function isTerminalOrActiveDispatch(data: {
  status: string;
  sent_at: string | null;
  wa_message_id: string | null;
}): boolean {
  if (data.wa_message_id) return true;
  if (data.status === "sent" || data.status === "skipped") return true;

  if (data.status === "pending" && data.sent_at) {
    const elapsed = Date.now() - new Date(data.sent_at).getTime();
    return elapsed < PENDING_CLAIM_STALE_MS;
  }
  if (data.status === "pending") return true;

  if (data.status === "failed" && data.sent_at) {
    const elapsed = Date.now() - new Date(data.sent_at).getTime();
    return elapsed < FAILED_DISPATCH_RETRY_MS;
  }

  return false;
}

export async function alreadyDispatched(
  supabase: SupabaseClient,
  appointmentId: string,
  ruleKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("message_dispatches")
    .select("id, status, sent_at, wa_message_id")
    .eq("appointment_id", appointmentId)
    .eq("rule_key", ruleKey)
    .maybeSingle();

  if (!data) return false;
  return isTerminalOrActiveDispatch(data);
}

/**
 * Aynı kişiye, aynı kuraldan, **aynı randevu günü için** zaten gönderildiyse true.
 *
 * Gün kapsamı önemli: aynı hastanın Pazartesi muayenesi ve Salı ameliyatı
 * varsa ikisi de kendi hatırlatmasını almalı. Yalnızca aynı güne düşen
 * ikinci bir randevu (çift kayıt vb.) engellenir.
 */
export async function alreadyDispatchedForRecipient(
  supabase: SupabaseClient,
  opts: {
    contactId: string | null;
    phone: string | null;
    ruleKey: string;
    /** Karşılaştırma günü — bu randevunun starts_at'i (Istanbul). */
    appointmentStartsAt: string;
    /** Varsa bu randevu satırını yok say (kendi claim’imiz). */
    excludeAppointmentId?: string;
  },
): Promise<boolean> {
  const since = new Date(Date.now() - RECIPIENT_DEDUP_MS).toISOString();
  const filters: string[] = [];
  if (opts.contactId) filters.push(`contact_id.eq.${opts.contactId}`);
  if (opts.phone) filters.push(`phone.eq.${opts.phone}`);
  if (!filters.length) return false;

  let query = supabase
    .from("message_dispatches")
    .select(
      "id, status, sent_at, wa_message_id, appointment_id, appointments(starts_at)",
    )
    .eq("rule_key", opts.ruleKey)
    .gte("sent_at", since)
    .or(filters.join(","))
    .order("sent_at", { ascending: false })
    .limit(20);

  if (opts.excludeAppointmentId) {
    query = query.neq("appointment_id", opts.excludeAppointmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("[automations] recipient dedup query failed", error.message);
    return false;
  }

  const targetDay = istanbulYmd(opts.appointmentStartsAt);

  for (const row of data ?? []) {
    if (!isTerminalOrActiveDispatch(row)) continue;
    const apptRaw = (row as { appointments?: unknown }).appointments;
    const appt = (Array.isArray(apptRaw) ? apptRaw[0] : apptRaw) as
      | { starts_at?: string }
      | null
      | undefined;
    // Randevusu okunamayan satırı güvenli tarafta duplicate say
    if (!appt?.starts_at) return true;
    if (istanbulYmd(appt.starts_at) === targetDay) return true;
  }
  return false;
}

/**
 * Gönderimden önce unique (appointment_id, rule_key) satırı kilitle.
 * true = bu worker gönderebilir; false = başka tur / worker zaten işliyor veya gönderdi.
 */
export async function claimDispatch(
  supabase: SupabaseClient,
  input: {
    appointmentId: string;
    ruleKey: string;
    contactId: string | null;
    phone: string | null;
    templateName: string;
  },
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const base = {
    appointment_id: input.appointmentId,
    rule_key: input.ruleKey,
    contact_id: input.contactId,
    phone: input.phone,
    template_name: input.templateName,
    status: "pending" as const,
    error: null as string | null,
    wa_message_id: null as string | null,
    sent_at: nowIso,
  };

  const { data: existing } = await supabase
    .from("message_dispatches")
    .select("id, status, sent_at, wa_message_id")
    .eq("appointment_id", input.appointmentId)
    .eq("rule_key", input.ruleKey)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("message_dispatches").insert(base);
    if (!error) return true;
    // 23505 = unique violation → başka worker aynı anda claim etti (normal).
    // Diğer hatalar sessiz kalırsa hiçbir mesaj gitmez; görünür olsun.
    if (error.code !== "23505") {
      console.error(
        "[automations] claim insert failed — 'pending' status migration uygulandı mı? (20260911120000)",
        { appointmentId: input.appointmentId, ruleKey: input.ruleKey, error: error.message },
      );
    }
    return false;
  }

  if (existing.wa_message_id) return false;
  if (existing.status === "sent" || existing.status === "skipped") return false;

  const ageMs = existing.sent_at
    ? Date.now() - new Date(existing.sent_at).getTime()
    : Number.POSITIVE_INFINITY;

  const canReclaim =
    (existing.status === "failed" && ageMs >= FAILED_DISPATCH_RETRY_MS) ||
    (existing.status === "pending" && ageMs >= PENDING_CLAIM_STALE_MS);

  if (!canReclaim) return false;

  // Optimistic lock: only reclaim if status unchanged
  const { data: reclaimed } = await supabase
    .from("message_dispatches")
    .update({
      contact_id: input.contactId,
      phone: input.phone,
      template_name: input.templateName,
      status: "pending",
      error: null,
      wa_message_id: null,
      sent_at: nowIso,
    })
    .eq("id", existing.id)
    .eq("status", existing.status)
    .is("wa_message_id", null)
    .select("id")
    .maybeSingle();

  return Boolean(reclaimed);
}

export async function priorRuleSent(
  supabase: SupabaseClient,
  appointmentId: string,
  priorRuleKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("message_dispatches")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("rule_key", priorRuleKey)
    .eq("status", "sent")
    .maybeSingle();
  return Boolean(data);
}
