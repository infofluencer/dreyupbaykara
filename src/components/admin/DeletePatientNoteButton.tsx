"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deletePatientNote } from "@/app/admin/actions";
import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";

export function DeletePatientNoteButton({
  id,
  contactId,
}: {
  id: string;
  contactId: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<AdminDialogStatus>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Bu hasta notu silinsin mi?");
    setDialog("confirm");
  }

  async function runDelete() {
    setDialog("loading");
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("contact_id", contactId);
      await deletePatientNote(formData);
      setMessage("Not silindi.");
      setDialog("success");
      router.refresh();
    } catch (caught) {
      setDialog("error");
      setMessage(caught instanceof Error ? caught.message : "Not silinemedi.");
    }
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <button
          type="submit"
          className="text-xs font-semibold text-red-700 hover:underline"
        >
          Sil
        </button>
      </form>
      <AdminConfirmDialog
        status={dialog}
        title="Not silinsin mi?"
        message={message}
        confirmLabel="Evet, sil"
        loadingTitle="Not siliniyor"
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
