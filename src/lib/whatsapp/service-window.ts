import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export function isWhatsAppServiceWindowOpen(
  lastInboundAt: string | null | undefined,
): boolean {
  if (!lastInboundAt) return false;
  return (
    Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000
  );
}

/** Last inbound message on conversation within 24h customer care window. */
export async function isWithin24hWindow(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return isWhatsAppServiceWindowOpen(data?.created_at);
}

/** Contact’a bağlı konuşmada serbest mesaj penceresi açık mı (DB üzerinden). */
export async function isWithin24hWindowForContact(
  supabase: SupabaseClient,
  contactId: string,
): Promise<boolean> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (!conversation?.id) return false;
  return isWithin24hWindow(supabase, conversation.id);
}

export function isConversationLockFresh(
  lockedAt: string | null | undefined,
): boolean {
  if (!lockedAt) return false;
  return Date.now() - new Date(lockedAt).getTime() < 15 * 60 * 1000;
}
