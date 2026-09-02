"use client";

import { Spinner } from "@/components/admin/Spinner";

export function MarketingLoadingOverlay({
  open,
  message = "Veriler yükleniyor…",
}: {
  open: boolean;
  message?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#123524]/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#123524]/10 bg-white px-8 py-7 text-center shadow-2xl">
        <Spinner size="lg" className="mx-auto text-[#0b6b45]" label={message} />
        <p className="mt-4 text-sm font-semibold text-[#123524]">{message}</p>
        <p className="mt-1 text-xs text-[#466254]">
          Filtreler uygulanırken lütfen bekleyin.
        </p>
      </div>
    </div>
  );
}
