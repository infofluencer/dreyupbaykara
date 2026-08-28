import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/send-message";
import {
  buildTemplateBodyComponents as buildTimingBodyComponents,
  istanbulDayBoundsUtc,
  isRuleDueNow,
  offsetDueAtMs,
  previewAutomationBody,
  type AutomationTimingMode,
} from "@/lib/whatsapp/automation-timing";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";

export {
  istanbulDayBoundsUtc,
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
  /** Durum Panosu: yeni | arandi | randevulu | bitti */
  lead_statuses: string[];
  include_body_params: boolean;
  sort_order: number;
};

export type AppointmentForAutomation = {
  id: string;
  lead_id: string;
  starts_at: string;
  appointment_type: string;
  status: string;
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
  const digits = normalizePhoneDigits(phone);
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
  const leadStatuses = rule.lead_statuses?.length
    ? rule.lead_statuses
    : rule.timing_mode === "calendar_day"
      ? ["randevulu", "bitti"]
      : ["randevulu"];

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

const FAILED_DISPATCH_RETRY_MS = 60 * 60 * 1000;

export async function alreadyDispatched(
  supabase: SupabaseClient,
  appointmentId: string,
  ruleKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("message_dispatches")
    .select("id, status, sent_at")
    .eq("appointment_id", appointmentId)
    .eq("rule_key", ruleKey)
    .maybeSingle();

  if (!data) return false;
  if (data.status === "sent" || data.status === "skipped") return true;

  if (data.status === "failed" && data.sent_at) {
    const elapsed = Date.now() - new Date(data.sent_at).getTime();
    if (elapsed < FAILED_DISPATCH_RETRY_MS) return true;
  }

  return false;
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
