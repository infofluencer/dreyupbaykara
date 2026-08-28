"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/admin/Spinner";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError === "yetkisiz"
      ? "Bu hesap için panel yetkisi yok. Yöneticiden rol tanımlamasını isteyin."
      : null,
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Giriş başarısız. E-posta veya şifreyi kontrol edin.");
      return;
    }

    router.push(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-[#123524]">E-posta</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/12 bg-white px-3.5 py-3 text-base outline-none focus:border-[#0b6b45]/45"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#123524]">Şifre</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/12 bg-white px-3.5 py-3 text-base outline-none focus:border-[#0b6b45]/45"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {authError === "yetkisiz" ? (
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#123524]/15 px-5 text-sm font-semibold text-[#123524]"
        >
          Çıkış yap
        </button>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0b6b45] px-5 text-base font-semibold text-white transition hover:bg-[#085436] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="text-white" label="Giriş yapılıyor" />
            Giriş yapılıyor…
          </>
        ) : (
          "Giriş yap"
        )}
      </button>
    </form>
  );
}
