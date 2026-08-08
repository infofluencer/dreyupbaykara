import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";

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

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localParts(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    day: weekdayMap[parts.weekday] ?? 1,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function isBusinessHours(settings: BotSettings): boolean {
  const local = localParts(settings.timezone);
  return (
    settings.business_days.includes(local.day) &&
    local.time >= settings.business_start.slice(0, 5) &&
    local.time < settings.business_end.slice(0, 5)
  );
}

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

  const normalized = normalize(inboundText);
  const { data: faqs } = await supabase
    .from("bot_faqs")
    .select("answer, keywords")
    .eq("enabled", true)
    .order("sort_order");

  const faq = faqs?.find((item) =>
    (item.keywords as string[]).some((keyword) =>
      normalized.includes(normalize(keyword)),
    ),
  );

  let reply = faq?.answer as string | undefined;

  if (!reply) {
    const { data: recentAutomated } = await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conversationId)
      .eq("automated", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAutomated) {
      const elapsed = Date.now() - new Date(recentAutomated.created_at).getTime();
      if (elapsed < 8 * 60 * 60 * 1000) return;
    }

    if (!isBusinessHours(settings)) {
      reply = settings.after_hours_message;
    } else {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("direction", "inbound");
      reply = (count ?? 0) <= 1
        ? settings.welcome_message
        : settings.fallback_message;
    }
  }

  if (!reply) return;
  const response = await sendWhatsAppText(phone, reply);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: response.messageId,
    direction: "outbound",
    body: reply,
    status: "sent",
    automated: true,
  });
}

