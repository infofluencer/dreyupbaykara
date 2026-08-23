import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateTimeTr, formatTimeTr } from "@/lib/date/tr";
import type { WhatsAppTemplateComponent } from "@/lib/whatsapp/send-message";

export type MessageRule = {
  key: string;
  label: string;
  enabled: boolean;
  template_name: string;
  language: string;
  offset_minutes: number;
  send_at_local_time: string | null;
  appointment_types: string[];
  appointment_statuses: string[];
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

const TIME_ZONE = "Europe/Istanbul";

function istanbulYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function istanbulHm(d: Date): { hour: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    hour: Number(parts.hour ?? 0),
    minute: Number(parts.minute ?? 0),
  };
}

function parseLocalTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Randevu başlangıcından offset kadar önce (UTC ms). */
export function offsetDueAtMs(startsAt: string, offsetMinutes: number): number {
  return new Date(startsAt).getTime() - offsetMinutes * 60 * 1000;
}

/**
 * Kural şu an gönderilmeli mi?
 * Idempotency `message_dispatches` ile; burada sadece due zamanı.
 * - offset > 0: starts_at - offset ≤ now < starts_at
 * - surgery_day: aynı Istanbul günü, local saat ≥ send_at, randevu başlamadan önce
 */
export function isRuleDueNow(
  rule: Pick<MessageRule, "offset_minutes" | "send_at_local_time">,
  startsAt: string,
  now = new Date(),
): boolean {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const t = now.getTime();
  if (t >= start.getTime()) return false;

  if (rule.offset_minutes > 0) {
    const dueAt = offsetDueAtMs(startsAt, rule.offset_minutes);
    return t >= dueAt;
  }

  const local = parseLocalTime(rule.send_at_local_time);
  if (!local) return false;
  if (istanbulYmd(now) !== istanbulYmd(start)) return false;

  const { hour, minute } = istanbulHm(now);
  const nowMinutes = hour * 60 + minute;
  const sendMinutes = local.hour * 60 + local.minute;
  return nowMinutes >= sendMinutes;
}

export function buildTemplateBodyComponents(
  contactName: string | null | undefined,
  startsAt: string,
): WhatsAppTemplateComponent[] {
  const name = (contactName ?? "").trim() || "Değerli hastamız";
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(startsAt));
  const timeLabel = formatTimeTr(startsAt);

  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: dateLabel },
        { type: "text", text: timeLabel },
      ],
    },
  ];
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function previewAutomationBody(
  contactName: string | null,
  startsAt: string,
): string {
  const name = (contactName ?? "").trim() || "Değerli hastamız";
  return `${name} — ${formatDateTimeTr(startsAt)}`;
}

export async function loadEnabledRules(
  supabase: SupabaseClient,
): Promise<MessageRule[]> {
  const { data, error } = await supabase
    .from("message_rules")
    .select(
      "key, label, enabled, template_name, language, offset_minutes, send_at_local_time, appointment_types, appointment_statuses, include_body_params, sort_order",
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
    : ["scheduled", "confirmed"];
  const types = rule.appointment_types?.length
    ? rule.appointment_types
    : ["consultation"];

  // Geniş pencere: 1 gün kuralı için gelecek 2 gün; ameliyat günü için bugün±1
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      lead_id,
      starts_at,
      appointment_type,
      status,
      leads (
        contact_id,
        contacts ( id, phone, name )
      )
    `,
    )
    .in("status", statuses)
    .in("appointment_type", types)
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

export async function alreadyDispatched(
  supabase: SupabaseClient,
  appointmentId: string,
  ruleKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("message_dispatches")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("rule_key", ruleKey)
    .in("status", ["sent", "skipped"])
    .maybeSingle();
  return Boolean(data);
}
