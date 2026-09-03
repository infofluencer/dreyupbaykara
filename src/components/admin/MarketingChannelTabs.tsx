import Link from "next/link";
import { buildMarketingHref } from "@/lib/marketing/urls";

export type MarketingChannel = "google" | "meta";

export function MarketingChannelTabs({
  channel,
  period,
  startDate,
  endDate,
  siteFilter,
  event,
  search,
  googleConnected,
  metaConnected,
}: {
  channel: MarketingChannel;
  period: string;
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  event: string;
  search: string;
  googleConnected: boolean;
  metaConnected: boolean;
}) {
  const tabs: Array<{
    id: MarketingChannel;
    label: string;
    hint: string;
  }> = [
    {
      id: "google",
      label: "Google Ads",
      hint: googleConnected ? "Bağlı" : "Bağlı değil",
    },
    {
      id: "meta",
      label: "Meta",
      hint: metaConnected ? "Bağlı" : "Bağlı değil",
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tabs.map((tab) => {
        const active = channel === tab.id;
        const href = buildMarketingHref({
          period,
          start: period === "custom" ? startDate : undefined,
          end: period === "custom" ? endDate : undefined,
          site: siteFilter ?? undefined,
          channel: tab.id,
          event,
          q: search,
        });

        return (
          <Link
            key={tab.id}
            href={href}
            className={`rounded-2xl border px-5 py-4 transition ${
              active
                ? "border-[#123524] bg-[#123524] text-white"
                : "border-[#123524]/10 bg-white text-[#123524] hover:border-[#0b6b45]/35"
            }`}
          >
            <p className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
              {tab.label}
            </p>
            <p
              className={`mt-1 text-xs ${
                active ? "text-white/75" : "text-[#466254]"
              }`}
            >
              {tab.hint}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
