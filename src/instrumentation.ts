export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { startMarketingCronScheduler } = await import(
    "@/lib/marketing/cron-scheduler"
  );
  startMarketingCronScheduler();
}
