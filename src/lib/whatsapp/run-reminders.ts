import type { SupabaseClient } from "@supabase/supabase-js";
import {
  priorAutomationRuleKey,
  resolveAutomationMessageBody,
} from "@/lib/whatsapp/automation-templates";
import {
  alreadyDispatched,
  alreadyDispatchedForRecipient,
  claimDispatch,
  isPhoneOptedOut,
  isPostStatusSendDue,
  isRuleDueNow,
  isSurgeryPostopRule,
  loadCandidateAppointments,
  loadSurgeryPostopCandidates,
  normalizePhoneDigits,
  priorRuleSent,
  type AppointmentForAutomation,
  type MessageRule,
} from "@/lib/whatsapp/automations";
import { isWithin24hWindowForContact } from "@/lib/whatsapp/service-window";

export type ReminderRunStats = {
  checked: number;
  sent: number;
  skipped: number;
  failures: string[];
};

export type ReminderRunDeps = {
  /** WhatsApp gönderimi — testlerde stub'lanır. */
  sendText: (phone: string, body: string) => Promise<{ messageId: string | null }>;
  now?: Date;
};

/**
 * Aktif kurallar için aday randevuları tarar ve mesajları gönderir.
 *
 * Mükerrer gönderim savunmaları (sırayla):
 *   1. alreadyDispatched        — aynı randevu+kural terminal/aktif mi
 *   2. alreadyDispatchedForRecipient — aynı kişi + aynı randevu günü
 *   3. claimDispatch            — gönderimden önce 'pending' kilidi
 *   4. claim sonrası tekrar alıcı kontrolü (yarış durumu)
 *   5. API kabul eder etmez 'sent' — sonraki adımlar patlasa da tekrar gitmez
 */
