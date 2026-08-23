"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WhatsAppUnreadContextValue = {
  unreadConversations: number;
  setUnreadConversations: (count: number) => void;
};

const WhatsAppUnreadContext = createContext<WhatsAppUnreadContextValue | null>(
  null,
);

export function WhatsAppUnreadProvider({
  children,
  initialUnread = 0,
}: {
  children: ReactNode;
  initialUnread?: number;
}) {
  const [unreadConversations, setUnreadConversations] = useState(initialUnread);
  const value = useMemo(
    () => ({ unreadConversations, setUnreadConversations }),
    [unreadConversations],
  );
  return (
    <WhatsAppUnreadContext.Provider value={value}>
      {children}
    </WhatsAppUnreadContext.Provider>
  );
}

export function useWhatsAppUnread() {
  const ctx = useContext(WhatsAppUnreadContext);
  return ctx ?? { unreadConversations: 0, setUnreadConversations: () => {} };
}

export function useSetWhatsAppUnread() {
  const { setUnreadConversations } = useWhatsAppUnread();
  return useCallback(
    (count: number) => {
      setUnreadConversations(Math.max(0, count));
    },
    [setUnreadConversations],
  );
}
