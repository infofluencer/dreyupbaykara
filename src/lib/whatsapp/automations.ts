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
import { shouldReopenDispatch } from "@/lib/whatsapp/delivery-errors";
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
  /** Durum Panosu: yeni | arandi | muayene_edildi | ameliyat_olacak | ameliyat_edildi | bitti */
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
  params?: ReadonlyArray<"name" | "date" | "time">,
): WhatsAppTemplateComponent[] {
  return buildTimingBodyComponents(
    contactName,
    startsAt,
    params,
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
    : ["muayene_edildi", "ameliyat_olacak", "ameliyat_edildi"];

  const { from, to } =
    rule.timing_mode === "calendar_day"
      ? istanbulDayBoundsUtc(now)
      : {
          // offset kadar ileri bak (örn. 48s kuralı); +2s cron tamponu
          from: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          to: new Date(
            now.getTime() +
              Math.max(
                2 * 24 * 60 * 60 * 1000,
                (rule.offset_minutes + 120) * 60 * 1000,
              ),
          ),
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
 * Bu durumlara geri alınmış lead, yanlış sürükleme sayılır ve mesaj almaz.
 *
 * "bitti" listede yok; vaka kapatılsa bile aynı gün bilgilendirme gitmeli.
 */
const SURGERY_REVERTED_STATUSES = new Set([
  "yeni",
  "arandi",
  "muayene_edildi",
  "ameliyat_olacak",
]);

/**
 * Bugün ameliyat_edildi'ye taşınıp ardından geri alınan lead'leri bulur.
 *
 * Yalnızca **en son** geçişe bakar; gün içinde ileri geri gidip son hâli
 * ameliyat_edildi olan lead aday kalır.
 */
async function findRevertedLeads(
  supabase: SupabaseClient,
  leadIds: string[],
  from: Date,
  now: Date,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("lead_status_history")
    .select("lead_id, to_status, created_at")
    .in("lead_id", leadIds)
    .gte("created_at", from.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.warn("[automations] geri alma kontrolü başarısız", error.message);
    return new Set();
  }

  const latestByLead = new Map<string, string>();
  for (const row of data ?? []) {
    // created_at desc — lead başına ilk gelen en güncel geçiş
    if (!latestByLead.has(row.lead_id)) {
      latestByLead.set(row.lead_id, row.to_status);
    }
  }

  const reverted = new Set<string>();
  for (const [leadId, toStatus] of latestByLead) {
    if (SURGERY_REVERTED_STATUSES.has(toStatus)) reverted.add(leadId);
  }
  return reverted;
}

/**
 * Ameliyat sonrası mesaj adayları.
 *
 * Aday ölçütü **bugün ameliyat_edildi'ye taşınmış olmak** (lead_status_history).
 * Anlık lead durumuna bakılmaz: aynı gün başka durum güncellemesi olsa bile
 * bilgilendirme mesajı kaybolmaz.
 * Lead başına yalnızca en güncel ameliyat kaydı döner.
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

  // Yanlış sürükleme emniyeti — 16:00'dan önce geri alınan lead mesaj almaz
  const reverted = await findRevertedLeads(
    supabase,
    [...changedAtByLead.keys()],
    from,
    now,
  );
  for (const leadId of reverted) changedAtByLead.delete(leadId);
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

/**
 * Meta "failed" teslim durumu bildirdiğinde gönderim kaydını günceller.
 *
 * Varsayılan davranış hatayı yazıp durumu 'sent' bırakmak: Meta bir message id
 * verdiyse hatırlatma bir kez sayılır. Koşulsuz tekrar deneme eskiden hastaya
 * aynı hatırlatmayı 4-5 kez göndermişti.
 *
 * Tek istisna, mesajın hiç teslim edilmediği ve sebebin kendiliğinden geçtiği
 * kodlar (ödeme uygunluğu, hız limiti): satırı 'failed' + wa_message_id=null
 * yaparak yeniden açarız, cron FAILED_DISPATCH_RETRY_MS sonra devralır.
 * sent_at'e dokunmayız ki tekrar bütçesi ilk gönderim anından işlesin.
 */
export async function recordDispatchDeliveryFailure(
  supabase: SupabaseClient,
  opts: {
    appointmentId: string;
    ruleKey: string;
    code: number | null | undefined;
    errorText: string;
  },
): Promise<{ found: boolean; reopened: boolean; error?: string }> {
  const withRetry = await supabase
    .from("message_dispatches")
    .select("id, retry_count")
    .eq("appointment_id", opts.appointmentId)
    .eq("rule_key", opts.ruleKey)
    .eq("status", "sent")
    .maybeSingle();

  // retry_count migration'ı (20260914160000) henüz uygulanmadıysa tekrar deneme
  // devre dışı kalsın, ama hata metni yine de kayda yazılabilsin.
  let dispatchId: string | null = withRetry.data?.id ?? null;
  let retryCount = withRetry.data?.retry_count ?? 0;
  let retryColumnMissing = false;

  if (withRetry.error) {
    retryColumnMissing = true;
    console.warn(
      "[automations] retry_count okunamadı — 20260914160000 migration uygulandı mı?",
      { error: withRetry.error.message },
    );
    const fallback = await supabase
      .from("message_dispatches")
      .select("id")
      .eq("appointment_id", opts.appointmentId)
      .eq("rule_key", opts.ruleKey)
      .eq("status", "sent")
      .maybeSingle();
    dispatchId = fallback.data?.id ?? null;
    retryCount = 0;
  }

  if (!dispatchId) return { found: false, reopened: false };

  const reopen =
    !retryColumnMissing && shouldReopenDispatch({ code: opts.code, retryCount });

  const { error } = await supabase
    .from("message_dispatches")
    .update(
      reopen
        ? {
            error: opts.errorText,
            status: "failed",
            wa_message_id: null,
            retry_count: retryCount + 1,
          }
        : { error: opts.errorText },
    )
    .eq("id", dispatchId)
    .eq("status", "sent");

  if (error) return { found: true, reopened: false, error: error.message };
  return { found: true, reopened: reopen };
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

/**
 * Aktif ameliyat sonrası kuralların hepsi bu randevu için "sent" ise
 * lead'i Ameliyat edildi → Bitti taşır (had_surgery etiketi korunur).
 */
export async function maybeCloseLeadAfterPostopMessages(
  supabase: SupabaseClient,
  input: {
    leadId: string;
    appointmentId: string;
    enabledRules: MessageRule[];
  },
): Promise<boolean> {
  const postopKeys = input.enabledRules
    .filter((rule) => isSurgeryPostopRule(rule.key))
    .map((rule) => rule.key);
  if (!postopKeys.length) return false;

  const { data: sentRows, error: sentError } = await supabase
    .from("message_dispatches")
    .select("rule_key")
    .eq("appointment_id", input.appointmentId)
    .eq("status", "sent")
    .in("rule_key", postopKeys);

  if (sentError) {
    console.warn(
      "[automations] postop kapanış kontrolü başarısız",
      sentError.message,
    );
    return false;
  }

  const sent = new Set((sentRows ?? []).map((row) => row.rule_key));
  if (!postopKeys.every((key) => sent.has(key))) return false;

  const { data, error } = await supabase
    .from("leads")
    .update({
      status: "bitti",
      needs_followup: false,
      lost_reason: null,
      had_surgery: true,
    })
    .eq("id", input.leadId)
    .eq("status", "ameliyat_edildi")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[automations] postop → bitti taşınamadı", {
      leadId: input.leadId,
      error: error.message,
    });
    return false;
  }

  return Boolean(data);
}
