"use client";

import type { FormEvent } from "react";
import { deletePatient } from "@/app/admin/actions";

export function DeletePatientButton({
  contactId,
  patientName,
  variant = "button",
}: {
  contactId: string;
  patientName?: string | null;
  variant?: "button" | "danger" | "link";
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const who = patientName?.trim() || "bu hasta";
    const ok = window.confirm(
      `${who} hastalardan kaldırılsın mı?\n\nListeden çıkar; WhatsApp konuşması ve randevular silinmez.`,
    );
    if (!ok) event.preventDefault();
  }

  const className =
    variant === "danger"
      ? "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-700 px-4 text-sm font-semibold text-white sm:w-auto sm:min-h-10"
      : variant === "link"
        ? "inline-flex min-h-10 items-center justify-center px-2 text-xs font-semibold text-red-700 hover:underline"
        : "inline-flex min-h-10 w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 lg:w-auto";

  return (
    <form action={deletePatient} onSubmit={onSubmit}>
      <input type="hidden" name="contact_id" value={contactId} />
      <button type="submit" className={className}>
        Hastayı sil
      </button>
    </form>
  );
}
