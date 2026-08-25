"use client";

import { useState, type FormEvent } from "react";
import { deletePatient } from "@/app/admin/actions";
import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";

export function DeletePatientButton({
  contactId,
  patientName,
  variant = "button",
}: {
  contactId: string;
  patientName?: string | null;
  variant?: "button" | "danger" | "link";
}) {
  const [dialog, setDialog] = useState<AdminDialogStatus>(null);
  const [message, setMessage] = useState<string | null>(null);
  const who = patientName?.trim() || "bu hasta";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      `${who} hastalardan kaldırılsın mı?\n\nListeden çıkar; WhatsApp konuşması ve randevular silinmez.`,
    );
    setDialog("confirm");
  }

  async function runDelete() {
    setDialog("loading");
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("contact_id", contactId);
      await deletePatient(formData);
      // redirect in action — loading kalır, navigasyon olur
    } catch (caught) {
      // Next.js redirect() throws; let it propagate
      if (
        caught &&
        typeof caught === "object" &&
        "digest" in caught &&
        String((caught as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw caught;
      }
      setDialog("error");
      setMessage(
        caught instanceof Error ? caught.message : "Hasta kaldırılamadı.",
      );
    }
  }

  const className =
    variant === "danger"
      ? "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-700 px-4 text-sm font-semibold text-white sm:w-auto sm:min-h-10"
      : variant === "link"
        ? "inline-flex min-h-10 items-center justify-center px-2 text-xs font-semibold text-red-700 hover:underline"
        : "inline-flex min-h-10 w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 lg:w-auto";

  return (
    <>
      <form onSubmit={onSubmit}>
        <button type="submit" className={className}>
          Hastayı sil
        </button>
      </form>
      <AdminConfirmDialog
        status={dialog}
        title="Hastayı kaldır?"
        message={message}
        confirmLabel="Evet, kaldır"
        loadingTitle="Hasta kaldırılıyor"
        errorTitle="Kaldırılamadı"
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
