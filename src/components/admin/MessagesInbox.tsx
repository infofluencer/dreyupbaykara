"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCheck,
  ChevronLeft,
  Loader2,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";
import {
  assignConversationMember,
  markConversationRead,
  sendConversationMessage,
  updateConversationStatus,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import {
  avatarColor,
  avatarInitial,
  clockLabel,
  dayKey,
  isWithin24hFromMessages,
  listTimeLabel,
  threadDayLabel,
} from "@/lib/whatsapp/inbox-format";

export type InboxConversation = {
  id: string;
  wa_phone: string | null;
  contact_name: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  assigned_to: string | null;
  lead_id: string | null;
  patient_id: string | null;
  lead?: {
    id: string;
    utm_source: string | null;
    utm_campaign: string | null;
    gclid: string | null;
    channel: string | null;
    site: string | null;
  } | null;
};

export type InboxMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  status: string;
  automated: boolean | null;
  created_at: string;
  media_type: string | null;
  media_url: string | null;
};

export type StaffMember = {
  id: string;
  full_name: string | null;
};

type FilterKey = "all" | "open" | "awaiting" | "mine";

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "open", label: "Açık" },
  { id: "awaiting", label: "Yanıt bekleyen" },
  { id: "mine", label: "Bana atanan" },
];

const CONVERSATION_SELECT = `
  id,
  wa_phone,
  contact_name,
  status,
  last_message_at,
  last_message_preview,
  last_message_direction,
  unread_count,
  assigned_to,
  lead_id,
  patient_id,
  leads (
    id,
    utm_source,
    utm_campaign,
    gclid,
    channel,
    site
  )
`;

