"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function MarketingEnvCopy({ lines }: { lines: string[] }) {
  const text = lines.join("\n");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: user selects manually */
    }
  }

  if (!lines.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#0b6b45]/25 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#123524]">
          Dokploy env — kopyalayıp kaydedin, redeploy edin
        </p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#123524] px-2.5 py-1.5 text-[11px] font-semibold text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Kopyalandı
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Kopyala
            </>
          )}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-[#f7f9f8] p-3 font-mono text-[11px] text-[#123524]">
        {text}
      </pre>
    </div>
  );
}
