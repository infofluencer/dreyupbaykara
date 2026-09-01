import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { addSitePrefix } from "@/app/admin/marketing-actions";
import {
  isGoogleAdsConfigured,
  isMetaAdsConfigured,
} from "@/lib/marketing/config";
import { loadAdAccountsSafe } from "@/lib/marketing/admin-stats";
import { createClient } from "@/lib/supabase/server";

const ERROR_LABEL: Record<string, string> = {
  google_env: "Google OAuth env değişkenleri eksik.",
  google_state: "Google OAuth state doğrulanamadı — tekrar deneyin.",
  google_token: "Google token alınamadı.",
  meta_env: "Meta OAuth env değişkenleri eksik.",
  meta_state: "Meta OAuth state doğrulanamadı — tekrar deneyin.",
  meta_token: "Meta token alınamadı.",
  supabase: "Supabase service role yapılandırılmadı.",
};

export default async function MarketingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "agency"]);
  const query = await searchParams;
  const accounts = await loadAdAccountsSafe();

  const supabase = await createClient();
  const { data: prefixes } = await supabase
    .from("site_prefix_map")
    .select("prefix, site")
    .order("prefix");

  const googleAccount = accounts.find((a) => a.platform === "google_ads");
  const metaAccount = accounts.find((a) => a.platform === "meta");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/marketing"
          className="text-sm font-semibold text-[#0b6b45]"
        >
          ← Reklam performansı
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
          Reklam hesaplarını bağla
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Token&apos;lar veritabanında saklanır. Cron sync günde 1–2 kez
          kampanya ve harcama verilerini çeker.
        </p>
      </div>

      {query.connected === "google" ? (
        <Notice ok>Google Ads hesabı bağlandı.</Notice>
      ) : null}
      {query.connected === "meta" ? (
        <Notice ok>Meta reklam hesabı bağlandı.</Notice>
      ) : null}
      {query.error ? (
        <Notice>
          {ERROR_LABEL[query.error] || `Bağlantı hatası: ${query.error}`}
        </Notice>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <AccountCard
          title="Google Ads"
          configured={isGoogleAdsConfigured()}
          account={googleAccount}
          connectHref="/api/marketing/oauth/google"
          envHint="GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID"
        />
        <AccountCard
          title="Meta"
          configured={isMetaAdsConfigured()}
          account={metaAccount}
          connectHref="/api/marketing/oauth/meta"
          envHint="META_APP_ID, META_APP_SECRET, META_AD_ACCOUNT_ID"
        />
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Site prefix haritası
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Kampanya adı <code>[BEL] Endoskopik Bel</code> formatındaysa otomatik
          site eşleşir.
        </p>

        <ul className="mt-4 space-y-2">
          {(prefixes ?? []).map((row) => (
            <li
              key={row.prefix}
              className="flex items-center justify-between rounded-xl bg-[#f7f9f8] px-3 py-2 text-sm"
            >
              <span className="font-mono font-semibold text-[#123524]">
                [{row.prefix}]
              </span>
              <span className="text-[#466254]">{row.site}</span>
            </li>
          ))}
        </ul>

        <form action={addSitePrefix} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            name="prefix"
            placeholder="PREFIX (örn. BEL)"
            required
            className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3 text-sm uppercase"
          />
          <input
            name="site"
            placeholder="site kodu"
            required
            className="min-h-10 flex-1 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3 text-sm"
          />
          <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white">
            Ekle
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-[#f7f9f8] px-4 py-4 text-sm text-[#466254]">
        <p className="font-semibold text-[#123524]">Cron sync</p>
        <p className="mt-2">
          Vercel: <code>vercel.json</code> içinde{" "}
          <code>/api/cron/marketing-sync</code> (günde 2 kez). Manuel:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs">
          {`curl -X POST https://ALAN-ADINIZ/api/cron/marketing-sync \\
  -H "Authorization: Bearer $CRON_SECRET"`}
        </pre>
      </section>
    </div>
  );
}

function AccountCard({
  title,
  configured,
  account,
  connectHref,
  envHint,
}: {
  title: string;
  configured: boolean;
  account?: {
    is_active: boolean;
    has_token: boolean;
    display_name: string | null;
    external_account_id: string;
    token_expires_at: string | null;
  };
  connectHref: string;
  envHint: string;
}) {
  const connected = account?.is_active && account?.has_token;

  return (
    <article className="rounded-2xl border border-[#123524]/08 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            {title}
          </h2>
          {account?.display_name ? (
            <p className="mt-1 text-sm text-[#466254]">{account.display_name}</p>
          ) : null}
          {account?.external_account_id ? (
            <p className="mt-0.5 font-mono text-xs text-[#466254]/80">
              {account.external_account_id}
            </p>
          ) : null}
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f5ed] px-2.5 py-1 text-[11px] font-semibold text-[#0b6b45]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bağlı
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            Bağlı değil
          </span>
        )}
      </div>

      {!configured ? (
        <p className="mt-3 text-sm text-amber-900">
          Env eksik: <code>{envHint}</code>
        </p>
      ) : (
        <a
          href={connectHref}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white"
        >
          {connected ? "Yeniden bağla" : `${title} bağla`}
        </a>
      )}

      {account?.token_expires_at ? (
        <p className="mt-2 text-[11px] text-[#466254]/80">
          Token bitiş: {new Date(account.token_expires_at).toLocaleString("tr-TR")}
        </p>
      ) : null}
    </article>
  );
}

function Notice({
  children,
  ok = false,
}: {
  children: ReactNode;
  ok?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        ok
          ? "border border-[#0b6b45]/20 bg-[#e7f5ed] text-[#0b6b45]"
          : "border border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      {children}
    </div>
  );
}
