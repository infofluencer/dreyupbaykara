"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AdminHomeSiteFilter({
  siteOptions,
  currentSite,
}: {
  siteOptions: string[];
  currentSite: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(site: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (site) {
      next.set("site", site);
    } else {
      next.delete("site");
    }
    const qs = next.toString();
    router.push(qs ? `/admin?${qs}` : "/admin");
  }

  return (
    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm font-medium text-[#466254]">Site</span>
      <select
        value={currentSite ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-xl border border-[#123524]/12 bg-white px-3 text-sm text-[#123524] outline-none focus:border-[#0b6b45]/40"
      >
        <option value="">Tüm siteler</option>
        {siteOptions.map((site) => (
          <option key={site} value={site}>
            {site}
          </option>
        ))}
      </select>
    </label>
  );
}
