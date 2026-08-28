import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_SITE,
  generateLeadRef,
  hasPaidTrackingParams,
  type TrackingParams,
} from "@/lib/crm/tracking";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_LEN = 500;

function clip(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LEN);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const tracking: TrackingParams & { landing_url: string | null } = {
    site: clip(body.site) ?? DEFAULT_SITE,
    page: clip(body.page),
    campaign: clip(body.campaign),
    utm_source: clip(body.utm_source),
    utm_medium: clip(body.utm_medium),
    utm_campaign: clip(body.utm_campaign),
    utm_content: clip(body.utm_content),
    utm_term: clip(body.utm_term),
    gclid: clip(body.gclid),
    fbclid: clip(body.fbclid),
    gbraid: clip(body.gbraid),
    wbraid: clip(body.wbraid),
    msclkid: clip(body.msclkid),
    ttclid: clip(body.ttclid),
    landing_url: clip(body.landing_url),
  };

  if (!hasPaidTrackingParams(tracking)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { error } = await supabase.from("lead_sources").insert({
    lead_ref: generateLeadRef(),
    site: tracking.site,
    page_path: tracking.page,
    channel: "landing",
    campaign: tracking.campaign,
    utm_source: tracking.utm_source,
    utm_medium: tracking.utm_medium,
    utm_campaign: tracking.utm_campaign,
    utm_content: tracking.utm_content,
    utm_term: tracking.utm_term,
    gclid: tracking.gclid,
    fbclid: tracking.fbclid,
    gbraid: tracking.gbraid,
    wbraid: tracking.wbraid,
    msclkid: tracking.msclkid,
    ttclid: tracking.ttclid,
    landing_url: tracking.landing_url ?? request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  });

  if (error) {
    console.error("[landing] insert failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
