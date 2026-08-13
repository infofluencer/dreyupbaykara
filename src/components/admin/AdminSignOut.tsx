"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminSignOut({
  tone = "light",
  compact = false,
}: {
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const router = useRouter();

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      title="Çıkış"
      className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
        tone === "dark"
          ? "text-white/65 hover:bg-white/10 hover:text-white"
          : "border border-[#123524]/12 text-[#466254] hover:border-[#123524]/25 hover:text-[#123524]"
      }`}
    >
      <LogOut className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden />
      <span className={compact ? "ml-3 hidden lg:block" : "ml-2"}>Çıkış</span>
    </button>
  );
}
