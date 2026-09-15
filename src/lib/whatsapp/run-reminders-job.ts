import "server-only";

import { advanceFinishedAppointments } from "@/lib/crm/appointment-pipeline";
import { createServiceClient } from "@/lib/supabase/admin";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/cloud-api";
import { loadEnabledRules } from "@/lib/whatsapp/automations";
import { runAutomationReminders } from "@/lib/whatsapp/run-reminders";

export type RemindersJobResult = {
  appointmentsCompleted: number;
  leadsAdvanced: number;
  checked: number;
  sent: number;
  skipped: number;
  failures: string[];
  rules: string[];
  note?: string;
};

/**
 * Durum taşıması + WhatsApp hatırlatmaları.
 * HTTP cron (`/api/cron/reminders`) ve Dokploy süreç içi zamanlayıcı aynı işi çalıştırır.
 */
export async function runRemindersJob(
  now = new Date(),
): Promise<RemindersJobResult> {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client yok");
  }

  const pipeline = await advanceFinishedAppointments(supabase, now);

  if (!isWhatsAppEnabled()) {
    return {
      ...pipeline,
      checked: 0,
      sent: 0,
      skipped: 0,
      failures: pipeline.pipelineFailures,
      rules: [],
      note: "WHATSAPP_ENABLED kapalı — sadece durum taşıması yapıldı",
    };
  }

  const rules = await loadEnabledRules(supabase);
  if (!rules.length) {
    return {
      ...pipeline,
      checked: 0,
      sent: 0,
      skipped: 0,
      failures: pipeline.pipelineFailures,
      rules: [],
      note: "Aktif kural yok — /admin/automations",
    };
  }

  const run = await runAutomationReminders(supabase, rules, {
    now,
    sendTemplate: ({ phone, templateName, language, components }) =>
      sendWhatsAppTemplate(phone, templateName, language, components),
  });

  return {
    appointmentsCompleted: pipeline.appointmentsCompleted,
    leadsAdvanced: pipeline.leadsAdvanced,
    checked: run.checked,
    sent: run.sent,
    skipped: run.skipped,
    failures: [...pipeline.pipelineFailures, ...run.failures],
    rules: rules.map((r) => r.key),
  };
}
