"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteAppointment } from "@/app/admin/actions";
import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";

export function DeleteAppointmentButton({
  id,
  label = "Sil",
  className = "inline-flex min-h-8 items-center text-xs font-semibold text-red-700",
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<AdminDialogStatus>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Bu randevu kalıcı olarak silinsin mi?");
    setDialog("confirm");
  }

  async function runDelete() {
    setDialog("loading");
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("id", id);
      await deleteAppointment(formData);
      setMessage("Randevu silindi.");
      setDialog("success");
      router.refresh();
    } catch (caught) {
      setDialog("error");
      setMessage(
        caught instanceof Error ? caught.message : "Randevu silinemedi.",
      );
    }
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <button type="submit" className={className}>
          {label}
        </button>
      </form>
      <AdminConfirmDialog
        status={dialog}
        title="Randevu silinsin mi?"
        message={message}
        confirmLabel="Evet, sil"
        loadingTitle="Randevu siliniyor"
        successTitle="Silindi"
        errorTitle="Silinemedi"
        onConfirm={() => void runDelete()}
        onClose={() => {
          if (dialog === "loading") return;
          setDialog(null);
          setMessage(null);
        }}
      />
    </>
  );
}
