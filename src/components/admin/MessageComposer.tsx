"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import {
  WA_AUTOMATION_TEMPLATE_SPECS,
  renderTemplateBody,
} from "@/lib/whatsapp/automation-templates";
import { CANNED_MESSAGES } from "@/lib/whatsapp/canned-messages";

type MessageComposerProps = {
  apiEnabled: boolean;
  windowOpen: boolean;
  sendingMedia: boolean;
  sendingTemplate: boolean;
  sendingQuickId: string | null;
  pendingFile: File | null;
  sendError: string | null;
  contactName: string | null;
  onClearPendingFile: () => void;
  onPickFile: (file: File | undefined) => void;
  onSend: (body: string) => Promise<void>;
  onSendQuick: (id: string, body: string) => void;
  onSendTemplate: (
    templateName: string,
    params: string[],
    preview: string,
  ) => Promise<void>;
};

/**
 * Owns draft text locally so keystrokes do not re-render the inbox list/thread.
 * Parent should remount with `key={conversationId}` to clear draft on switch.
 */
export const MessageComposer = memo(function MessageComposer({
  apiEnabled,
  windowOpen,
  sendingMedia,
  sendingTemplate,
  sendingQuickId,
  pendingFile,
  sendError,
  contactName,
  onClearPendingFile,
  onPickFile,
  onSend,
  onSendQuick,
  onSendTemplate,
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

  const windowClosed = apiEnabled && !windowOpen;
  const inputDisabled = sendingMedia || windowClosed;
  const sendDisabled =
    sendingMedia || (!draft.trim() && !pendingFile) || windowClosed;

  return (
    <div className="shrink-0 border-t border-[#123524]/08 bg-white p-3 sm:p-4">
      {!apiEnabled ? (
        <p className="mb-2 text-xs text-amber-800">
          API bağlı değil — mesaj kaydedilir, gönderilmez.
        </p>
      ) : windowClosed ? (
        <p className="mb-2 text-xs text-amber-800">
          Hasta son 24 saatte yazmadı; WhatsApp serbest metne izin vermiyor.
          Aşağıdan onaylı bir şablon gönderebilirsiniz. Hasta cevap verince
          serbest yazışma yeniden açılır.
        </p>
      ) : null}
      {sendError ? (
        <p role="alert" className="mb-2 text-xs text-red-700">
          {sendError}
        </p>
      ) : null}
      {windowClosed ? (
        <TemplatePicker
          contactName={contactName}
          sending={sendingTemplate}
          onSend={onSendTemplate}
        />
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
            disabled={Boolean(sendingQuickId) || sendingMedia || windowClosed}
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
            windowClosed
              ? "Serbest mesaj penceresi kapalı — yukarıdan şablon gönderin"
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

/* ── 24 saat dışı: onaylı şablonla gönderim ──────────────────────────────── */

type TemplateSpec = (typeof WA_AUTOMATION_TEMPLATE_SPECS)[number];
type TemplateParam = TemplateSpec["bodyParams"][number];

const TEMPLATE_LABELS: Record<TemplateSpec["key"], string> = {
  surgery_day: "Ameliyat sonrası bilgilendirme",
  surgery_google_review: "Google yorum isteği",
  surgery_2d: "Ameliyat randevusu teyidi",
  appt_1d: "Yarınki randevu hatırlatma",
  appt_1h: "Bugünkü randevu hatırlatma",
};

const PARAM_LABELS: Record<TemplateParam, string> = {
  name: "Hasta adı",
  date: "Tarih",
  time: "Saat",
};

const PARAM_PLACEHOLDERS: Record<TemplateParam, string> = {
  name: "Ad Soyad",
  date: "12 Kasım Çarşamba",
  time: "10:30",
};

/** Panelde seçilecek sıra: değişkensiz (tek tık) şablonlar önce. */
const TEMPLATE_ORDER: TemplateSpec["key"][] = [
  "surgery_day",
  "surgery_google_review",
  "surgery_2d",
  "appt_1d",
  "appt_1h",
];

const TEMPLATES = TEMPLATE_ORDER.map(
  (key) => WA_AUTOMATION_TEMPLATE_SPECS.find((spec) => spec.key === key)!,
);

function TemplatePicker({
  contactName,
  sending,
  onSend,
}: {
  contactName: string | null;
  sending: boolean;
  onSend: MessageComposerProps["onSendTemplate"];
}) {
  const [templateKey, setTemplateKey] = useState<TemplateSpec["key"]>(
    TEMPLATES[0]!.key,
  );
  const [values, setValues] = useState<Record<string, string>>({
    // Numara yerine ad geçiyorsa alanı boş bırak, asistan yazsın.
    name: contactName && !/^\+?\d[\d\s]*$/.test(contactName) ? contactName : "",
  });
  const [showPreview, setShowPreview] = useState(false);

  const spec = TEMPLATES.find((item) => item.key === templateKey) ?? TEMPLATES[0]!;
  const params = useMemo(
    () => spec.bodyParams.map((param) => (values[param] ?? "").trim()),
    [spec, values],
  );
  const preview = useMemo(
    () => renderTemplateBody(spec.sampleBody, params),
    [spec, params],
  );
  const complete = params.every(Boolean);

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-[#0b6b45]/20 bg-[#f4faf6] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-[#123524]" htmlFor="wa-template">
          Şablon
        </label>
        <select
          id="wa-template"
          value={templateKey}
          disabled={sending}
          onChange={(event) => {
            setTemplateKey(event.target.value as TemplateSpec["key"]);
            setShowPreview(false);
          }}
          className="min-h-10 flex-1 rounded-lg border border-[#123524]/15 bg-white px-3 text-sm outline-none focus:border-[#0b6b45]"
        >
          {TEMPLATES.map((item) => (
            <option key={item.key} value={item.key}>
              {TEMPLATE_LABELS[item.key]}
            </option>
          ))}
        </select>
      </div>
      {spec.bodyParams.length ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {spec.bodyParams.map((param) => (
            <label key={param} className="block text-xs text-[#466254]">
              <span className="mb-1 block font-semibold">{PARAM_LABELS[param]}</span>
              <input
                value={values[param] ?? ""}
                disabled={sending}
                placeholder={PARAM_PLACEHOLDERS[param]}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [param]: event.target.value }))
                }
                className="min-h-10 w-full rounded-lg border border-[#123524]/15 bg-white px-3 text-sm text-[#123524] outline-none focus:border-[#0b6b45]"
              />
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className="text-xs font-semibold text-[#0b6b45]"
        >
          {showPreview ? "Önizlemeyi gizle" : "Metni gör"}
        </button>
        <button
          type="button"
          disabled={sending || !complete}
          onClick={() => void onSend(spec.templateName, params, preview)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#0b6b45] px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Şablonu gönder
        </button>
      </div>
      {showPreview ? (
        <p className="whitespace-pre-wrap rounded-lg border border-[#123524]/10 bg-white p-3 text-xs text-[#123524]">
          {preview}
        </p>
      ) : null}
    </div>
  );
}
