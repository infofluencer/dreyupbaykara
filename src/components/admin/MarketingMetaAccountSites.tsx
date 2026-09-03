import { setAdAccountSite } from "@/app/admin/marketing-actions";

type MetaAccountRow = {
  id: string;
  external_account_id: string;
  display_name: string | null;
  is_active: boolean;
  has_token: boolean;
};

export function MarketingMetaAccountSites({
  accounts,
  siteByExternalId,
  siteOptions,
}: {
  accounts: MetaAccountRow[];
  siteByExternalId: Record<string, string>;
  siteOptions: string[];
}) {
  if (!accounts.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold text-[#123524]">
        Hesap → site eşlemesi
      </p>
      <p className="text-xs text-[#466254]">
        Her Meta reklam hesabını bir siteye bağlayın; harcama ve kampanyalar
        site filtresinde o siteye düşer.
      </p>
      <ul className="space-y-2">
        {accounts.map((account) => {
          const externalId = account.external_account_id.replace(/^act_/, "");
          const currentSite = siteByExternalId[externalId] ?? "";

          return (
            <li
              key={account.id}
              className="rounded-xl border border-[#123524]/08 bg-[#f7f9f8] px-3 py-3"
            >
              <form
                action={setAdAccountSite}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <input type="hidden" name="platform" value="meta" />
                <input type="hidden" name="account_id" value={account.id} />
                <input
                  type="hidden"
                  name="external_account_id"
                  value={externalId}
                />
                <input
                  type="hidden"
                  name="label"
                  value={account.display_name || `Meta act_${externalId}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#123524]">
                    {account.display_name || "Meta hesabı"}
                  </p>
                  <p className="font-mono text-xs text-[#466254]">
                    act_{externalId}
                    {account.is_active && account.has_token
                      ? " · hazır"
                      : " · token yok"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    name="site"
                    defaultValue={currentSite}
                    className="min-h-10 flex-1 rounded-xl border border-[#123524]/12 bg-white px-3 text-sm sm:min-w-[12rem]"
                  >
                    <option value="">— Site seç —</option>
                    {siteOptions.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
