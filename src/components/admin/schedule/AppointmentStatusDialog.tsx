"use client";

export function AppointmentStatusDialog({
  status,
  message,
  onClose,
}: {
  status: "loading" | "success" | "error" | null;
  message?: string | null;
  onClose: () => void;
}) {
  if (!status) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#123524]/45 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        {status === "loading" ? (
          <>
            <div
              className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-[#0b6b45]/20 border-t-[#0b6b45]"
              aria-hidden
            />
            <p className="mt-4 text-center text-lg font-semibold text-[#123524]">
              Randevu kaydediliyor
            </p>
            <p className="mt-1 text-center text-sm text-[#466254]">
              İşlem gerçekleştiriliyor, lütfen bekleyin.
            </p>
          </>
        ) : null}
        {status === "success" ? (
          <>
            <p className="text-center text-lg font-semibold text-[#0b6b45]">
              Randevu eklendi
            </p>
            <p className="mt-2 text-center text-sm text-[#466254]">
              Kayıt başarılı. Takvim güncellendi.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-12 w-full rounded-full bg-[#0b6b45] px-5 text-base font-semibold text-white"
            >
              Tamam
            </button>
          </>
        ) : null}
        {status === "error" ? (
          <>
            <p className="text-center text-lg font-semibold text-red-800">
              Randevu eklenemedi
            </p>
            <p className="mt-2 text-center text-sm text-red-700">
              {message || "İşlem başarısız. Tekrar deneyin."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-12 w-full rounded-full border border-red-200 bg-white px-5 text-base font-semibold text-red-800"
            >
              Tamam
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
