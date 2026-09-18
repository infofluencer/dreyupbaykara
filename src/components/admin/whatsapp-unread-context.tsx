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
  const [unreadConversations, setUnreadState] = useState(initialUnread);
  const setUnreadConversations = useCallback((count: number) => {
    setUnreadState(Math.max(0, count));
  }, []);
  const value = useMemo(
    () => ({ unreadConversations, setUnreadConversations }),
    [unreadConversations, setUnreadConversations],
  );
  return (
    <WhatsAppUnreadContext.Provider value={value}>
      {children}
    </WhatsAppUnreadContext.Provider>
  );
}

const FALLBACK: WhatsAppUnreadContextValue = {
  unreadConversations: 0,
  setUnreadConversations: () => {},
};

export function useWhatsAppUnread() {
  return useContext(WhatsAppUnreadContext) ?? FALLBACK;
}

export function useSetWhatsAppUnread() {
  return useWhatsAppUnread().setUnreadConversations;
}
