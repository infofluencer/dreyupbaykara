import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertWhatsAppSendConfig, isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type { MessageSource } from "@/lib/whatsapp/ingest";
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

export class WhatsAppSendError extends Error {
  readonly status: number;
  readonly raw: unknown;

  constructor(message: string, status: number, raw?: unknown) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
    this.raw = raw;
  }
}

type CloudSendResponse = {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
    code?: number | string;
    reason?: string;
    error_subcode?: number;
    type?: string;
    docs?: string;
  };
};

export type OutboundContext = {
  to: string;
  conversationId: string;
  supabase: SupabaseClient;
  sentBy: string | null;
  source: MessageSource;
  automated: boolean;
  bodyOverride?: string;
  extraPayload?: Record<string, unknown>;
};

function normalizePhone(to: string | null | undefined): string {
  return normalizeWhatsAppPhone(to);
}

function parseResponseBody(text: string): CloudSendResponse {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as CloudSendResponse;
  } catch {
    return { error: { message: text } };
  }
}

function dualhookNotRoutableMessage(reason: string | undefined): string {
  return `WhatsApp bağlantısı şu an aktif değil (sebep: ${reason || "unknown"}).`;
}

/**
 * Graph-compatible POST to Dualhook Runtime API or Meta, host from env.
 */
export async function postWhatsAppCloudPayload(
  payload: Record<string, unknown>,
): Promise<{ messageId: string; raw: CloudSendResponse }> {
  const config = assertWhatsAppSendConfig();
  const url = `${config.apiBase}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rawText = await response.text();
  const data = parseResponseBody(rawText);
  const messageId = data.messages?.[0]?.id;
  const errorCode = data.error?.code;
  const reason =
    typeof data.error?.reason === "string" ? data.error.reason : undefined;

  if (response.status === 403 && errorCode === "connection_not_routable") {
    console.error("[whatsapp] connection_not_routable", {
      reason,
      status: response.status,
      body: data,
    });
    throw new WhatsAppSendError(
      dualhookNotRoutableMessage(reason),
      403,
      data,
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    console.error("[whatsapp] rate limited", {
      retryAfter,
      status: 429,
      body: data,
    });
    const waitHint = retryAfter
      ? ` ${retryAfter} saniye sonra tekrar deneyin.`
      : " Kısa bir süre sonra tekrar deneyin.";
    throw new WhatsAppSendError(
      `WhatsApp gönderim limiti aşıldı.${waitHint}`,
      429,
      data,
    );
  }

  if (!response.ok || !messageId) {
    console.error("[whatsapp] send failed", {
      status: response.status,
      code: errorCode,
      reason,
      subcode: data.error?.error_subcode,
      message: data.error?.message,
      body: data,
    });
    throw new WhatsAppSendError(
      data.error?.message || `WhatsApp gönderimi başarısız (HTTP ${response.status}).`,
      response.status,
      data,
    );
  }

  return { messageId, raw: data };
}

async function persistOutbound(
  context: OutboundContext,
  patch: {
    waMessageId?: string | null;
    status: "sent" | "failed";
    body: string;
    rawPayload: Record<string, unknown>;
  },
) {
  const row = {
    conversation_id: context.conversationId,
    direction: "outbound" as const,
    body: patch.body,
    status: patch.status,
    source: context.source,
    sent_by: context.sentBy,
    automated: context.automated,
    raw_payload: patch.rawPayload,
    ...(patch.waMessageId ? { wa_message_id: patch.waMessageId } : {}),
  };

  if (patch.waMessageId && patch.status === "sent") {
    const { error } = await context.supabase.from("messages").upsert(row, {
      onConflict: "wa_message_id",
      ignoreDuplicates: true,
    });
    if (error && error.code !== "23505") {
      console.error("[whatsapp] outbound persist:", error.message);
    }
    return;
  }

  const { error } = await context.supabase.from("messages").insert(row);
  if (error) {
    console.error("[whatsapp] outbound persist:", error.message);
  }
}

/**
 * Free-text outbound. When disabled, returns a local id (caller persists).
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
    await persistOutbound(context, {
      status: "failed",
      body,
      rawPayload: { error: "24h customer care window closed" },
    });
    throw new WhatsAppSendError(
      "24 saatlik müşteri hizmeti penceresi kapalı; şablon mesaj gerekir.",
      403,
    );
  }

  try {
    const result = await postWhatsAppCloudPayload({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    });

    await persistOutbound(context, {
      waMessageId: result.messageId,
      status: "sent",
      body,
      rawPayload: { ...result.raw, ...(context.extraPayload ?? {}) },
    });

    return {
      messageId: result.messageId,
      storedOnly: false,
      success: true,
    };
  } catch (error) {
    const raw =
      error instanceof WhatsAppSendError ? error.raw : { error: String(error) };
    await persistOutbound(context, {
      status: "failed",
      body,
      rawPayload: {
        ...(typeof raw === "object" && raw ? (raw as Record<string, unknown>) : { raw }),
        ...(context.extraPayload ?? {}),
      },
    });
    throw error;
  }
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
  const body = context.bodyOverride ?? `[Şablon: ${templateName}]`;
  const extra = {
    template_name: templateName,
    language_code: languageCode,
    ...(context.extraPayload ?? {}),
  };

  try {
    const result = await postWhatsAppCloudPayload({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template,
    });

    await persistOutbound(context, {
      waMessageId: result.messageId,
      status: "sent",
      body,
      rawPayload: { ...extra, ...result.raw },
    });

    return {
      messageId: result.messageId,
      storedOnly: false,
      success: true,
    };
  } catch (error) {
    const raw =
      error instanceof WhatsAppSendError ? error.raw : { error: String(error) };
    await persistOutbound(context, {
      status: "failed",
      body,
      rawPayload: {
        ...extra,
        ...(typeof raw === "object" && raw ? (raw as Record<string, unknown>) : { raw }),
      },
    });
    throw error;
  }
}
