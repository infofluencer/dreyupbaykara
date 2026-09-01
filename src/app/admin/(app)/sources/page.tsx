import { redirect } from "next/navigation";
import { buildMarketingHref } from "@/lib/marketing/urls";

/** Eski /admin/sources URL'leri → /admin/marketing */
export default async function AdminSourcesRedirect({
  searchParams,
}: {
  searchParams: Promise<{
    platform?: string;
    event?: string;
    q?: string;
    site?: string;
    start?: string;
    end?: string;
  }>;
}) {
  const query = await searchParams;
  redirect(
    buildMarketingHref({
      start: query.start,
      end: query.end,
      site: query.site,
      platform: query.platform,
      event: query.event,
      q: query.q,
    }),
  );
}
