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

export function isConversationLockFresh(
  lockedAt: string | null | undefined,
): boolean {
  if (!lockedAt) return false;
  return Date.now() - new Date(lockedAt).getTime() < 15 * 60 * 1000;
}
