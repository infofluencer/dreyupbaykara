"use client";

import { useState } from "react";
import { triggerMarketingSyncNow } from "@/app/admin/marketing-actions";

export function MarketingSyncButton() {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function runSync() {
    setPending(true);
    setMessage("");
    const result = await triggerMarketingSyncNow();
    setOk(result.ok);
    setMessage(result.message);
    setPending(false);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={runSync}
        disabled={pending}
        className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#0b6b45] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sync çalışıyor…" : "Veriyi şimdi çek (sync)"}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs ${ok ? "text-[#0b6b45]" : "text-amber-900"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
