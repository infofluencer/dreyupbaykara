import "server-only";

import { assertWhatsAppSendConfig } from "@/lib/whatsapp/config";
import { sendMessage, sendTemplateMessage } from "@/lib/whatsapp/send-message";

type WhatsAppSendResponse = {
  messages?: Array<{ id: string }>;
  error?: { message?: string; code?: number };
};

async function postLegacy(
  payload: Record<string, unknown>,
): Promise<{ messageId: string }> {
  const { phoneId, token, apiVersion } = assertWhatsAppSendConfig();

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const data = (await response.json()) as WhatsAppSendResponse;
  const messageId = data.messages?.[0]?.id;
  if (!response.ok || !messageId) {
    console.error("[whatsapp] legacy send failed", data.error);
    throw new Error(
      data.error?.message || `WhatsApp send failed (${response.status})`,
    );
  }
  return { messageId };
}

/** Used by cron reminders — no conversation row context. */
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<{ messageId: string }> {
  return postLegacy({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: false, body },
  });
}

/** Used by cron reminders — no conversation row context. */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode = "tr",
): Promise<{ messageId: string }> {
  return postLegacy({
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  });
}

export { sendMessage, sendTemplateMessage };
