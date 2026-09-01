export function buildMarketingHref(opts: {
  start?: string;
  end?: string;
  site?: string;
  platform?: string;
  event?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.start) params.set("start", opts.start);
  if (opts.end) params.set("end", opts.end);
  if (opts.site) params.set("site", opts.site);
  if (opts.platform && opts.platform !== "all") {
    params.set("platform", opts.platform);
  }
  if (opts.event && opts.event !== "all") params.set("event", opts.event);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const query = params.toString();
  return query ? `/admin/marketing?${query}` : "/admin/marketing";
}
