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
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import {
  LEAD_STATUS_FILTERS,
  statusesForFilter,
  type LeadStatusFilter,
} from "@/lib/crm/lead-status";
import {
  markConversationRead,
  sendConversationMessage,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import {
  avatarColor,
  avatarInitial,
  clockLabel,
  dayKey,
  isWithin24hFromMessages,
  listTimeLabel,
  threadDayLabel,
} from "@/lib/whatsapp/inbox-format";

const LeadStatusControl = dynamic(
  () =>
    import("@/components/admin/LeadStatusControl").then(
      (m) => m.LeadStatusControl,
    ),
  { ssr: false },
);
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
  contact_id: string;
  patient_id: string | null;
  is_patient: boolean;
  lead?: {
    id: string;
    utm_source: string | null;
    utm_campaign: string | null;
    gclid: string | null;
    channel: string | null;
    site: string | null;
  } | null;
  pipelineLead?: {
    id: string;
    status: string | null;
    lost_reason?: string | null;
    needs_followup?: boolean | null;
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
  source: string | null;
};

type FilterKey = "all" | "open" | "awaiting";

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "open", label: "Açık" },
  { id: "awaiting", label: "Yanıt bekleyen" },
];

const MESSAGE_SELECT =
  "id, direction, body, status, automated, created_at, media_type, media_url, source";

function mapInboxMessage(row: Record<string, unknown>): InboxMessage {
  return {
    id: String(row.id),
    direction: row.direction === "outbound" ? "outbound" : "inbound",
    body: (row.body as string | null) ?? null,
    status: String(row.status ?? "sent"),
    automated: (row.automated as boolean | null) ?? null,
    created_at: String(row.created_at),
    media_type: (row.media_type as string | null) ?? null,
    media_url: (row.media_url as string | null) ?? null,
    source: (row.source as string | null) ?? null,
  };
}

function sourceLabel(source: string | null): string | null {
  if (source === "panel") return "panelden";
  if (source === "app_echo") return "telefondan";
  return null;
}

