"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { CANNED_MESSAGES } from "@/lib/whatsapp/canned-messages";

type MessageComposerProps = {
  apiEnabled: boolean;
  windowOpen: boolean;
  sendingMedia: boolean;
  sendingQuickId: string | null;
  pendingFile: File | null;
  mediaError: string | null;
  onClearPendingFile: () => void;
  onPickFile: (file: File | undefined) => void;
  onSend: (body: string) => Promise<void>;
  onSendQuick: (id: string, body: string) => void;
};

/**
 * Owns draft text locally so keystrokes do not re-render the inbox list/thread.
 * Parent should remount with `key={conversationId}` to clear draft on switch.
 */
export const MessageComposer = memo(function MessageComposer({
  apiEnabled,
  windowOpen,
  sendingMedia,
  sendingQuickId,
  pendingFile,
  mediaError,
  onClearPendingFile,
  onPickFile,
  onSend,
  onSendQuick,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const body = draftRef.current.trim();
    draftRef.current = "";
    setDraft("");
    await onSend(body);
  }, [onSend]);

  const onComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  const onFormSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void submit();
    },
    [submit],
  );

  const inputDisabled = sendingMedia || (apiEnabled && !windowOpen);
  const sendDisabled =
    sendingMedia ||
    (!draft.trim() && !pendingFile) ||
    (apiEnabled && !windowOpen);

  return (
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
      {mediaError ? (
        <p className="mb-2 text-xs text-red-700">{mediaError}</p>
      ) : null}
      {pendingFile ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#123524]/12 bg-[#f4f6f5] px-3 py-2 text-sm text-[#123524]">
          <FileText className="h-4 w-4 shrink-0 text-[#0b6b45]" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium">
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={onClearPendingFile}
            className="rounded-full p-1 text-[#466254] hover:bg-white"
            aria-label="Dosyayı kaldır"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
      <div
        className="mb-2 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Hazır mesajlar"
      >
        {CANNED_MESSAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={
              Boolean(sendingQuickId) ||
              sendingMedia ||
              (apiEnabled && !windowOpen)
            }
            onClick={() => onSendQuick(item.id, item.body)}
            className="rounded-full border border-[#123524]/15 bg-[#e7f5ed] px-3 py-1.5 text-left text-[12px] font-semibold text-[#0b6b45] disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
      <form className="flex items-end gap-2" onSubmit={onFormSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            onPickFile(event.target.files?.[0]);
          }}
        />
        <button
          type="button"
          disabled={inputDisabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Dosya ekle (JPEG, PNG, PDF)"
          title="JPEG, PNG veya PDF"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#123524]/15 text-[#0b6b45] disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5" aria-hidden />
        </button>
        <textarea
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            draftRef.current = next;
            setDraft(next);
          }}
          onKeyDown={onComposerKeyDown}
          rows={2}
          disabled={inputDisabled}
          placeholder={
            apiEnabled && !windowOpen
              ? "Serbest mesaj penceresi kapalı"
              : pendingFile
                ? "Açıklama yazın (opsiyonel)…"
                : "Mesaj yazın…"
          }
          aria-label="Mesaj yazın"
          className="min-h-12 flex-1 resize-none rounded-xl border border-[#123524]/15 px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] disabled:bg-[#f4f6f5]"
        />
        <button
          type="submit"
          disabled={sendDisabled}
          aria-label="Gönder"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b6b45] text-white disabled:opacity-50"
        >
          {sendingMedia ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-5 w-5" aria-hidden />
          )}
        </button>
      </form>
    </div>
  );
});
