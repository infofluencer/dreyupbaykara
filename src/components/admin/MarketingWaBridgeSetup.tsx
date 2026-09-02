"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const BRIDGE_ORIGIN = "https://endoskopikbelameliyati.com";

const SITES = [
  {
    id: "endospineistanbul",
    label: "endospineistanbul.com",
    hint: "Google hesap 647-432-9013",
  },
  {
    id: "fitikameliyati",
    label: "fitikameliyati.com",
    hint: "Google hesap 929-825-6533",
  },
] as const;

function snippet(site: string) {
  return `<script
  src="${BRIDGE_ORIGIN}/marketing-wa-bridge.js"
  data-site="${site}"
  defer
></script>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#123524]/12 bg-white px-3 text-xs font-semibold text-[#123524] hover:border-[#0b6b45]/30"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-[#0b6b45]" />
          Kopyalandı
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Kopyala
        </>
      )}
    </button>
  );
}

export function MarketingWaBridgeSetup() {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
        CRM lead eşleşmesi — WordPress kurulum
      </h2>
      <p className="mt-1 text-sm text-[#466254]">
        Reklam sitelerindeki WhatsApp butonları doğrudan{" "}
        <code className="rounded bg-[#123524]/06 px-1">wa.me</code> açıyorsa{" "}
        <code className="rounded bg-[#123524]/06 px-1">gclid</code> CRM&apos;e
        ulaşmaz. Aşağıdaki script reklam parametrelerini koruyarak ana site
        üzerinden WhatsApp&apos;a yönlendirir.
      </p>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#466254]">
        <li>WordPress → Görünüm → Tema düzenleyici → footer.php (veya Insert Headers and Footers eklentisi)</li>
        <li>Siteye uygun kodu kapanış <code className="rounded bg-[#123524]/06 px-1">&lt;/body&gt;</code> etiketinden hemen önce yapıştırın</li>
        <li>Google reklamından siteye gelip WhatsApp&apos;a tıklayın — lead&apos;de gclid görünmeli</li>
      </ol>

      <div className="mt-5 space-y-4">
        {SITES.map((site) => {
          const code = snippet(site.id);
          return (
            <div
              key={site.id}
              className="rounded-xl border border-[#123524]/08 bg-[#f8faf9] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#123524]">
                    {site.label}
                  </p>
                  <p className="text-xs text-[#466254]">{site.hint}</p>
                </div>
                <CopyButton text={code} />
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[#123524] p-3 text-xs text-[#e8f5ef]">
                <code>{code}</code>
              </pre>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-[#466254]/90">
        Script yalnızca URL&apos;de reklam parametresi (gclid, utm vb.) varken
        devreye girer; organik ziyaretçilerin WhatsApp linkleri değişmez.
      </p>
    </section>
  );
}
