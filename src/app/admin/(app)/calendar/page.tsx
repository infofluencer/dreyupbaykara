import { redirect } from "next/navigation";

export default async function CalendarRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; view?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (
    query.view === "week" ||
    query.view === "month" ||
    query.view === "year"
  ) {
    params.set("view", query.view);
  }
  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    params.set("date", query.date);
  } else if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    params.set("date", `${query.month}-01`);
    if (!params.has("view")) params.set("view", "month");
  }
  const qs = params.toString();
  redirect(qs ? `/admin/leads?${qs}` : "/admin/leads");
}
