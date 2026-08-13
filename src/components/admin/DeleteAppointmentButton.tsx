"use client";

import type { FormEvent } from "react";
import { deleteAppointment } from "@/app/admin/actions";

export function DeleteAppointmentButton({
  id,
  label = "Sil",
  className = "inline-flex min-h-8 items-center text-xs font-semibold text-red-700",
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Bu randevu kalıcı olarak silinsin mi?")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteAppointment} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
