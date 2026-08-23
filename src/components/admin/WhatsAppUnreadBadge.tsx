"use client";

import { useWhatsAppUnread } from "@/components/admin/whatsapp-unread-context";

/** Unread conversation count badge for WhatsApp nav items. */
export function WhatsAppUnreadBadge() {
  const { unreadConversations } = useWhatsAppUnread();
  if (unreadConversations <= 0) return null;
  const label = unreadConversations > 99 ? "99+" : String(unreadConversations);
  return (
    <span
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#e11d48] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${unreadConversations} okunmamış konuşma`}
    >
      {label}
    </span>
  );
}
