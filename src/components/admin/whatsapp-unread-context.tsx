"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type SetUnread = (count: number) => void;

const WhatsAppUnreadCountContext = createContext(0);
const WhatsAppUnreadSetContext = createContext<SetUnread>(() => {});

export function WhatsAppUnreadProvider({
  children,
  initialUnread = 0,
}: {
  children: ReactNode;
  initialUnread?: number;
}) {
  const [unreadConversations, setUnreadState] = useState(initialUnread);
  const setUnreadConversations = useCallback<SetUnread>((count) => {
    const next = Math.max(0, count);
    setUnreadState((prev) => (prev === next ? prev : next));
  }, []);

  return (
    <WhatsAppUnreadSetContext.Provider value={setUnreadConversations}>
      <WhatsAppUnreadCountContext.Provider value={unreadConversations}>
        {children}
      </WhatsAppUnreadCountContext.Provider>
    </WhatsAppUnreadSetContext.Provider>
  );
}

export function useWhatsAppUnread() {
  return {
    unreadConversations: useContext(WhatsAppUnreadCountContext),
    setUnreadConversations: useContext(WhatsAppUnreadSetContext),
  };
}

/** Setter-only hook — does not re-render when the unread count changes. */
export function useSetWhatsAppUnread() {
  return useContext(WhatsAppUnreadSetContext);
}
