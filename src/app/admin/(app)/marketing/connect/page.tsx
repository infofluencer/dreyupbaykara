import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { addSitePrefix } from "@/app/admin/marketing-actions";
import {
  isGoogleAdsConfigured,
  isGoogleAdsEnvReady,
  isMetaAdsConfigured,
  isMetaEnvReady,
  hasGoogleEnvTokens,
  hasMetaEnvToken,
} from "@/lib/marketing/config";
import { loadAdAccountsSafe } from "@/lib/marketing/admin-stats";
import { createServiceClient } from "@/lib/supabase/admin";
import { bootstrapAdAccountsFromEnv, loadAdAccountEnvExport } from "@/lib/marketing/tokens";
import { createClient } from "@/lib/supabase/server";
import { MarketingEnvCopy } from "@/components/admin/MarketingEnvCopy";

const ERROR_LABEL: Record<string, string> = {
  google_env: "Google OAuth env değişkenleri eksik.",
  google_state: "Google OAuth state doğrulanamadı — tekrar deneyin.",
  google_token: "Google token alınamadı.",
  meta_env: "Meta OAuth env değişkenleri eksik (META_APP_ID / META_APP_SECRET).",
  meta_state: "Meta OAuth state doğrulanamadı — tekrar deneyin.",
  meta_token: "Meta token alınamadı.",
  meta_pick: "Meta reklam hesabı seçilmedi.",
  supabase: "Supabase service role yapılandırılmadı.",
};

