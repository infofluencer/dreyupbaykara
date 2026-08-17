"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  assignConversationMember,
  markConversationRead,
  sendConversationMessage,
  updateConversationStatus,
} from "@/app/admin/actions";

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

const STATUS_LABEL: Record<string, string> = {
  open: "Açık",
  pending: "Beklemede",
  closed: "Kapalı",
};

export function MessagesInbox({
  conversations,
  selectedId,
  messages,
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
  const [pending, startTransition] = useTransition();

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
    filtered.find((row) => row.id === selectedId) ??
    conversations.find((row) => row.id === selectedId) ??
    null;

  function selectConversation(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("conversation_id", id);
      await markConversationRead(fd);
      router.push(`/admin/messages?c=${id}`);
    });
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[#123524]/10 bg-white lg:h-[calc(100vh-8rem)] lg:flex-row">
      <aside
        className={`flex w-full flex-col border-[#123524]/10 lg:w-[22rem] lg:border-r ${
          selectedId ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="space-y-3 border-b border-[#123524]/08 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
              WhatsApp mesajları
            </h1>
            {!apiEnabled ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                API bağlı değil
              </span>
            ) : null}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="İsim veya numara ara…"
            className="w-full rounded-xl border border-[#123524]/15 px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filter === item.id
                    ? "bg-[#0b6b45] text-white"
                    : "bg-[#f4f6f5] text-[#466254]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!filtered.length ? (
            <p className="px-4 py-10 text-center text-sm text-[#466254]">
              Konuşma yok. Cloud API bağlanınca gelen mesajlar burada listelenir.
              API kapalıyken test için DB’ye kayıt düşebilirsiniz.
            </p>
          ) : (
            filtered.map((row) => {
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectConversation(row.id)}
                  className={`flex w-full items-start gap-3 border-b border-[#123524]/08 px-4 py-3.5 text-left transition ${
                    active ? "bg-[#e7f5ed]" : "hover:bg-[#f7f9f8]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-[#123524]">
                        {row.contact_name || row.wa_phone || "Bilinmeyen"}
                      </p>
                      <span className="shrink-0 text-[10px] text-[#466254]">
                        {row.last_message_at
                          ? new Date(row.last_message_at).toLocaleString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#466254]">
                      {row.last_message_preview || row.wa_phone || "—"}
                    </p>
                  </div>
                  {row.unread_count > 0 ? (
                    <span className="mt-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#0b6b45] px-1.5 text-[10px] font-bold text-white">
                      {row.unread_count}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        className={`flex min-w-0 flex-1 flex-col ${
          selectedId ? "flex" : "hidden lg:flex"
        }`}
      >
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#466254]">
            Soldan bir konuşma seçin.
          </div>
        ) : (
          <>
            <header className="space-y-3 border-b border-[#123524]/08 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href="/admin/messages"
                    className="text-sm font-medium text-[#0b6b45] lg:hidden"
                  >
                    ← Liste
                  </Link>
                  <h2 className="mt-1 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold">
                    {selected.contact_name || selected.wa_phone}
                  </h2>
                  <p className="text-sm text-[#466254]">{selected.wa_phone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  {selected.lead.channel ? (
                    <Tag>{selected.lead.channel}</Tag>
                  ) : null}
                  {selected.lead.utm_source ? (
                    <Tag>utm: {selected.lead.utm_source}</Tag>
                  ) : null}
                  {selected.lead.utm_campaign ? (
                    <Tag>{selected.lead.utm_campaign}</Tag>
                  ) : null}
                  {selected.lead.gclid ? <Tag>gclid</Tag> : null}
                  {selected.lead.site ? <Tag>{selected.lead.site}</Tag> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3">
                <form action={updateConversationStatus} className="flex items-end gap-2">
                  <input type="hidden" name="conversation_id" value={selected.id} />
                  <label className="text-xs font-medium text-[#466254]">
                    Durum
                    <select
                      name="status"
                      defaultValue={selected.status}
                      className="mt-1 block rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm"
                    >
                      <option value="open">Açık</option>
                      <option value="pending">Beklemede</option>
                      <option value="closed">Kapalı</option>
                    </select>
                  </label>
                  <button className="rounded-full border border-[#123524]/15 px-3 py-2 text-xs font-semibold">
                    Kaydet
                  </button>
                </form>

                {role === "admin" || role === "assistant" ? (
                  <form
                    action={assignConversationMember}
                    className="flex items-end gap-2"
                  >
                    <input
                      type="hidden"
                      name="conversation_id"
                      value={selected.id}
                    />
                    <label className="text-xs font-medium text-[#466254]">
                      Ata
                      <select
                        name="assigned_to"
                        defaultValue={selected.assigned_to ?? ""}
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
                    <button className="rounded-full border border-[#123524]/15 px-3 py-2 text-xs font-semibold">
                      Ata
                    </button>
                  </form>
                ) : null}

                <span className="rounded-full bg-[#f4f6f5] px-3 py-2 text-xs font-semibold text-[#466254]">
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#efe9df] p-4">
              {!messages.length ? (
                <p className="py-12 text-center text-sm text-[#466254]">
                  Mesaj yok.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
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
                    <p className="whitespace-pre-wrap">
                      {message.body || "Medya içeriği"}
                    </p>
                    <p className="mt-1 text-right text-[10px] text-[#466254]">
                      {message.automated ? "Bot · " : ""}
                      {new Date(message.created_at).toLocaleString("tr-TR")} ·{" "}
                      {statusTick(message.status)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form
              action={sendConversationMessage}
              className="flex flex-col gap-3 border-t border-[#123524]/08 bg-white p-4 sm:flex-row"
            >
              <input type="hidden" name="conversation_id" value={selected.id} />
              <input
                type="hidden"
                name="phone"
                value={selected.wa_phone ?? ""}
              />
              <textarea
                name="body"
                required
                rows={2}
                placeholder={
                  apiEnabled
                    ? "Mesaj yazın…"
                    : "Mesaj yazın (API kapalı — yalnızca panele kaydedilir)…"
                }
                className="min-h-20 flex-1 resize-none rounded-xl border border-[#123524]/15 px-3 py-3 text-base outline-none focus:border-[#0b6b45]"
              />
              <button
                disabled={pending}
                className="min-h-12 rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white sm:self-end disabled:opacity-60"
              >
                Gönder
              </button>
            </form>
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

function statusTick(status: string) {
  if (status === "read") return "✓✓ okundu";
  if (status === "delivered") return "✓✓";
  if (status === "sent") return "✓";
  if (status === "failed") return "hata";
  if (status === "received") return "alındı";
  return status;
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