function mapConversation(row: Record<string, unknown>): InboxConversation {
  const leadRaw = row.leads;
  const lead = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw;
  const leadRow = (lead ?? null) as InboxConversation["lead"];
  return {
    id: String(row.id),
    wa_phone: (row.wa_phone as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    status: (row.status as string) ?? "open",
    last_message_at: (row.last_message_at as string | null) ?? null,
    last_message_preview: (row.last_message_preview as string | null) ?? null,
    last_message_direction:
      (row.last_message_direction as string | null) ?? null,
    unread_count: Number(row.unread_count ?? 0),
    assigned_to: (row.assigned_to as string | null) ?? null,
    lead_id: (row.lead_id as string | null) ?? null,
    patient_id: (row.patient_id as string | null) ?? null,
    lead: leadRow,
  };
}

export function MessagesInbox({
  conversations: initialConversations,
  selectedId: initialSelectedId,
  messages: initialMessages,
  staff,
  currentUserId,
  role,
  apiEnabled,
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  messages: InboxMessage[];
  staff: StaffMember[];
  currentUserId: string;
  role: string;
  apiEnabled: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();
  const threadRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((row) => {
      if (filter === "open" && row.status !== "open") return false;
      if (
        filter === "awaiting" &&
        !(row.status === "open" && row.last_message_direction === "inbound")
      ) {
        return false;
      }
      if (filter === "mine" && row.assigned_to !== currentUserId) return false;
      if (!q) return true;
      const hay = `${row.contact_name ?? ""} ${row.wa_phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, filter, query, currentUserId]);

  const selected =
    conversations.find((row) => row.id === selectedId) ??
    filtered.find((row) => row.id === selectedId) ??
    null;

  const windowOpen = isWithin24hFromMessages(messages);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, direction, body, status, automated, created_at, media_type, media_url",
      )
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((message) => ({
      ...message,
      direction: message.direction as "inbound" | "outbound",
    }));
  }, []);

  const fetchConversations = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(150);
    if (error) throw error;
    setConversations((data ?? []).map((row) => mapConversation(row as Record<string, unknown>)));
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setLoadError(null);
      setConversations((rows) =>
        rows.map((row) =>
          row.id === id ? { ...row, unread_count: 0 } : row,
        ),
      );
      router.replace(`/admin/messages?c=${id}`, { scroll: false });

      setLoadingMessages(true);
      void fetchMessages(id)
        .then((rows) => {
          if (selectedIdRef.current === id) setMessages(rows);
        })
        .catch((error: Error) => {
          console.error("[inbox] messages:", error);
          setLoadError("Mesajlar yüklenemedi.");
        })
        .finally(() => {
          if (selectedIdRef.current === id) setLoadingMessages(false);
        });

      const fd = new FormData();
      fd.set("conversation_id", id);
      startTransition(() => {
        void markConversationRead(fd).catch((error: Error) => {
          console.error("[inbox] mark read:", error);
        });
      });
    },
    [fetchMessages, router],
  );

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (initialSelectedId && initialSelectedId === selectedId) {
      setMessages(initialMessages);
    }
  }, [initialMessages, initialSelectedId, selectedId]);

  useEffect(() => {
    if (initialSelectedId && initialSelectedId !== selectedId) {
      setSelectedId(initialSelectedId);
    }
    // Sync from URL only when the server-provided id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("wa-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { conversation_id?: string } | null;
          const openId = selectedIdRef.current;
          if (openId && row?.conversation_id === openId) {
            void fetchMessages(openId)
              .then(setMessages)
              .catch((error: Error) => console.error("[inbox] realtime messages:", error));
          }
          void fetchConversations().catch((error: Error) => {
            console.error("[inbox] realtime conversations:", error);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          void fetchConversations().catch((error: Error) => {
            console.error("[inbox] realtime conversations:", error);
          });
        },
      )
      .subscribe();

    // TODO: if Realtime is disabled on the project, fall back to polling.
    const poll = window.setInterval(() => {
      void fetchConversations().catch(() => undefined);
      const openId = selectedIdRef.current;
      if (openId) {
        void fetchMessages(openId)
          .then(setMessages)
          .catch(() => undefined);
      }
    }, 10_000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [fetchConversations, fetchMessages]);

  async function handleSend() {
    if (!selected || !draft.trim() || sending) return;
    if (apiEnabled && !windowOpen) return;

    const body = draft.trim();
    const optimistic: InboxMessage = {
      id: `local_${crypto.randomUUID()}`,
      direction: "outbound",
      body,
      status: "sent",
      automated: false,
      created_at: new Date().toISOString(),
      media_type: null,
      media_url: null,
    };
    setDraft("");
    setSending(true);
    setMessages((rows) => [...rows, optimistic]);
    setConversations((rows) =>
      rows.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              last_message_at: optimistic.created_at,
              last_message_preview: body.slice(0, 160),
              last_message_direction: "outbound",
              unread_count: 0,
            }
          : row,
      ),
    );

    const fd = new FormData();
    fd.set("conversation_id", selected.id);
    fd.set("phone", selected.wa_phone ?? "");
    fd.set("body", body);
    try {
      await sendConversationMessage(fd);
      const rows = await fetchMessages(selected.id);
      setMessages(rows);
    } catch (error) {
      console.error("[inbox] send:", error);
      setMessages((rows) =>
        rows.map((row) =>
          row.id === optimistic.id ? { ...row, status: "failed" } : row,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!filtered.length) return;
    const index = filtered.findIndex((row) => row.id === selectedId);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = filtered[Math.min(index + 1, filtered.length - 1)] ?? filtered[0];
      if (next) selectConversation(next.id);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = filtered[Math.max(index - 1, 0)] ?? filtered[0];
      if (prev) selectConversation(prev.id);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-[#123524]/10 bg-white lg:h-[calc(100dvh-5.5rem)] lg:flex-row">
      <aside
        className={`flex w-full min-h-0 flex-col border-[#123524]/10 lg:w-[22rem] lg:shrink-0 lg:border-r ${
          selectedId ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="space-y-3 border-b border-[#123524]/08 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
              WhatsApp mesajları
            </h1>
            {!apiEnabled ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
                API bağlı değil
              </span>
            ) : null}
          </div>
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#466254]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="İsim veya numara ara…"
              aria-label="Konuşmalarda ara"
              className="w-full rounded-xl border border-[#123524]/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0b6b45]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Konuşma filtreleri">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item.id
                    ? "bg-[#0b6b45] text-white"
                    : "border border-[#0b6b45]/25 bg-transparent text-[#466254] hover:bg-[#f4f6f5]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          role="listbox"
          aria-label="Konuşmalar"
          tabIndex={0}
          onKeyDown={onListKeyDown}
        >
          {!filtered.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f5ed] text-[#0b6b45]">
                <MessageCircle className="h-6 w-6" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-[#123524]">Konuşma yok</p>
              <p className="max-w-xs text-sm leading-6 text-[#466254]">
                Cloud API bağlanınca gelen mesajlar burada listelenir. API
                kapalıyken test için DB’ye kayıt düşebilirsiniz.
              </p>
            </div>
          ) : (
            filtered.map((row) => {
              const active = row.id === selectedId;
              const awaiting =
                row.status === "open" && row.last_message_direction === "inbound";
              const label = row.contact_name || row.wa_phone || "Bilinmeyen";
              return (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={`${label}${row.unread_count ? `, ${row.unread_count} okunmamış` : ""}`}
                  onClick={() => selectConversation(row.id)}
                  className={`flex w-full items-center gap-3 border-b border-[#123524]/08 px-4 py-3 text-left transition ${
                    active ? "bg-[#e7f5ed]" : "hover:bg-[#f7f9f8]"
                  }`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{
                      backgroundColor: avatarColor(row.id),
                    }}
                    aria-hidden
                  >
                    {avatarInitial(row.contact_name, row.wa_phone)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-[#123524]">{label}</p>
                      <span className="shrink-0 text-[10px] text-[#466254]">
                        {listTimeLabel(row.last_message_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {awaiting ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b6b45]"
                          title="Yanıt bekliyor"
                          aria-hidden
                        />
                      ) : null}
                      <p className="min-w-0 flex-1 truncate text-xs text-[#466254]">
                        {row.last_message_preview || row.wa_phone || "—"}
                      </p>
                      {row.unread_count > 0 ? (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0b6b45] px-1.5 text-[10px] font-bold text-white">
                          {row.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${
          selectedId ? "flex" : "hidden lg:flex"
        }`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f6f5] text-[#466254]">
              <MessageCircle className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm text-[#466254]">Soldan bir konuşma seçin.</p>
          </div>
        ) : (
          <>
            <header className="shrink-0 space-y-3 border-b border-[#123524]/08 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      router.replace("/admin/messages", { scroll: false });
                    }}
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-[#0b6b45] lg:hidden"
                    aria-label="Konuşma listesine dön"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Liste
                  </button>
                  <h2 className="truncate font-[family-name:var(--font-instrument-sans)] text-xl font-semibold">
                    {selected.contact_name || selected.wa_phone}
                  </h2>
                  <p className="text-sm text-[#466254]">{selected.wa_phone}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selected.lead_id ? (
                    <Link
                      href={`/admin/leads/${selected.lead_id}`}
                      className="rounded-full border border-[#0b6b45]/25 px-3 py-1.5 text-xs font-semibold text-[#0b6b45]"
                    >
                      Lead kartı
                    </Link>
                  ) : null}
                  {selected.patient_id ? (
                    <Link
                      href={`/admin/patients/${selected.patient_id}`}
                      className="rounded-full border border-[#0b6b45]/25 px-3 py-1.5 text-xs font-semibold text-[#0b6b45]"
                    >
                      Hasta
                    </Link>
                  ) : null}
                </div>
              </div>

              {selected.lead ? (
                <div className="flex flex-wrap gap-1.5">
                  <Tag>
                    Lead: {selected.lead.utm_source || selected.lead.channel || "kaynak"}
                  </Tag>
                  {selected.lead.utm_campaign ? (
                    <Tag>{selected.lead.utm_campaign}</Tag>
                  ) : null}
                  {selected.lead.gclid ? <Tag>gclid</Tag> : null}
                  {selected.lead.site ? <Tag>{selected.lead.site}</Tag> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-[#466254]">
                  Durum
                  <select
                    value={selected.status}
                    aria-label="Konuşma durumu"
                    onChange={(event) => {
                      const status = event.target.value;
                      setConversations((rows) =>
                        rows.map((row) =>
                          row.id === selected.id ? { ...row, status } : row,
                        ),
                      );
                      const fd = new FormData();
                      fd.set("conversation_id", selected.id);
                      fd.set("status", status);
                      startTransition(() => {
                        void updateConversationStatus(fd);
                      });
                    }}
                    className="mt-1 block rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm"
                  >
                    <option value="open">Açık</option>
                    <option value="pending">Beklemede</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </label>

                {role === "admin" || role === "assistant" ? (
                  <label className="text-xs font-medium text-[#466254]">
                    Ata
                    <select
                      value={selected.assigned_to ?? ""}
                      aria-label="Ekip üyesine ata"
                      onChange={(event) => {
                        const assignedTo = event.target.value;
                        setConversations((rows) =>
                          rows.map((row) =>
                            row.id === selected.id
                              ? { ...row, assigned_to: assignedTo || null }
                              : row,
                          ),
                        );
                        const fd = new FormData();
                        fd.set("conversation_id", selected.id);
                        fd.set("assigned_to", assignedTo);
                        startTransition(() => {
                          void assignConversationMember(fd);
                        });
                      }}
                      className="mt-1 block min-w-40 rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Atanmamış</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </header>

            <div
              ref={threadRef}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-[#efe9df] px-3 py-4 sm:px-4"
            >
              {loadingMessages && !messages.length ? (
                <div className="flex justify-center py-16" aria-label="Yükleniyor">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0b6b45]" />
                </div>
              ) : loadError ? (
                <p className="py-12 text-center text-sm text-red-700">{loadError}</p>
              ) : !messages.length ? (
                <p className="py-12 text-center text-sm text-[#466254]">
                  Mesaj yok.
                </p>
              ) : (
                messages.map((message, index) => {
                  const prev = messages[index - 1];
                  const showDay =
                    !prev || dayKey(prev.created_at) !== dayKey(message.created_at);
                  return (
                    <div key={message.id}>
                      {showDay ? (
                        <p className="my-3 text-center text-[11px] font-semibold text-[#466254]">
                          <span className="rounded-full bg-white/80 px-3 py-1">
                            {threadDayLabel(message.created_at)}
                          </span>
                        </p>
                      ) : null}
                      <div
                        className={`mb-1.5 max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          message.direction === "outbound"
                            ? "ml-auto bg-[#d9fdd3]"
                            : "mr-auto bg-white"
                        }`}
                      >
                        {message.media_type && message.media_url ? (
                          <MessageMedia
                            type={message.media_type}
                            mediaId={message.media_url}
                          />
                        ) : null}
                        <MessageBody text={message.body || "Medya içeriği"} />
                        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#466254]">
                          {message.automated ? <span>Bot ·</span> : null}
                          <span>{clockLabel(message.created_at)}</span>
                          {message.direction === "outbound" ? (
                            <StatusTick status={message.status} />
                          ) : null}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-[#123524]/08 bg-white p-3 sm:p-4">
              {!apiEnabled ? (
                <p className="mb-2 text-xs text-amber-800">
                  API bağlı değil — mesaj kaydedilir, gönderilmez.
                </p>
              ) : !windowOpen ? (
                <p className="mb-2 text-xs text-amber-800">
                  24 saatlik pencere kapalı — sadece onaylı şablon gönderilebilir.
                </p>
              ) : null}
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  rows={2}
                  disabled={sending || (apiEnabled && !windowOpen)}
                  placeholder={
                    apiEnabled && !windowOpen
                      ? "Pencere kapalı — şablon gerekir"
                      : "Mesaj yazın…"
                  }
                  aria-label="Mesaj yazın"
                  className="min-h-12 flex-1 resize-none rounded-xl border border-[#123524]/15 px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] disabled:bg-[#f4f6f5]"
                />
                <button
                  type="submit"
                  disabled={
                    sending || !draft.trim() || (apiEnabled && !windowOpen)
                  }
                  aria-label="Gönder"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b6b45] text-white disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#e7f5ed] px-2.5 py-1 text-[11px] font-semibold text-[#0b6b45]">
      {children}
    </span>
  );
}

function StatusTick({ status }: { status: string }) {
  if (status === "failed") {
    return <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-label="Hata" />;
  }
  if (status === "read") {
    return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" aria-label="Okundu" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3.5 w-3.5 text-[#466254]" aria-label="İletildi" />;
  }
  return <Check className="h-3.5 w-3.5 text-[#466254]" aria-label="Gönderildi" />;
}

function MessageBody({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        part.startsWith("http") ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {part}
          </a>
        ) : (
          <span key={`${index}`}>{part}</span>
        ),
      )}
    </p>
  );
}

function MessageMedia({
  type,
  mediaId,
}: {
  type: string;
  mediaId: string;
}) {
  const url = `/api/whatsapp/media/${encodeURIComponent(mediaId)}`;
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="WhatsApp görseli"
        className="mb-2 max-h-80 rounded-xl object-contain"
      />
    );
  }
  if (type === "audio") {
    return <audio src={url} controls className="mb-2 max-w-full" />;
  }
  if (type === "video") {
    return <video src={url} controls className="mb-2 max-h-80 rounded-xl" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-2 block text-xs font-semibold text-[#0b6b45] underline"
    >
      Belgeyi aç
    </a>
  );
}
