import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { maybeReplyWithBot } from "@/lib/whatsapp/bot";
import { getWhatsAppConfig, isWhatsAppEnabled } from "@/lib/whatsapp/config";
import {
  ingestInboundWhatsAppMessage,
  ingestWhatsAppAppEcho,
} from "@/lib/whatsapp/ingest";

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

type WebhookChangeValue = {
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WebhookMessage[];
  message_echoes?: WebhookMessageEcho[];
  statuses?: Array<{
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
  }>;
  history?: unknown;
  state_sync?: unknown;
  [key: string]: unknown;
};

type WebhookChange = {
  field?: string;
  value?: WebhookChangeValue;
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: WebhookChange[];
  }>;
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = getWhatsAppConfig().appSecret;
  if (!secret || !signature?.startsWith("sha256=")) return false;

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualHex = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expectedHex, "utf8");
  const actualBuffer = Buffer.from(actualHex, "utf8");
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

function stubCoexistenceSync(
  field: "history" | "smb_app_state_sync",
  change: WebhookChange,
) {
  const value = change.value ?? {};
  console.info("[whatsapp] coexistence sync stub", {
    field,
    valueKeys: Object.keys(value),
  });
}

async function handleStatuses(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  statuses: NonNullable<WebhookChangeValue["statuses"]>,
) {
  for (const status of statuses) {
    await supabase
      .from("messages")
      .update({ status: status.status })
      .eq("wa_message_id", status.id);
  }
}

async function handleSmbMessageEchoes(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  change: WebhookChange,
) {
  for (const echo of change.value?.message_echoes ?? []) {
    const media = mediaInfo(echo);
    await ingestWhatsAppAppEcho(supabase, {
      phone: echo.to,
      body: messageBody(echo),
      waMessageId: echo.id,
      timestamp: echo.timestamp,
      mediaType: media.mediaType,
      mediaId: media.mediaId,
      rawPayload: change,
    });
  }
}

async function handleInboundMessages(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  value: WebhookChangeValue,
) {
  for (const message of value.messages ?? []) {
    const phone = message.from;
    const profileName = value.contacts?.find(
      (contact) => contact.wa_id === phone,
    )?.profile?.name;
    const media = mediaInfo(message);
    const body = messageBody(message);
    const fromAd = Boolean(message.referral);

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
      fromAd,
    });

    if (!ingested?.created) continue;

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
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    console.error("[whatsapp] webhook signature invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ received: true, skipped: true });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
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
      const field = change.field ?? "";
      const value = change.value;

      if (field === "history") {
        stubCoexistenceSync("history", change);
        continue;
      }
      if (field === "smb_app_state_sync") {
        stubCoexistenceSync("smb_app_state_sync", change);
        continue;
      }
      if (field === "smb_message_echoes") {
        await handleSmbMessageEchoes(supabase, change);
        continue;
      }
      if (field === "messages" || (!field && value)) {
        await handleStatuses(supabase, value?.statuses ?? []);
        await handleInboundMessages(supabase, value ?? {});
        if (value?.message_echoes?.length) {
          await handleSmbMessageEchoes(supabase, change);
        }
        continue;
      }

      console.warn("[whatsapp] unhandled webhook field", field || "(empty)");
    }
  }

  return NextResponse.json({ received: true });
}
