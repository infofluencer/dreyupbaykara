import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { maybeReplyWithBot } from "@/lib/whatsapp/bot";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isWhatsAppEnabled } from "@/lib/whatsapp/enabled";
import { ingestInboundWhatsAppMessage } from "@/lib/whatsapp/ingest";

export const runtime = "nodejs";

type WebhookMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  image?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string; filename?: string };
  audio?: { id?: string };
  video?: { id?: string; caption?: string };
  referral?: { ctwa_clid?: string; source_url?: string };
};

type WebhookMessageEcho = WebhookMessage & { to: string };

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = getWhatsAppConfig().appSecret;
  // TODO: require WHATSAPP_APP_SECRET in production once Meta app secret is set.
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function messageBody(message: WebhookMessage): string | null {
  return (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    message.image?.caption ??
    message.document?.caption ??
    message.video?.caption ??
    null
  );
}

function mediaInfo(message: WebhookMessage) {
  const value =
    message.image ?? message.document ?? message.audio ?? message.video;
  return {
    mediaType: value ? message.type : null,
    mediaId: value?.id ?? null,
  };
}

/** Meta webhook verification — always available for handshake. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token === getWhatsAppConfig().verifyToken
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    console.error("[whatsapp] webhook signature invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    entry?: Array<{
      changes?: Array<{
        value?: {
          contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
          messages?: WebhookMessage[];
          message_echoes?: WebhookMessageEcho[];
          statuses?: Array<{
            id: string;
            status: "sent" | "delivered" | "read" | "failed";
          }>;
        };
      }>;
    }>;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    console.error("[whatsapp] service client missing");
    return NextResponse.json({ received: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      for (const status of value?.statuses ?? []) {
        await supabase
          .from("messages")
          .update({ status: status.status })
          .eq("wa_message_id", status.id);
      }

      for (const echo of value?.message_echoes ?? []) {
        const phone = echo.to.replace(/\D/g, "");
        const { data: contact } = await supabase
          .from("contacts")
          .upsert({ phone }, { onConflict: "phone" })
          .select("id, phone, name")
          .single();
        if (!contact) continue;

        const { data: conversation } = await supabase
          .from("conversations")
          .upsert(
            {
              contact_id: contact.id,
              patient_id: contact.id,
              wa_phone: contact.phone,
              contact_name: contact.name,
              status: "open",
            },
            { onConflict: "contact_id" },
          )
          .select("id")
          .single();
        if (!conversation) continue;

        const media = mediaInfo(echo);
        await supabase.from("messages").upsert(
          {
            conversation_id: conversation.id,
            wa_message_id: echo.id,
            direction: "outbound",
            body: messageBody(echo),
            media_type: media.mediaType,
            media_url: media.mediaId,
            status: "sent",
            automated: false,
            raw_payload: echo,
            created_at: echo.timestamp
              ? new Date(Number(echo.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
          },
          { onConflict: "wa_message_id", ignoreDuplicates: true },
        );
      }

      for (const message of value?.messages ?? []) {
        const phone = message.from;
        const profileName = value?.contacts?.find(
          (contact) => contact.wa_id === phone,
        )?.profile?.name;
        const media = mediaInfo(message);
        const body = messageBody(message);

        const ingested = await ingestInboundWhatsAppMessage(supabase, {
          phone,
          contactName: profileName,
          body,
          waMessageId: message.id,
          timestamp: message.timestamp,
          mediaType: media.mediaType,
          mediaId: media.mediaId,
          rawPayload: message,
          ctwaClid: message.referral?.ctwa_clid ?? null,
        });

        if (!ingested) continue;

        try {
          await maybeReplyWithBot({
            supabase,
            conversationId: ingested.conversationId,
            phone: phone.replace(/\D/g, ""),
            inboundText: body ?? "",
          });
        } catch (error) {
          console.error("[whatsapp] bot:", error);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
