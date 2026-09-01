"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
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
