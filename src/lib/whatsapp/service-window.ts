export function isWhatsAppServiceWindowOpen(
  lastInboundAt: string | null | undefined,
): boolean {
  if (!lastInboundAt) return false;
  return (
    Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000
  );
}

export function isConversationLockFresh(
  lockedAt: string | null | undefined,
): boolean {
  if (!lockedAt) return false;
  return Date.now() - new Date(lockedAt).getTime() < 15 * 60 * 1000;
}

