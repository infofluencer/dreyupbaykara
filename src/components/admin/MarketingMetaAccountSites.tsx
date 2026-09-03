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
  sitesByExternalId,
  siteOptions,
}: {
  accounts: MetaAccountRow[];
  sitesByExternalId: Record<string, string[]>;
  siteOptions: string[];
}) {
  if (!accounts.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold text-[#123524]">
        Hesap → site eşlemesi
      </p>
      <p className="text-xs text-[#466254]">
        Bir hesaba birden fazla site işaretlenebilir. Tek site seçilirse tüm
        kampanyalar o siteye gider; birden fazlaysa kampanyalar{" "}
        <code>[PREFIX]</code> veya manuel eşleme ile ayrılır.
      </p>
      <ul className="space-y-3">
        {accounts.map((account) => {
          const externalId = account.external_account_id.replace(/^act_/, "");
          const selected = new Set(sitesByExternalId[externalId] ?? []);

          return (
            <li
              key={account.id}
              className="rounded-xl border border-[#123524]/08 bg-[#f7f9f8] px-3 py-3"
            >
              <form action={setAdAccountSite} className="space-y-3">
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
                <div className="flex flex-wrap gap-2">
                  {siteOptions.map((site) => (
                    <label
                      key={site}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#123524]/10 bg-white px-3 py-2 text-sm has-[:checked]:border-[#0b6b45] has-[:checked]:bg-[#e7f5ed]"
                    >
                      <input
                        type="checkbox"
                        name="site"
                        value={site}
                        defaultChecked={selected.has(site)}
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-4 text-sm font-semibold text-white"
                >
                  Kaydet
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
