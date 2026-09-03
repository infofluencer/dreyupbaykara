"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { marketingSyncDays } from "@/lib/marketing/config";
import { runMarketingSync } from "@/lib/marketing/sync/sync-daily-stats";
import { createClient } from "@/lib/supabase/server";
import { upsertAdAccount } from "@/lib/marketing/tokens";
import { META_PENDING_COOKIE } from "@/lib/marketing/meta/pending";

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

/** Meta (veya Google) reklam hesabı → CRM site eşlemesi. */
export async function setAdAccountSite(formData: FormData): Promise<void> {
  await requireAdminSession(["admin", "doctor", "agency"]);

  const platform = String(formData.get("platform") ?? "").trim();
  const externalId = String(formData.get("external_account_id") ?? "")
    .trim()
    .replace(/^act_/, "")
    .replace(/\D/g, "");
  const site = String(formData.get("site") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const accountId = String(formData.get("account_id") ?? "").trim();

  if (!externalId || (platform !== "meta" && platform !== "google_ads")) {
    return;
  }

  const supabase = await createClient();

  if (!site) {
    await supabase
      .from("ad_customer_site_map")
      .delete()
      .eq("platform", platform)
      .eq("external_customer_id", externalId);
  } else {
    const { error } = await supabase.from("ad_customer_site_map").upsert(
      {
        platform,
        external_customer_id: externalId,
        site,
        label,
      },
      { onConflict: "platform,external_customer_id" },
    );
    if (error) {
      console.error("[marketing] setAdAccountSite:", error.message);
      return;
    }
  }

  // Hesaba bağlı, manuel olmayan kampanyaları hemen güncelle (sync beklemeden).
  if (accountId) {
    if (site) {
      await supabase
        .from("ad_campaigns")
        .update({
          site,
          site_match_source: "auto",
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", accountId)
        .neq("site_match_source", "manual");
    } else {
      await supabase
        .from("ad_campaigns")
        .update({
          site: null,
          site_match_source: "unmatched",
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", accountId)
        .neq("site_match_source", "manual");
    }
  }

  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/connect");
}

/** OAuth sonrası seçilen Meta reklam hesabını/hesaplarını kaydeder. */
export async function selectMetaAdAccount(formData: FormData): Promise<void> {
  await requireAdminSession(["admin", "doctor", "agency"]);

  const selected = formData
    .getAll("ad_account_id")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const manualRaw = String(formData.get("manual_ad_account_ids") ?? "").trim();
  const manualIds = manualRaw
    ? manualRaw
        .split(/[,;\s]+/)
        .map((id) => id.replace(/^act_/, "").replace(/\D/g, ""))
        .filter(Boolean)
    : [];

  const parsed = selected.map((raw) => {
    const [idPart, ...nameParts] = raw.split("|||");
    return {
      id: (idPart ?? "").replace(/^act_/, "").replace(/\D/g, ""),
      name: nameParts.join("|||").trim(),
    };
  });

  for (const id of manualIds) {
    if (!parsed.some((row) => row.id === id)) {
      parsed.push({ id, name: `Meta act_${id}` });
    }
  }

  const accounts = parsed.filter((row) => row.id);
  if (!accounts.length) {
    redirect("/admin/marketing/connect/meta-select?error=meta_pick");
  }

  const defaultSite = String(formData.get("site") ?? "").trim();

  const cookieStore = await cookies();
  const raw = cookieStore.get(META_PENDING_COOKIE)?.value;
  if (!raw) {
    redirect("/admin/marketing/connect?error=meta_state");
  }

  let pending: { accessToken?: string; expiresAt?: string | null };
  try {
    pending = JSON.parse(raw) as {
      accessToken?: string;
      expiresAt?: string | null;
    };
  } catch {
    redirect("/admin/marketing/connect?error=meta_state");
  }

  if (!pending.accessToken) {
    redirect("/admin/marketing/connect?error=meta_token");
  }

  const supabase = createServiceClient();
  if (!supabase) {
    redirect("/admin/marketing/connect?error=supabase");
  }

  for (const account of accounts) {
    const displayName = account.name || `Meta act_${account.id}`;
    const site =
      String(formData.get(`site_${account.id}`) ?? "").trim() || defaultSite;

    await upsertAdAccount(supabase, {
      platform: "meta",
      externalAccountId: account.id,
      displayName,
      accessToken: pending.accessToken,
      refreshToken: null,
      tokenExpiresAt: pending.expiresAt ?? null,
    });

    if (site) {
      await supabase.from("ad_customer_site_map").upsert(
        {
          platform: "meta",
          external_customer_id: account.id,
          site,
          label: displayName,
        },
        { onConflict: "platform,external_customer_id" },
      );
    }
  }

  cookieStore.delete(META_PENDING_COOKIE);
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/connect");
  redirect(
    `/admin/marketing/connect?connected=meta&meta_count=${accounts.length}`,
  );
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
    const meta = result.campaigns.find((c) => c.platform === "meta");
    const metaStats = result.stats.find((s) => s.platform === "meta");

    const googleErr = google?.error || googleStats?.error;
    const metaErr = meta?.error || metaStats?.error;

    const ext = result.googleExtended;
    const extSummary = ext.error
      ? `Google ek: ${ext.error}`
      : `Google ek: cihaz ${ext.deviceRows}, gclid ${ext.gclidRows}, terim ${ext.searchTermRows}, LP ${ext.landingPageRows}`;

    const parts = [
      `Google: ${google?.synced ?? 0} kampanya, ${googleStats?.rows ?? 0} gün`,
      `Meta: ${meta?.synced ?? 0} kampanya, ${metaStats?.rows ?? 0} gün`,
      `(${result.range.days}g)`,
      extSummary,
    ];

    if (metaErr) {
      parts.push(`Meta uyarı: ${metaErr}`);
    }
    if (googleErr) {
      return {
        ok: false,
        message: `Google sync hatası: ${googleErr}. ${parts.join(" · ")}`,
      };
    }

    return {
      ok: !metaErr,
      message: parts.join(" · "),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Sync hatası",
    };
  }
}
