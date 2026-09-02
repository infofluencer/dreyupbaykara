import "server-only";

import {
  classifyAdPlatform,
  classifySourceEvent,
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";
import { MARKETING_CLICK_LOGS_SITE } from "@/lib/marketing/constants";
import { createClient } from "@/lib/supabase/server";

export type ClassifiedLeadSource = {
  id: string;
  lead_ref: string;
  site: string | null;
  page_path: string | null;
  channel: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  msclkid: string | null;
  ttclid: string | null;
  matched_lead_id: string | null;
  created_at: string;
  platform: AdPlatform;
  sourceEvent: SourceEvent;
};

export async function loadClassifiedLeadSources(siteFilter?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("lead_source_report")
    .select(
      "id, lead_ref, site, page_path, channel, campaign, utm_source, utm_medium, utm_campaign, gclid, fbclid, gbraid, wbraid, msclkid, ttclid, matched_lead_id, created_at",
    )
    .eq("site", siteFilter ?? MARKETING_CLICK_LOGS_SITE)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: rows, error } = await query;

  const classified: ClassifiedLeadSource[] = (rows ?? []).map((row) => ({
    ...row,
    platform: classifyAdPlatform(row),
    sourceEvent: classifySourceEvent(row.channel),
  }));

  return { classified, error };
}
