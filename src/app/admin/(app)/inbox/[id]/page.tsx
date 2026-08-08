import Link from "next/link";
import { notFound } from "next/navigation";
import {
  claimConversation,
  releaseConversation,
  sendConversationMessage,
  sendConversationTemplate,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import {
  isConversationLockFresh,
  isWhatsAppServiceWindowOpen,
} from "@/lib/whatsapp/service-window";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "*, contacts(name, phone), leads(id, stage, notes), locker:locked_by(full_name)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(500),
  ]);

  if (!conversation) notFound();
  const contact = Array.isArray(conversation.contacts)
    ? conversation.contacts[0]
    : conversation.contacts;
  const lead = Array.isArray(conversation.leads)
    ? conversation.leads[0]
    : conversation.leads;
  const lastInbound = [...(messages ?? [])]
    .reverse()
    .find((message) => message.direction === "inbound");
  const serviceWindowOpen = isWhatsAppServiceWindowOpen(
    lastInbound?.created_at,
  );
  const lockFresh = isConversationLockFresh(conversation.locked_at);
  const lockedByOther =
    lockFresh &&
    conversation.locked_by &&
    conversation.locked_by !== session.userId;
  const locker = Array.isArray(conversation.locker)
    ? conversation.locker[0]
    : conversation.locker;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/inbox"
            className="text-sm font-medium text-[#0b6b45]"
          >
            ← Gelen kutusu
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
            {contact?.name || contact?.phone}
          </h1>
          <p className="mt-1 text-sm text-[#466254]">{contact?.phone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead?.id ? (
            <Link
              href={`/admin/leads/${lead.id}`}
              className="rounded-full border border-[#0b6b45]/25 px-4 py-2 text-sm font-semibold text-[#0b6b45]"
            >
              Lead kartı
            </Link>
          ) : null}
          <form
            action={
              conversation.locked_by === session.userId
                ? releaseConversation
                : claimConversation
            }
          >
            <input
              type="hidden"
              name="conversation_id"
              value={conversation.id}
            />
            <button
              disabled={Boolean(lockedByOther)}
              className="rounded-full border border-[#123524]/15 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {conversation.locked_by === session.userId
                ? "İşlemi bırak"
                : lockedByOther
                  ? `${locker?.full_name || "Başka kullanıcı"} işlemde`
                  : "Konuşmayı üstlen"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-[#123524]/10 bg-[#efe9df] p-4 sm:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {!messages?.length ? (
            <p className="py-10 text-center text-sm text-[#466254]">
              Mesaj bulunamadı.
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
                <MessageMedia
                  type={message.media_type}
                  mediaId={message.media_url}
                />
                <p className="whitespace-pre-wrap">
                  {message.body || "Medya içeriği"}
                </p>
                <p className="mt-1 text-right text-[10px] text-[#466254]">
                  {message.automated ? "Bot · " : ""}
                  {new Date(message.created_at).toLocaleString("tr-TR")} ·{" "}
                  {message.status}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {lockedByOther ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Bu konuşmayı {locker?.full_name || "başka bir kullanıcı"} işliyor.
          Çift cevap önlemek için mesaj alanı kilitlendi.
        </p>
      ) : serviceWindowOpen ? (
        <form
          action={sendConversationMessage}
          className="flex gap-3 rounded-2xl border border-[#123524]/10 bg-white p-4"
        >
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <input type="hidden" name="phone" value={contact?.phone} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Mesaj yazın…"
            className="min-h-12 flex-1 resize-none rounded-xl border border-[#123524]/15 px-3 py-2.5 text-sm outline-none focus:border-[#0b6b45]"
          />
          <button className="self-end rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white">
            Gönder
          </button>
        </form>
      ) : (
        <form
          action={sendConversationTemplate}
          className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"
        >
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <input type="hidden" name="phone" value={contact?.phone} />
          <label className="text-sm font-medium text-amber-950">
            Onaylı şablon adı
            <input
              name="template_name"
              required
              placeholder="randevu_hatirlatma"
              className="mt-1.5 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-amber-950">
            Dil
            <input
              name="language_code"
              defaultValue="tr"
              className="mt-1.5 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5"
            />
          </label>
          <button className="rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white">
            Şablon gönder
          </button>
          <p className="text-xs text-amber-900 sm:col-span-3">
            24 saatlik pencere kapalı olduğu için yalnızca Meta’da onaylanmış
            bir şablon gönderilebilir.
          </p>
        </form>
      )}
    </div>
  );
}

function MessageMedia({
  type,
  mediaId,
}: {
  type: string | null;
  mediaId: string | null;
}) {
  if (!type || !mediaId) return null;
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

