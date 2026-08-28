"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Form gönderilirken alanları soluklaştırır; useFormStatus için form içinde kullanın.
 */
export function FormPendingShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div
      className={`relative transition-opacity duration-200 ${pending ? "pointer-events-none opacity-60" : ""} ${className}`}
      aria-busy={pending}
    >
      {children}
      {pending ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
