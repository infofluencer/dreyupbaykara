"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { marketingSyncDays } from "@/lib/marketing/config";
import { runMarketingSync } from "@/lib/marketing/sync/sync-daily-stats";
import { createClient } from "@/lib/supabase/server";

export async function assignCampaignSite(formData: FormData): Promise<void> {
  await requireAdminSession(["admin", "doctor", "agency"]);

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const site = String(formData.get("site") ?? "").trim();

  if (!campaignId || !site) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_campaigns")
    .update({
      site,
      site_match_source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    console.error("[marketing] assignCampaignSite:", error.message);
    return;
  }

  revalidatePath("/admin/marketing");
}

export async function addSitePrefix(formData: FormData): Promise<void> {
  await requireAdminSession(["admin", "doctor", "agency"]);

  const prefix = String(formData.get("prefix") ?? "")
    .trim()
    .toUpperCase();
  const site = String(formData.get("site") ?? "").trim();

  if (!prefix || !site) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_prefix_map").upsert(
    { prefix, site },
    { onConflict: "prefix" },
  );

  if (error) {
    console.error("[marketing] addSitePrefix:", error.message);
    return;
  }

  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/connect");
}

export async function triggerMarketingSyncNow(): Promise<{
  ok: boolean;
  message: string;
}> {
  await requireAdminSession(["admin"]);

  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, message: "Supabase service role yapılandırılmadı." };
  }

  try {
    const result = await runMarketingSync(supabase, {
      days: marketingSyncDays(),
      mode: "full",
    });
    revalidatePath("/admin/marketing");
    revalidatePath("/admin/marketing/connect");

    const google = result.campaigns.find((c) => c.platform === "google_ads");
    const googleStats = result.stats.find((s) => s.platform === "google_ads");
    const googleErr = google?.error || googleStats?.error;

    if (googleErr) {
      return { ok: false, message: `Google sync hatası: ${googleErr}` };
    }

    const ext = result.googleExtended;
    const extSummary = ext.error
      ? ext.error
      : `cihaz ${ext.deviceRows}, dönüşüm ${ext.conversionRows}, gclid ${ext.gclidRows}, terim ${ext.searchTermRows}, LP ${ext.landingPageRows}`;

    return {
      ok: true,
      message: `Google: ${google?.synced ?? 0} kampanya, ${googleStats?.rows ?? 0} günlük satır (${result.range.days}g). Ek: ${extSummary}.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Sync hatası",
    };
  }
}
