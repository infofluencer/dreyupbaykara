"use client";

import type { FormEvent } from "react";
import { deletePatientNote } from "@/app/admin/actions";

export function DeletePatientNoteButton({
  id,
  contactId,
}: {
  id: string;
  contactId: string;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Bu hasta notu silinsin mi?")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deletePatientNote} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="contact_id" value={contactId} />
      <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
        Sil
      </button>
    </form>
  );
}