export default async function MarketingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; meta_count?: string }>;
}) {
  const session = await requireAdminSession(["admin", "doctor", "agency"]);
  const query = await searchParams;

  const service = createServiceClient();
  if (service) {
    await bootstrapAdAccountsFromEnv(service);
  }

  let envExport: { googleRefreshToken: string | null; metaAccessToken: string | null } | null =
    null;
  if (session.role === "admin" && service) {
    try {
      envExport = await loadAdAccountEnvExport(service);
    } catch {
      envExport = null;
    }
  }

  const accounts = await loadAdAccountsSafe();

  const supabase = await createClient();
  const { data: prefixes } = await supabase
    .from("site_prefix_map")
    .select("prefix, site")
    .order("prefix");

  const { data: customerSites } = await supabase
    .from("ad_customer_site_map")
    .select("platform, external_customer_id, site, label")
    .order("platform")
    .order("external_customer_id");

  const googleAccount = accounts.find((a) => a.platform === "google_ads");
  const metaAccounts = accounts.filter((a) => a.platform === "meta");
  const metaAccount = metaAccounts[0];

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
        <Notice ok>
          Google Ads hesabı bağlandı.
          {session.role === "admin" && envExport?.googleRefreshToken ? (
            <MarketingEnvCopy
              lines={[
                `GOOGLE_ADS_REFRESH_TOKEN=${envExport.googleRefreshToken}`,
              ]}
            />
          ) : session.role === "admin" ? (
            <p className="mt-2 text-xs">
              Refresh token gelmediyse Google hesabında uygulama iznini kaldırıp
              yeniden bağlayın.
            </p>
          ) : null}
        </Notice>
      ) : null}
      {query.connected === "meta" ? (
        <Notice ok>
          Meta reklam hesabı bağlandı
          {query.meta_count ? ` (${query.meta_count} hesap)` : ""}.
          {session.role === "admin" && envExport?.metaAccessToken ? (
            <MarketingEnvCopy
              lines={[`META_ACCESS_TOKEN=${envExport.metaAccessToken}`]}
            />
          ) : null}
        </Notice>
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
          envReady={isGoogleAdsEnvReady()}
          hasEnvToken={hasGoogleEnvTokens()}
          account={googleAccount}
          connectHref="/api/marketing/oauth/google"
          envHint="GOOGLE_ADS_* + GOOGLE_ADS_REFRESH_TOKEN (kalıcı) veya OAuth"
        />
        <AccountCard
          title="Meta"
          configured={isMetaAdsConfigured()}
          envReady={isMetaEnvReady()}
          hasEnvToken={hasMetaEnvToken()}
          account={metaAccount}
          connectHref="/api/marketing/oauth/meta"
          envHint="META_APP_ID + META_APP_SECRET (hesap OAuth sonrası seçilir)"
          extra={
            metaAccounts.length > 1 ? (
              <ul className="mt-3 space-y-1 text-xs text-[#466254]">
                {metaAccounts.map((row) => (
                  <li key={row.id} className="font-mono">
                    {row.display_name || row.external_account_id} ·{" "}
                    act_{row.external_account_id.replace(/^act_/, "")}
                  </li>
                ))}
              </ul>
            ) : null
          }
        />
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-[#f7f9f8] px-4 py-4 text-sm text-[#466254]">
        <p className="font-semibold text-[#123524]">Meta hesap seçimi</p>
        <p className="mt-2">
          <code>META_AD_ACCOUNT_IDS</code> (veya <code>META_AD_ACCOUNT_ID</code>)
          env&apos;de tanımlıysa OAuth sonrası hesap seçmeniz gerekmez — ID&apos;ler
          otomatik bağlanır. Token da env&apos;deyse (
          <code>META_ACCESS_TOKEN</code>) OAuth hiç gerekmez.
        </p>
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-[#f7f9f8] px-4 py-4 text-sm text-[#466254]">
        <p className="font-semibold text-[#123524]">Kalıcı bağlantı (canlı OAuth)</p>
        <p className="mt-2">
          Dokploy&apos;da <code>CLIENT_ID</code> / <code>SECRET</code> tanımlıyken
          canlı siteden OAuth yapın; token satırları burada görünür. Env&apos;e
          yapıştırıp redeploy edin — bir daha OAuth gerekmez.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>
            <code>MARKETING_OAUTH_REDIRECT_BASE=https://endoskopikbelameliyati.com</code>{" "}
            (Dokploy)
          </li>
          <li>
            Google/Meta console&apos;da redirect:{" "}
            <code>https://endoskopikbelameliyati.com/api/marketing/oauth/google/callback</code>
          </li>
          <li>
            Aşağıdaki <strong>bağla (OAuth)</strong> veya{" "}
            <code>npm run marketing:tokens prod google</code>
          </li>
          <li>Başarılı olunca env satırını kopyala → Dokploy → redeploy</li>
        </ol>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Google:</strong>{" "}
            <code>GOOGLE_ADS_REFRESH_TOKEN</code> (bir kez alınır, süresiz —
            access token otomatik yenilenir)
          </li>
          <li>
            <strong>Meta:</strong>{" "}
            <code>META_ACCESS_TOKEN</code> (Business Manager → System User
            token, süresiz; veya long-lived user token ~60 gün)
          </li>
        </ul>
        {session.role === "admin" &&
        (envExport?.googleRefreshToken || envExport?.metaAccessToken) &&
        !query.connected ? (
          <div className="mt-4">
            <p className="font-semibold text-[#123524]">
              Kayıtlı token&apos;lar (Dokploy env)
            </p>
            <MarketingEnvCopy
              lines={[
                ...(envExport.googleRefreshToken
                  ? [`GOOGLE_ADS_REFRESH_TOKEN=${envExport.googleRefreshToken}`]
                  : []),
                ...(envExport.metaAccessToken
                  ? [`META_ACCESS_TOKEN=${envExport.metaAccessToken}`]
                  : []),
              ]}
            />
          </div>
        ) : null}
        <p className="mt-3 text-xs">
          Env token tanımlıysa OAuth butonları gizlenir; cron env&apos;den bootstrap eder.
        </p>
      </section>

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Google / Meta hesap → site
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Kampanya adında <code>[PREFIX]</code> yoksa reklam hesabı ID&apos;sine
          göre site atanır. Ajans haritası:
        </p>
        <ul className="mt-4 space-y-2">
          {(customerSites ?? []).map((row) => (
            <li
              key={`${row.platform}-${row.external_customer_id}`}
              className="flex flex-col gap-1 rounded-xl bg-[#f7f9f8] px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-mono text-[#123524]">
                {row.platform === "google_ads" ? "Google" : "Meta"}{" "}
                {row.external_customer_id.replace(
                  /(\d{3})(\d{3})(\d{4})/,
                  "$1-$2-$3",
                )}
              </span>
              <span className="text-[#466254]">
                {row.label ? `${row.label} → ` : ""}
                <strong>{row.site}</strong>
              </span>
            </li>
          ))}
        </ul>
        {!customerSites?.length ? (
          <p className="mt-3 text-sm text-amber-900">
            Harita boş — migration{" "}
            <code>20260902160000_ad_customer_site_map.sql</code> uygulayın.
          </p>
        ) : null}
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
        <p className="font-semibold text-[#123524]">Cron sync (Dokploy)</p>
        <p className="mt-2">
          Vercel cron yok. Elle aşağıdaki curl <strong>Google + Meta, son 720
          gün</strong> kampanya harcamasını çeker (birkaç dakika sürebilir).
          Sonrasında her gece 02:00 İstanbul’da son 30 gün yenilenir.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs">
          {`curl --max-time 900 -X POST https://endoskopikbelameliyati.com/api/cron/marketing-sync \\
  -H "Authorization: Bearer $CRON_SECRET"`}
        </pre>
      </section>
    </div>
  );
}

function AccountCard({
  title,
  configured,
  envReady,
  hasEnvToken,
  account,
  connectHref,
  envHint,
  extra,
}: {
  title: string;
  configured: boolean;
  envReady: boolean;
  hasEnvToken: boolean;
  account?: {
    is_active: boolean;
    has_token: boolean;
    display_name: string | null;
    external_account_id: string;
    token_expires_at: string | null;
  };
  connectHref: string;
  envHint: string;
  extra?: ReactNode;
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
        ) : envReady ? (
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-900">
            Env hazır
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            Bağlı değil
          </span>
        )}
      </div>

      {extra}

      {!configured ? (
        <p className="mt-3 text-sm text-amber-900">
          Env eksik: <code>{envHint}</code>
        </p>
      ) : hasEnvToken ? (
        <p className="mt-3 text-sm text-[#0b6b45]">
          Env token tanımlı — sync/cron otomatik bağlar. OAuth gerekmez.
        </p>
      ) : (
        <a
          href={connectHref}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white"
        >
          {connected ? "Yeniden bağla (OAuth)" : `${title} bağla (OAuth)`}
        </a>
      )}

      {configured && hasEnvToken && !connected ? (
        <p className="mt-2 text-xs text-[#466254]">
          Sayfayı yenileyin veya cron sync çalıştırın.
        </p>
      ) : null}

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
