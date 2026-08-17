import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWhatsAppSendConfig } from "@/lib/whatsapp/config";
import { isWhatsAppEnabled } from "@/lib/whatsapp/enabled";
import { isWithin24hWindow } from "@/lib/whatsapp/service-window";

export type SendMessageResult = {
  messageId: string;
  storedOnly: boolean;
  success: boolean;
};

export type WhatsAppTemplateComponent = {
  type: string;
  sub_type?: string;
  index?: number;
  parameters?: Array<Record<string, unknown>>;
};

type MetaSendResponse = {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
  };
};

type OutboundContext = {
  to: string;
  conversationId: string;
  dbMessageId: string;
  supabase: SupabaseClient;
};

function normalizePhone(to: string): string {
  return to.replace(/\D/g, "");
}

async function postWhatsAppPayload(
  payload: Record<string, unknown>,
): Promise<{ messageId?: string; error?: MetaSendResponse["error"] }> {
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

  const data = (await response.json()) as MetaSendResponse;
  const messageId = data.messages?.[0]?.id;

  if (!response.ok || !messageId) {
    console.error("[whatsapp] send failed", {
      status: response.status,
      code: data.error?.code,
      subcode: data.error?.error_subcode,
      message: data.error?.message,
    });
    return { error: data.error ?? { message: `HTTP ${response.status}` } };
  }

  return { messageId };
}

async function markOutboundMessage(
  supabase: SupabaseClient,
  dbMessageId: string,
  patch: {
    wa_message_id?: string | null;
    status: "sent" | "failed";
    raw_payload?: Record<string, unknown>;
  },
) {
  await supabase.from("messages").update(patch).eq("id", dbMessageId);
}

/**
 * Free-text outbound. When disabled, returns a local id (caller persists).
 * When enabled, expects a pending DB row and updates it to sent/failed.
 */
export async function sendMessage(
  to: string,
  body: string,
  context?: OutboundContext,
): Promise<SendMessageResult> {
  if (!isWhatsAppEnabled()) {
    console.info("WA disabled, message stored only");
    return {
      messageId: `local_${crypto.randomUUID()}`,
      storedOnly: true,
      success: true,
    };
  }

  if (!context) {
    throw new Error("sendMessage requires conversation context when WA is enabled.");
  }

  const phone = normalizePhone(to);
  const windowOpen = await isWithin24hWindow(
    context.supabase,
    context.conversationId,
  );

  if (!windowOpen) {
    console.error("[whatsapp] send blocked: 24h window closed", {
      conversationId: context.conversationId,
    });
    await markOutboundMessage(context.supabase, context.dbMessageId, {
      status: "failed",
      raw_payload: { error: "24h customer care window closed" },
    });
    return {
      messageId: "",
      storedOnly: false,
      success: false,
    };
  }

  const result = await postWhatsAppPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  });

  if (!result.messageId) {
    await markOutboundMessage(context.supabase, context.dbMessageId, {
      status: "failed",
      raw_payload: { meta_error: result.error ?? null },
    });
    return { messageId: "", storedOnly: false, success: false };
  }

  await markOutboundMessage(context.supabase, context.dbMessageId, {
    wa_message_id: result.messageId,
    status: "sent",
  });

  return {
    messageId: result.messageId,
    storedOnly: false,
    success: true,
  };
}

/** Template outbound — usable outside the 24h window. */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode = "tr",
  components?: WhatsAppTemplateComponent[],
  context?: OutboundContext,
): Promise<SendMessageResult> {
  if (!isWhatsAppEnabled()) {
    console.info("WA disabled, message stored only");
    return {
      messageId: `local_${crypto.randomUUID()}`,
      storedOnly: true,
      success: true,
    };
  }

  if (!context) {
    throw new Error(
      "sendTemplateMessage requires conversation context when WA is enabled.",
    );
  }

  const phone = normalizePhone(to);
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components?.length) {
    template.components = components;
  }

  const result = await postWhatsAppPayload({
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template,
  });

  if (!result.messageId) {
    await markOutboundMessage(context.supabase, context.dbMessageId, {
      status: "failed",
      raw_payload: {
        template_name: templateName,
        language_code: languageCode,
        meta_error: result.error ?? null,
      },
    });
    return { messageId: "", storedOnly: false, success: false };
  }

  await markOutboundMessage(context.supabase, context.dbMessageId, {
    wa_message_id: result.messageId,
    status: "sent",
  });

  return {
    messageId: result.messageId,
    storedOnly: false,
    success: true,
  };
}
