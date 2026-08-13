import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-2xl border border-[#123524]/08 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-[#0b6b45]">
          Admin
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
          Panele giriş
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Hasta talep ve WhatsApp paneline erişim için giriş yapın.
        </p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-[#466254]">Yükleniyor…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
