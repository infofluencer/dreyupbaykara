import { assignCampaignSite } from "@/app/admin/marketing-actions";

export function UnmatchedCampaignRow({
  campaign,
  siteOptions,
}: {
  campaign: {
    id: string;
    platform: string;
    name: string;
    status: string | null;
  };
  siteOptions: string[];
}) {
  return (
    <form
      action={assignCampaignSite}
      className="flex flex-col gap-2 rounded-xl border border-[#123524]/10 bg-[#f7f9f8] p-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="campaign_id" value={campaign.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#123524]">
          {campaign.name}
        </p>
        <p className="text-[11px] text-[#466254]/80">
          {campaign.platform === "google_ads" ? "Google Ads" : "Meta"}
          {campaign.status ? ` · ${campaign.status}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <select
          name="site"
          required
          defaultValue=""
          className="min-h-10 flex-1 rounded-xl border border-[#123524]/12 bg-white px-3 text-sm outline-none focus:border-[#0b6b45]/40 sm:min-w-[12rem]"
        >
          <option value="" disabled>
            Site seç…
          </option>
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
          Ata
        </button>
      </div>
    </form>
  );
}