export async function runAutomationReminders(
  supabase: SupabaseClient,
  rules: MessageRule[],
  deps: ReminderRunDeps,
): Promise<ReminderRunStats> {
  const now = deps.now ?? new Date();
  let sent = 0;
  let skipped = 0;
  let checked = 0;
  const failures: string[] = [];

  for (const rule of rules) {
    let appointments: AppointmentForAutomation[];
    try {
      appointments = isSurgeryPostopRule(rule.key)
        ? await loadSurgeryPostopCandidates(supabase, now)
        : await loadCandidateAppointments(supabase, rule, now);
    } catch (err) {
      failures.push(
        `${rule.key}: ${err instanceof Error ? err.message : "randevu sorgu"}`,
      );
      continue;
    }

    for (const appointment of appointments) {
      checked += 1;

      if (isSurgeryPostopRule(rule.key)) {
        // Aday listesi zaten "bugün ameliyat_edildi'ye taşındı" filtresinden geçti
        const changedAt = appointment.status_changed_at;
        if (
          !changedAt ||
          !isPostStatusSendDue(changedAt, rule.send_at_local_time, now)
        ) {
          continue;
        }
      } else if (!isRuleDueNow(rule, appointment.starts_at, now)) {
        continue;
      }

      if (await alreadyDispatched(supabase, appointment.id, rule.key)) {
        continue;
      }

      const priorRuleKey = priorAutomationRuleKey(rule.key);
      if (
        priorRuleKey &&
        !(await priorRuleSent(supabase, appointment.id, priorRuleKey))
      ) {
        continue;
      }

      const phone = appointment.contact?.phone
        ? normalizePhoneDigits(appointment.contact.phone)
        : "";
      if (!phone || !appointment.contact) {
        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact?.id ?? null,
            phone: phone || null,
            template_name: rule.template_name,
            status: "skipped",
            error: "Telefon yok",
          },
          { onConflict: "appointment_id,rule_key" },
        );
        skipped += 1;
        continue;
      }

      if (await isPhoneOptedOut(supabase, phone)) {
        await supabase.from("message_dispatches").upsert(
          {
            appointment_id: appointment.id,
            rule_key: rule.key,
            contact_id: appointment.contact.id,
            phone,
            template_name: rule.template_name,
            status: "skipped",
            error: "Opt-out",
          },
          { onConflict: "appointment_id,rule_key" },
        );
        skipped += 1;
        continue;
      }

      const windowOpen = await isWithin24hWindowForContact(
        supabase,
        appointment.contact.id,
      );
      if (!windowOpen) {
        // Kalıcı skip yazma — pencere açılırsa due süresi içinde tekrar dene
        skipped += 1;
        continue;
      }

      const body = resolveAutomationMessageBody(
        rule.key,
        appointment.contact.name,
        appointment.starts_at,
      );
      if (!body?.trim()) {
        failures.push(`${rule.key}/${appointment.id}: mesaj metni yok`);
        continue;
      }

      // Aynı kişiye, aynı gün için bu kural zaten gittiyse tekrar gönderme
      if (
        await alreadyDispatchedForRecipient(supabase, {
          contactId: appointment.contact.id,
          phone,
          ruleKey: rule.key,
          appointmentStartsAt: appointment.starts_at,
        })
      ) {
        skipped += 1;
        continue;
      }

      // Gönderimden önce kilitle — aynı randevu+kural için çift gönderimi engeller
      const claimed = await claimDispatch(supabase, {
        appointmentId: appointment.id,
        ruleKey: rule.key,
        contactId: appointment.contact.id,
        phone,
        templateName: rule.template_name,
      });
      if (!claimed) continue;

      // Claim sonrası: aynı kişiye başka randevudan kilit/gönderim var mı?
      if (
        await alreadyDispatchedForRecipient(supabase, {
          contactId: appointment.contact.id,
          phone,
          ruleKey: rule.key,
          appointmentStartsAt: appointment.starts_at,
          excludeAppointmentId: appointment.id,
        })
      ) {
        await supabase
          .from("message_dispatches")
          .update({
            status: "skipped",
            error: "Aynı kişiye bu kural zaten gönderildi/kilitli",
            sent_at: new Date().toISOString(),
          })
          .eq("appointment_id", appointment.id)
          .eq("rule_key", rule.key)
          .eq("status", "pending");
        skipped += 1;
        continue;
      }

      let waMessageId: string | null = null;
      try {
        const response = await deps.sendText(phone, body);
        waMessageId = response.messageId;

        console.info("[cron/reminders] text accepted", {
          rule: rule.key,
          phone,
          waMessageId,
        });

        // API kabul eder etmez "sent" yaz — sonraki adımlar patlasa bile tekrar gitmesin
        const { error: markSentError } = await supabase
          .from("message_dispatches")
          .update({
            contact_id: appointment.contact.id,
            phone,
            template_name: rule.template_name,
            wa_message_id: waMessageId,
            status: "sent",
            error: null,
            sent_at: new Date().toISOString(),
          })
          .eq("appointment_id", appointment.id)
          .eq("rule_key", rule.key);

        if (markSentError) {
          console.error("[cron/reminders] mark sent failed", {
            rule: rule.key,
            appointmentId: appointment.id,
            waMessageId,
            error: markSentError.message,
          });
          failures.push(
            `${rule.key}/${appointment.id}: gönderildi ama dispatch yazılamadı (${markSentError.message})`,
          );
        }

        if (rule.key === "appt_1d") {
          await supabase
            .from("appointments")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", appointment.id)
            .is("reminder_sent_at", null);
        }

        const { data: conversation } = await supabase
          .from("conversations")
          .upsert(
            {
              contact_id: appointment.contact.id,
              lead_id: appointment.lead_id,
              wa_phone: phone,
              contact_name: appointment.contact.name,
              last_message_at: new Date().toISOString(),
              status: "open",
            },
            { onConflict: "contact_id" },
          )
          .select("id")
          .single();

        if (conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            wa_message_id: waMessageId,
            direction: "outbound",
            body,
            status: "sent",
            automated: true,
            source: "system",
            raw_payload: {
              appointment_id: appointment.id,
              rule_key: rule.key,
              channel: "text",
            },
          });
        }

        sent += 1;
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "Bilinmeyen hata";
        failures.push(`${rule.key}/${appointment.id}: ${message}`);

        // WhatsApp'a gittiyse failed'e çekme — yoksa sonra yeniden spam olur
        if (!waMessageId) {
          await supabase
            .from("message_dispatches")
            .update({
              contact_id: appointment.contact.id,
              phone,
              template_name: rule.template_name,
              status: "failed",
              error: message,
              sent_at: new Date().toISOString(),
              wa_message_id: null,
            })
            .eq("appointment_id", appointment.id)
            .eq("rule_key", rule.key);
        } else {
          console.error("[cron/reminders] post-send bookkeeping failed", {
            rule: rule.key,
            appointmentId: appointment.id,
            waMessageId,
            error: message,
          });
        }
      }
    }
  }

  return { checked, sent, skipped, failures };
}
