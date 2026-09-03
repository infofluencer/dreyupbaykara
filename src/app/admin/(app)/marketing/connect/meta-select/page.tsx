import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/admin/auth";
import { selectMetaAdAccount } from "@/app/admin/marketing-actions";
import { fetchMetaAdAccounts } from "@/lib/marketing/meta/client";
import { loadSiteOptions } from "@/lib/marketing/admin-stats";
import { META_PENDING_COOKIE } from "@/lib/marketing/meta/pending";

const ACCOUNT_STATUS: Record<number, string> = {
  1: "Aktif",
  2: "Devre dışı",
  3: "Beklemede",
  7: "Risk incelemesi",
  9: "Kapatıldı",
  100: "İç hata",
  101: "Kapalı (politika)",
};

export default async function MetaSelectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "agency"]);
  const query = await searchParams;

  const cookieStore = await cookies();
  const raw = cookieStore.get(META_PENDING_COOKIE)?.value;
  if (!raw) {
    redirect("/admin/marketing/connect?error=meta_state");
  }

  let accessToken = "";
  try {
    const pending = JSON.parse(raw) as { accessToken?: string };
    accessToken = pending.accessToken?.trim() || "";
  } catch {
    redirect("/admin/marketing/connect?error=meta_state");
  }

  if (!accessToken) {
    redirect("/admin/marketing/connect?error=meta_token");
  }

  let accounts: Awaited<ReturnType<typeof fetchMetaAdAccounts>> = [];
  let listError: string | null = null;
  try {
    accounts = await fetchMetaAdAccounts(accessToken);
  } catch (err) {
    listError =
      err instanceof Error ? err.message : "Reklam hesapları listelenemedi";
  }

  const siteOptions = await loadSiteOptions();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/marketing/connect"
          className="text-sm font-semibold text-[#0b6b45]"
        >
          ← Bağlantı sayfası
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
          Meta reklam hesabı seç
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Birden fazla hesap işaretleyebilirsiniz. Sync hepsinin kampanya ve
          harcama verilerini çeker. Listede yoksa aşağıya Ad ID yapıştırın.
        </p>
      </div>

      {query.error === "meta_pick" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          En az bir reklam hesabı seçin veya Ad ID girin.
        </p>
      ) : null}

      {listError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Hesaplar listelenemedi</p>
          <p className="mt-1">{listError}</p>
          <p className="mt-2 text-xs">
            Yine de bildiğiniz Ad ID&apos;leri manuel girebilirsiniz. App&apos;te{" "}
            <code>ads_read</code> yoksa liste boş kalır.
          </p>
        </div>
      ) : null}

      <form action={selectMetaAdAccount} className="space-y-4">
        {accounts.length ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[#123524]">
              Erişilebilir hesaplar ({accounts.length})
            </legend>
            <ul className="space-y-2">
              {accounts.map((account) => (
                <li key={account.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#123524]/10 bg-white px-4 py-3 hover:border-[#0b6b45]/40 has-[:checked]:border-[#0b6b45] has-[:checked]:bg-[#e7f5ed]">
                    <input
                      type="checkbox"
                      name="ad_account_id"
                      value={`${account.id}|||${account.name}`}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#123524]">
                        {account.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-[#466254]">
                        act_{account.id}
                        {account.currency ? ` · ${account.currency}` : ""}
                        {account.accountStatus != null
                          ? ` · ${ACCOUNT_STATUS[account.accountStatus] ?? `status ${account.accountStatus}`}`
                          : ""}
                      </span>
                      {account.businessName ? (
                        <span className="mt-0.5 block text-xs text-[#466254]/80">
                          BM: {account.businessName}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <div>
          <label className="text-sm font-semibold text-[#123524]">
            Manuel Ad ID (opsiyonel)
          </label>
          <p className="mt-1 text-xs text-[#466254]">
            Virgülle birden fazla: <code>1234567890, 9876543210</code> (
            <code>act_</code> opsiyonel)
          </p>
          <textarea
            name="manual_ad_account_ids"
            rows={2}
            placeholder="2990529357911124, ..."
            className="mt-2 w-full rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3 py-2 font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#123524]">
            Site eşlemesi (opsiyonel — tüm seçilenlere)
          </label>
          <p className="mt-1 text-xs text-[#466254]">
            Farklı siteler için sonra connect sayfasındaki haritayı kullanın.
          </p>
          <select
            name="site"
            className="mt-2 min-h-10 w-full rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3 text-sm"
            defaultValue=""
          >
            <option value="">— Sonra eşleştir —</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white sm:w-auto"
        >
          Seçilen hesapları bağla
        </button>
      </form>
    </div>
  );
}
