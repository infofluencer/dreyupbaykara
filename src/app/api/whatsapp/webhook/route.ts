import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { maybeReplyWithBot } from "@/lib/whatsapp/bot";

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
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
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

function extractLeadRef(body: string | null): string | null {
  return body?.match(/\bRef:\s*([A-Z0-9]{6,12})\b/i)?.[1]?.toUpperCase() ?? null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Geçersiz imza" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client yapılandırılmamış" },
      { status: 503 },
    );
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
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
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
        const phone = echo.to;
        const { data: contact, error: contactError } = await supabase
          .from("contacts")
          .upsert({ phone }, { onConflict: "phone" })
          .select("id")
          .single();
        if (contactError || !contact) continue;

        let { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lead) {
          const result = await supabase
            .from("leads")
            .insert({
              contact_id: contact.id,
              channel: "whatsapp_business_app",
            })
            .select("id")
            .single();
          lead = result.data;
        }

        const { data: conversation } = await supabase
          .from("conversations")
          .upsert(
            {
              contact_id: contact.id,
              lead_id: lead?.id ?? null,
              last_message_at: new Date().toISOString(),
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

        const { data: contact, error: contactError } = await supabase
          .from("contacts")
          .upsert(
            { phone, name: profileName || phone },
            { onConflict: "phone" },
          )
          .select("id")
          .single();
        if (contactError || !contact) {
          console.error("[whatsapp] contact:", contactError?.message);
          continue;
        }

        const body = messageBody(message);
        const leadRef = extractLeadRef(body);
        let leadId: string | null = null;

        if (leadRef) {
          const { data: source } = await supabase
            .from("lead_sources")
            .select("*")
            .eq("lead_ref", leadRef)
            .maybeSingle();

          if (source?.matched_lead_id) {
            leadId = source.matched_lead_id;
          } else if (source) {
            const { data: lead } = await supabase
              .from("leads")
              .insert({
                contact_id: contact.id,
                site: source.site,
                channel: source.channel,
                campaign: source.campaign,
                utm_source: source.utm_source,
                utm_medium: source.utm_medium,
                utm_campaign: source.utm_campaign,
                gclid: source.gclid,
                fbclid: source.fbclid,
                ctwa_clid: message.referral?.ctwa_clid ?? null,
                lead_ref: leadRef,
              })
              .select("id")
              .single();
            leadId = lead?.id ?? null;
            if (leadId) {
              await supabase
                .from("lead_sources")
                .update({
                  matched_lead_id: leadId,
                  matched_at: new Date().toISOString(),
                })
                .eq("id", source.id);
            }
          }
        }

        if (!leadId) {
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("contact_id", contact.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          leadId = existingLead?.id ?? null;
        }

        if (!leadId) {
          const { data: lead } = await supabase
            .from("leads")
            .insert({
              contact_id: contact.id,
              channel: message.referral ? "meta_ctwa" : "whatsapp",
              ctwa_clid: message.referral?.ctwa_clid ?? null,
            })
            .select("id")
            .single();
          leadId = lead?.id ?? null;
        }

        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .upsert(
            {
              contact_id: contact.id,
              lead_id: leadId,
              last_message_at: new Date().toISOString(),
            },
            { onConflict: "contact_id" },
          )
          .select("id")
          .single();
        if (conversationError || !conversation) {
          console.error(
            "[whatsapp] conversation:",
            conversationError?.message,
          );
          continue;
        }

        const media = mediaInfo(message);
        const { error: messageError } = await supabase.from("messages").insert({
          conversation_id: conversation.id,
          wa_message_id: message.id,
          direction: "inbound",
          body,
          media_type: media.mediaType,
          media_url: media.mediaId,
          status: "delivered",
          raw_payload: message,
          created_at: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });

        if (messageError?.code === "23505") continue;
        if (messageError) {
          console.error("[whatsapp] message:", messageError.message);
          continue;
        }

        try {
          await maybeReplyWithBot({
            supabase,
            conversationId: conversation.id,
            phone,
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