function sortMessages(rows: InboxMessage[]): InboxMessage[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

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
  contact_id,
  patient_id,
  contacts (
    is_patient
  ),
  leads (
    id,
    utm_source,
    utm_campaign,
    gclid,
    channel,
    site
  )
`;

function mapConversation(
  row: Record<string, unknown>,
  previous?: InboxConversation | null,
): InboxConversation {
  const leadRaw = row.leads;
  const lead = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw;
  const leadRow = (lead ?? null) as InboxConversation["lead"];
  const pipelineFromRow = row.pipelineLead as InboxConversation["pipelineLead"];
  const contactRaw = row.contacts;
  const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
  const contactPatient = Boolean(
    (contact as { is_patient?: boolean } | null)?.is_patient,
  );
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
    contact_id: String(row.contact_id),
    patient_id: (row.patient_id as string | null) ?? null,
    is_patient:
      typeof row.is_patient === "boolean"
        ? row.is_patient
        : contactPatient || previous?.is_patient || false,
    lead: leadRow,
    pipelineLead: pipelineFromRow ?? previous?.pipelineLead ?? null,
  };
}

export function MessagesInbox({
  conversations: initialConversations,
  selectedId: initialSelectedId,
  messages: initialMessages,
  apiEnabled,
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  messages: InboxMessage[];
  apiEnabled: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [leadStatusFilter, setLeadStatusFilter] =
    useState<LeadStatusFilter>("all");
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
  /** Last conversation id whose server `initialMessages` were applied — skip soft-nav echoes. */
  const appliedServerMessagesForRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedStatuses = statusesForFilter(leadStatusFilter);
    return conversations.filter((row) => {
      if (filter === "open" && row.status !== "open") return false;
      if (
        filter === "awaiting" &&
        !(row.status === "open" && row.last_message_direction === "inbound")
      ) {
        return false;
      }
      if (allowedStatuses) {
        const leadStatus = row.pipelineLead?.status;
        if (!leadStatus || !allowedStatuses.includes(leadStatus as never)) {
          return false;
        }
      }
      if (!q) return true;
      const hay = `${row.contact_name ?? ""} ${row.wa_phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, filter, leadStatusFilter, query]);

  const selected =
    conversations.find((row) => row.id === selectedId) ??
    filtered.find((row) => row.id === selectedId) ??
    null;

  const windowOpen = isWithin24hFromMessages(messages);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(500);
    if (error) throw error;
    return sortMessages((data ?? []).map((row) => mapInboxMessage(row)));
  }, []);

  const fetchConversations = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(150);
    if (error) throw error;
    console.log("[inbox] refetched conversations:", data?.length);
    setConversations((prev) => {
      const byContact = new Map(
        prev
          .filter((row) => row.pipelineLead)
          .map((row) => [row.contact_id, row.pipelineLead] as const),
      );
      return (data ?? []).map((row) => {
        const previous = prev.find((item) => item.id === String(row.id));
        const mapped = mapConversation(
          row as Record<string, unknown>,
          previous,
        );
        const preserved = byContact.get(mapped.contact_id);
        return preserved
          ? { ...mapped, pipelineLead: preserved }
          : mapped;
      });
    });
  }, []);
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setLoadError(null);
      appliedServerMessagesForRef.current = id;
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

  // Conversations list is owned by client/realtime after mount — do not re-apply
  // server snapshots on soft nav (they overwrite fresher realtime state).

  useEffect(() => {
    // Apply server messages only when the URL conversation id changes (e.g. back/forward),
    // not when the same ?c= soft-nav refreshes initialMessages.
    if (initialSelectedId === appliedServerMessagesForRef.current) return;
    appliedServerMessagesForRef.current = initialSelectedId;
    if (initialSelectedId) {
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [initialSelectedId, initialMessages]);

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
    const conversationChannel = supabase
      .channel("wa-inbox-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          console.log("[inbox] conversations event received");
          void fetchConversationsRef.current().catch((error: Error) => {
            console.error("[inbox] realtime conversations:", error);
          });
        },
      )
      .subscribe((status, err) => {
        console.log("[inbox] conversations channel:", status, err ?? "");
      });

    return () => {
      void supabase.removeChannel(conversationChannel);
    };
    // Mount once — soft nav must not tear down this channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const conversationId = selectedId;
    const supabase = createClient();
    const threadChannel = supabase
      .channel(`wa-thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (selectedIdRef.current !== conversationId) return;
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (!oldRow?.id) return;
            setMessages((rows) => rows.filter((row) => row.id !== oldRow.id));
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) return;
          const incoming = mapInboxMessage(row);
          setMessages((rows) => {
            const withoutOptimistic = rows.filter((existing) => {
              if (existing.id === incoming.id) return false;
              if (
                existing.id.startsWith("local_") &&
                existing.direction === "outbound" &&
                incoming.direction === "outbound" &&
                existing.body === incoming.body
              ) {
                return false;
              }
              return true;
            });
            return sortMessages([...withoutOptimistic, incoming]);
          });
          void fetchConversationsRef.current().catch((error: Error) => {
            console.error("[inbox] realtime conversations:", error);
          });
        },
      )
      .subscribe((status, err) => {
        console.log("[inbox] thread channel:", conversationId, status, err ?? "");
      });

    return () => {
      void supabase.removeChannel(threadChannel);
    };
  }, [selectedId]);

  async function handleSend() {
    if (!selected || !draft.trim() || sending) return;
    if (apiEnabled && !windowOpen) return;

    const body = draft.trim();
    const optimistic: InboxMessage = {
      id: `local_${crypto.randomUUID()}`,
      direction: "outbound",
      body,
      status: "pending",
      automated: false,
      created_at: new Date().toISOString(),
      media_type: null,
      media_url: null,
      source: "panel",
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
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-[#123524]/10 bg-white lg:h-[calc(100dvh-5.5rem)] lg:flex-row">
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
              className="min-h-11 w-full rounded-xl border border-[#123524]/15 py-2.5 pl-9 pr-3 text-base outline-none focus:border-[#0b6b45] sm:text-sm"
            />
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Konuşma durumu">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                    filter === item.id
                      ? "bg-[#0b6b45] text-white"
                      : "border border-[#0b6b45]/25 bg-transparent text-[#466254] hover:bg-[#f4f6f5]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7d73]">
                Hasta durumu
              </p>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Hasta talep durumu">
                {LEAD_STATUS_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={leadStatusFilter === item.id}
                    onClick={() => setLeadStatusFilter(item.id)}
                    className={`inline-flex min-h-9 items-center rounded-full px-3 text-[11px] font-semibold transition ${
                      leadStatusFilter === item.id
                        ? "bg-[#123524] text-white"
                        : "border border-[#123524]/15 bg-[#f7f9f8] text-[#466254] hover:bg-[#eef2f0]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
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
                Henüz WhatsApp mesajı yok. Hastalar yazdığında konuşmalar burada
                görünecek.
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
                  aria-label={`${label}${row.pipelineLead?.status ? `, ${row.pipelineLead.status}` : ""}${row.unread_count ? `, ${row.unread_count} okunmamış` : ""}`}
                  onClick={() => selectConversation(row.id)}
                  className={`flex min-h-16 w-full items-center gap-3 border-b border-[#123524]/08 px-4 py-3.5 text-left transition ${
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
                    {row.pipelineLead?.status ? (
                      <div className="mt-1">
                        <LeadStatusBadge
                          status={row.pipelineLead.status}
                          needsFollowup={row.pipelineLead.needs_followup}
                        />
                      </div>
                    ) : null}
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
                      appliedServerMessagesForRef.current = null;
                      setMessages([]);
                      router.replace("/admin/messages", { scroll: false });
                    }}
                    className="mb-1 inline-flex min-h-10 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-[#0b6b45] lg:hidden"
                    aria-label="Konuşma listesine dön"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                    Liste
                  </button>
                  <h2 className="truncate font-[family-name:var(--font-instrument-sans)] text-xl font-semibold">
                    {selected.contact_name || selected.wa_phone}
                  </h2>
                  <p className="text-sm text-[#466254]">{selected.wa_phone}</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  {selected.lead_id ? (
                    <Link
                      href={`/admin/leads/${selected.lead_id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-[#0b6b45]/25 px-3.5 text-xs font-semibold text-[#0b6b45]"
                    >
                      Lead kartı
                    </Link>
                  ) : null}
                  {selected.is_patient ? (
                    <Link
                      href={`/admin/patients/${selected.contact_id || selected.patient_id}`}
                      className="inline-flex min-h-10 items-center rounded-full bg-[#0b6b45] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#095a3a]"
                    >
                      Hasta kimliğini aç
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/patients/new?${new URLSearchParams({
                        ...(selected.wa_phone
                          ? { phone: selected.wa_phone }
                          : {}),
                        ...(selected.contact_name &&
                        selected.contact_name.replace(/\D/g, "") !==
                          (selected.wa_phone ?? "").replace(/\D/g, "")
                          ? { name: selected.contact_name }
                          : {}),
                      }).toString()}`}
                      className="inline-flex min-h-10 items-center rounded-full bg-[#0b6b45] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#095a3a]"
                    >
                      Hastayı ekle
                    </Link>
                  )}
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

              {selected.pipelineLead ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#466254]">
                    Talep durumu
                  </span>
                  <LeadStatusControl
                    leadId={selected.pipelineLead.id}
                    status={selected.pipelineLead.status}
                    lostReason={selected.pipelineLead.lost_reason}
                    needsFollowup={selected.pipelineLead.needs_followup}
                    size="sm"
                    onOptimisticChange={(next) => {
                      setConversations((rows) =>
                        rows.map((row) =>
                          row.id === selected.id && row.pipelineLead
                            ? {
                                ...row,
                                pipelineLead: {
                                  ...row.pipelineLead,
                                  status: next,
                                  needs_followup:
                                    next === "arandi"
                                      ? row.pipelineLead.needs_followup
                                      : false,
                                },
                              }
                            : row,
                        ),
                      );
                    }}
                  />
                </div>
              ) : (
                <p className="text-xs text-[#466254]">Aktif talep yok.</p>
              )}
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
                  const channel = sourceLabel(message.source);
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
                          {channel ? <span>{channel}</span> : null}
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
                  Serbest mesaj penceresi kapalı — template gerekli
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
                      ? "Serbest mesaj penceresi kapalı"
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
    return <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-label="İletilemedi" />;
  }
  if (status === "read") {
    return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" aria-label="Okundu" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3.5 w-3.5 text-[#466254]" aria-label="İletildi" />;
  }
  if (status === "pending") {
    return <Check className="h-3.5 w-3.5 text-[#466254]/50" aria-label="Gönderiliyor" />;
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
