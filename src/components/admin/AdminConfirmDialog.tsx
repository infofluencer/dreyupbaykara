"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type AdminDialogStatus =
  | "confirm"
  | "loading"
  | "success"
  | "error"
  | null;

type Props = {
  status: AdminDialogStatus;
  title?: string;
  message?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingTitle?: string;
  loadingMessage?: string;
  successTitle?: string;
  errorTitle?: string;
  onConfirm?: () => void;
  onClose: () => void;
  children?: ReactNode;
};

/**
 * Ortak admin popup: emin misiniz / yükleniyor / başarı / hata.
 * Escape ile kapatma loading sırasında kapalıdır.
 */
export function AdminConfirmDialog({
  status,
  title = "Emin misiniz?",
  message,
  confirmLabel = "Evet, devam et",
  cancelLabel = "Vazgeç",
  loadingTitle = "İşlem sürüyor",
  loadingMessage = "Lütfen bekleyin…",
  successTitle = "Tamamlandı",
  errorTitle = "İşlem başarısız",
  onConfirm,
  onClose,
  children,
}: Props) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!status || status === "loading") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, onClose]);

  useEffect(() => {
    if (status === "confirm") confirmRef.current?.focus();
  }, [status]);

  if (!status) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#123524]/45 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-live="polite"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && status !== "loading") {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        {status === "loading" ? (
          <>
            <div
              className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-[#0b6b45]/20 border-t-[#0b6b45]"
              aria-hidden
            />
            <p
              id={titleId}
              className="mt-4 text-center text-lg font-semibold text-[#123524]"
            >
              {loadingTitle}
            </p>
            <p className="mt-1 text-center text-sm text-[#466254]">
              {loadingMessage}
            </p>
          </>
        ) : null}

        {status === "confirm" ? (
          <>
            <p
              id={titleId}
              className="text-center text-lg font-semibold text-[#123524]"
            >
              {title}
            </p>
            {message ? (
              <p className="mt-2 whitespace-pre-wrap text-center text-sm leading-6 text-[#466254]">
                {message}
              </p>
            ) : null}
            {children}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white"
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#123524]/15 bg-white px-5 text-sm font-semibold text-[#123524]"
              >
                {cancelLabel}
              </button>
            </div>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <p
              id={titleId}
              className="text-center text-lg font-semibold text-[#0b6b45]"
            >
              {successTitle}
            </p>
            {message ? (
              <p className="mt-2 text-center text-sm text-[#466254]">{message}</p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-12 w-full rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white"
            >
              Tamam
            </button>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <p
              id={titleId}
              className="text-center text-lg font-semibold text-red-800"
            >
              {errorTitle}
            </p>
            <p className="mt-2 text-center text-sm text-red-700">
              {message || "Bir hata oluştu. Tekrar deneyin."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-12 w-full rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-800"
            >
              Tamam
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
