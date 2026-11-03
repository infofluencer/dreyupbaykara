"use client";

import { useLinkStatus } from "next/link";

/**
 * Prefetch bitmeden tıklanan menü öğesinde, iskelet gelene kadar tıklamayı onaylar.
 * Hızlı geçişlerde yanıp sönmesin diye gecikmeli belirir; üst Link `relative` olmalı.
 */
export function AdminNavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#73df68] transition-opacity ${
        pending ? "opacity-100 delay-100" : "opacity-0"
      }`}
    />
  );
}
