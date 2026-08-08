export type PlanView = "day" | "week" | "month" | "year";

export function planHref(options: {
  view?: PlanView;
  date: string;
  lead?: string;
  stage?: string;
  q?: string;
  slot?: string;
}) {
  const params = new URLSearchParams();
  if (options.view && options.view !== "day") params.set("view", options.view);
  params.set("date", options.date);
  if (options.lead) params.set("lead", options.lead);
  if (options.stage && options.stage !== "active") {
    params.set("stage", options.stage);
  }
  if (options.q) params.set("q", options.q);
  if (options.slot) params.set("slot", options.slot);
  return `/admin/leads?${params.toString()}`;
}
