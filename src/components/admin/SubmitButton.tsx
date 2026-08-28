"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/admin/Spinner";

const VARIANT_CLASS = {
  primary:
    "bg-[#0b6b45] text-white hover:bg-[#085436] disabled:hover:bg-[#0b6b45]",
  secondary:
    "border border-[#123524]/15 bg-white text-[#123524] hover:bg-[#f7f9f8]",
  dark: "bg-[#123524] text-white hover:bg-[#0a2a1c] disabled:hover:bg-[#123524]",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:hover:bg-red-700",
  dangerGhost:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:hover:bg-white",
} as const;

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof VARIANT_CLASS;
};

/**
 * Server action formlarında useFormStatus ile anında geri bildirim.
 * Form içinde, submit butonu olarak kullanın.
 */
export function SubmitButton({
  children,
  pendingLabel = "Kaydediliyor…",
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner size="sm" className="text-current opacity-90" label={pendingLabel} />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
