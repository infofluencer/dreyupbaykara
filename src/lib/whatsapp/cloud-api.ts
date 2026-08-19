import "server-only";

import {
  postWhatsAppCloudPayload,
  sendMessage,
  sendTemplateMessage,
} from "@/lib/whatsapp/send-message";

/** Used by cron reminders — no conversation row context. */
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<{ messageId: string }> {
  const result = await postWhatsAppCloudPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: false, body },
  });
  return { messageId: result.messageId };
}

/** Used by cron reminders — no conversation row context. */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode = "tr",
): Promise<{ messageId: string }> {
  const result = await postWhatsAppCloudPayload({
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  });
  return { messageId: result.messageId };
}

export { sendMessage, sendTemplateMessage };
