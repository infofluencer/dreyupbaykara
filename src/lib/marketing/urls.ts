export function buildMarketingHref(opts: {
  period?: string;
  start?: string;
  end?: string;
  site?: string;
  channel?: string;
  platform?: string;
  event?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.period && opts.period !== "custom") {
    params.set("period", opts.period);
  } else if (opts.start && opts.end) {
    params.set("period", "custom");
    params.set("start", opts.start);
    params.set("end", opts.end);
  }
  if (opts.site) params.set("site", opts.site);
  if (opts.channel && opts.channel !== "google") {
    params.set("channel", opts.channel);
  }
  if (opts.platform && opts.platform !== "all") {
    params.set("platform", opts.platform);
  }
  if (opts.event && opts.event !== "all") params.set("event", opts.event);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const query = params.toString();
  return query ? `/admin/marketing?${query}` : "/admin/marketing";
}
