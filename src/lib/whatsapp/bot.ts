import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isWithinBusinessHours } from "@/lib/whatsapp/bot-hours";
import { composeBotReply, matchBotFaqs } from "@/lib/whatsapp/bot-match";
import { resolveUnmatchedReply } from "@/lib/whatsapp/bot-unmatched";
import { sendMessage } from "@/lib/whatsapp/send-message";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";

type BotSettings = {
  enabled: boolean;
  timezone: string;
  business_days: number[];
  business_start: string;
  business_end: string;
  welcome_message: string;
  after_hours_message: string;
  fallback_message: string;
};

/** Asistan panelden yazdıysa bot bu süre karışmaz. */
const ASSISTANT_QUIET_MS = 30 * 60 * 1000;
/** Aynı konuşmada otomatik SSS tekrarı. */
const FAQ_COOLDOWN_MS = 10 * 60 * 1000;

export async function maybeReplyWithBot(options: {
  supabase: SupabaseClient;
  conversationId: string;
  phone: string;
  inboundText: string;
}): Promise<void> {
  const { supabase, conversationId, phone, inboundText } = options;
  const { data: settings } = await supabase
    .from("bot_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle<BotSettings>();

  if (!settings?.enabled || !inboundText.trim()) return;

  // Kapı: mesai içinde bot tamamen susar — asistan cevaplar.
  if (isWithinBusinessHours(settings)) return;

  const assistantSince = new Date(Date.now() - ASSISTANT_QUIET_MS).toISOString();

  const [{ data: recentAssistant }, { data: recentAutomated }, { data: faqs }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("created_at")
        .eq("conversation_id", conversationId)
        .eq("direction", "outbound")
        .eq("source", "panel")
        .eq("automated", false)
        .gte("created_at", assistantSince)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("body, created_at")
        .eq("conversation_id", conversationId)
        .eq("automated", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bot_faqs")
        .select("question, answer, keywords, sort_order")
        .eq("enabled", true)
        .order("sort_order"),
    ]);

  // Mesai dışı olsa bile asistan son 30 dk’da yazdıysa karışma.
  if (recentAssistant) return;

  const lastAutomatedAt = recentAutomated
    ? new Date(recentAutomated.created_at).getTime()
    : null;

  let reply = composeBotReply(
    matchBotFaqs(inboundText, faqs ?? [], 2),
  );

  if (reply) {
    if (
      lastAutomatedAt != null &&
      Date.now() - lastAutomatedAt < FAQ_COOLDOWN_MS
    ) {
      return;
    }
  } else {
    // Mesai dışı + SSS yok → yalnızca after_hours (welcome/fallback bu kapıda kullanılmaz).
    const unmatched = resolveUnmatchedReply({
      afterHours: true,
      inboundCount: 2,
      lastAutomatedBody: recentAutomated?.body ?? null,
      lastAutomatedAt,
      welcome: settings.welcome_message,
      fallback: settings.fallback_message,
      afterHoursMessage: settings.after_hours_message,
    });

    if (unmatched.kind === "silent" || !unmatched.reply) return;
    reply = unmatched.reply;
  }

  if (!reply) return;

  if (isWhatsAppEnabled()) {
    await sendMessage(phone, reply, {
      to: phone,
      conversationId,
      supabase,
      sentBy: null,
      source: "bot",
      automated: true,
    });
    return;
  }

  const response = await sendMessage(phone, reply);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: response.messageId,
    direction: "outbound",
    body: reply,
    status: "sent",
    automated: true,
    source: "bot",
  });
}
