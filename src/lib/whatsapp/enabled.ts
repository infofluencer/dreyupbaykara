import "server-only";

/** Cloud API send/receive. Off until Meta is wired. */
export function isWhatsAppEnabled(): boolean {
  const value = process.env.WHATSAPP_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
