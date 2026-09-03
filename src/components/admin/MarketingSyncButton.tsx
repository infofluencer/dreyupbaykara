"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerMarketingSyncNow } from "@/app/admin/marketing-actions";
import {
  AdminConfirmDialog,
  type AdminDialogStatus,
} from "@/components/admin/AdminConfirmDialog";

export function MarketingSyncButton({
  channel,
}: {
  channel?: "google" | "meta";
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<AdminDialogStatus>(null);
  const [message, setMessage] = useState<string | null>(null);

  const label =
    channel === "meta"
      ? "Meta verisini çek (sync)"
      : channel === "google"
        ? "Google verisini çek (sync)"
        : "Veriyi şimdi çek (sync)";

  const loadingTitle =
    channel === "meta"
      ? "Meta verisi çekiliyor"
      : channel === "google"
        ? "Google verisi çekiliyor"
        : "Reklam verisi çekiliyor";

  async function runSync() {
    setDialog("loading");
    setMessage(null);
    try {
      const result = await triggerMarketingSyncNow();
      setMessage(result.message);
      setDialog(result.ok ? "success" : "error");
      if (result.ok) {
        router.refresh();
      }
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Sync sırasında hata oluştu.",
      );
      setDialog("error");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void runSync()}
        disabled={dialog === "loading"}
        className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#0b6b45] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {dialog === "loading" ? "Sync çalışıyor…" : label}
      </button>
      <AdminConfirmDialog
        status={dialog}
        message={message}
        loadingTitle={loadingTitle}
        loadingMessage="Google ve Meta hesapları güncelleniyor. Bu işlem bir süre sürebilir…"
        successTitle="Sync tamamlandı"
        errorTitle="Sync uyarısı"
        onClose={() => {
          if (dialog === "loading") return;
          setDialog(null);
          setMessage(null);
        }}
      />
    </div>
  );
}
