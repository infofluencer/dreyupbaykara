"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  bindNotificationAudioUnlock,
  playInboundNotificationSound,
} from "@/components/admin/notification-sound";
import { useSetWhatsAppUnread } from "@/components/admin/whatsapp-unread-context";
import { createClient } from "@/lib/supabase/client";

type ConversationRow = {
  id: string;
  contact_name: string | null;
  wa_phone: string | null;
  unread_count: number | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  direction: string;
  body: string | null;
};

const TOAST_VISIBLE = 3;
const BURST_WINDOW_MS = 2500;

function previewText(body: string | null): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Yeni mesaj";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function senderLabel(row: ConversationRow | undefined) {
  if (!row) return "WhatsApp";
  return row.contact_name?.trim() || row.wa_phone || "WhatsApp";
}

async function countUnreadConversations(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const { count, error } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .gt("unread_count", 0);
  if (error) {
    console.error("[wa-notify] unread count:", error.message);
    return 0;
  }
  return count ?? 0;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ClickableToast({
  title,
  description,
  toastId,
  onOpen,
}: {
  title: string;
  description: string;
  toastId: string | number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        toast.dismiss(toastId);
        onOpen();
      }}
      className="flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl bg-[#0b6b45] px-3.5 py-3 text-left text-white shadow-lg shadow-[#0b6b45]/35 transition hover:bg-[#095a3a]"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
        <WhatsAppIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-snug">
          {title}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/85">
          {description}
        </span>
      </span>
    </button>
  );
}

/**
 * Panel-wide WhatsApp listener: inbound toast + sound + sidebar unread badge.
 * Inbox keeps its own realtime for list/thread — this layer only notifies globally.
 */
export function AdminWhatsAppNotifications() {
  const router = useRouter();
  const setUnread = useSetWhatsAppUnread();
  const namesRef = useRef<Map<string, ConversationRow>>(new Map());
  const burstRef = useRef<{
    count: number;
    timer: ReturnType<typeof setTimeout> | null;
    toastId: string | number | null;
  }>({ count: 0, timer: null, toastId: null });
  const seenMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    bindNotificationAudioUnlock();
    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const [{ data: seed }, unread] = await Promise.all([
        // Toast isimleri için yeterli; eksik kalanlar realtime INSERT ile dolar.
        supabase
          .from("conversations")
          .select("id, contact_name, wa_phone, unread_count")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(40),
        countUnreadConversations(supabase),
      ]);
      if (cancelled) return;
      for (const row of seed ?? []) {
        namesRef.current.set(row.id, row as ConversationRow);
      }
      setUnread(unread);
    })();

    const refreshUnread = () => {
      void countUnreadConversations(supabase).then((count) => {
        if (!cancelled) setUnread(count);
      });
    };

    const pushToast = (title: string, description: string, href: string) =>
      toast.custom(
        (toastId) => (
          <ClickableToast
            title={title}
            description={description}
            toastId={toastId}
            onOpen={() => router.push(href)}
          />
        ),
        { duration: 6500 },
      );

    const showInboundToast = (message: MessageRow) => {
      if (seenMessageIds.current.has(message.id)) return;
      seenMessageIds.current.add(message.id);
      if (seenMessageIds.current.size > 200) {
        const first = seenMessageIds.current.values().next().value;
        if (first) seenMessageIds.current.delete(first);
      }

      playInboundNotificationSound();

      const conversation = namesRef.current.get(message.conversation_id);
      const name = senderLabel(conversation);
      const preview = previewText(message.body);
      const href = `/admin/messages?c=${message.conversation_id}`;

      const burst = burstRef.current;
      burst.count += 1;
      if (burst.timer) clearTimeout(burst.timer);
      burst.timer = setTimeout(() => {
        burst.count = 0;
        burst.toastId = null;
      }, BURST_WINDOW_MS);

      if (burst.count >= 3) {
        const groupTitle = `${burst.count} yeni WhatsApp mesajı`;
        const groupDesc = "Gelen kutusunu açmak için tıklayın";
        if (burst.toastId != null) {
          toast.custom(
            (toastId) => (
              <ClickableToast
                title={groupTitle}
                description={groupDesc}
                toastId={toastId}
                onOpen={() => router.push("/admin/messages")}
              />
            ),
            { id: burst.toastId, duration: 7000 },
          );
        } else {
          burst.toastId = pushToast(groupTitle, groupDesc, "/admin/messages");
        }
        return;
      }

      pushToast(name, preview, href);
    };

    const conversationsChannel = supabase
      .channel("wa-global-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) namesRef.current.delete(oldRow.id);
            refreshUnread();
            return;
          }
          const row = payload.new as ConversationRow | null;
          if (!row?.id) return;
          namesRef.current.set(row.id, row);
          refreshUnread();
        },
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("wa-global-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as MessageRow | null;
          if (!row?.id || row.direction !== "inbound") return;
          showInboundToast(row);
          refreshUnread();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      const burst = burstRef.current;
      if (burst.timer) clearTimeout(burst.timer);
      void supabase.removeChannel(conversationsChannel);
      void supabase.removeChannel(messagesChannel);
    };
  }, [router, setUnread]);

  return (
    <Toaster
      position="top-right"
      visibleToasts={TOAST_VISIBLE}
      closeButton
      richColors={false}
      theme="light"
      offset={16}
      toastOptions={{
        classNames: {
          toast: "bg-transparent shadow-none border-0 p-0",
          closeButton:
            "left-auto right-1 top-1 border-white/30 bg-[#0b6b45] text-white hover:bg-[#095a3a]",
        },
      }}
    />
  );
}
