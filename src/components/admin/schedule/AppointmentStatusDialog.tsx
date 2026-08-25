"use client";

import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";

/** @deprecated Prefer AdminConfirmDialog — geriye uyumluluk. */
export function AppointmentStatusDialog({
  status,
  message,
  onClose,
}: {
  status: "loading" | "success" | "error" | null;
  message?: string | null;
  onClose: () => void;
}) {
  return (
    <AdminConfirmDialog
      status={status as AdminDialogStatus}
      message={message}
      loadingTitle="Randevu kaydediliyor"
      successTitle="Randevu eklendi"
      errorTitle="Randevu eklenemedi"
      onClose={onClose}
    />
  );
}
