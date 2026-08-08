import { NextResponse, type NextRequest } from "next/server";
import {
  buildDefaultWhatsAppMessage,
  buildFormWhatsAppMessage,
  buildWhatsAppUrl,
  generateLeadRef,
  pickTrackingParams,
} from "@/lib/crm/tracking";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function first(value: string | null): string | null {
  if (!value) return null;
  const t = value.trim();
  return t || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tracking = pickTrackingParams(searchParams);

  const form = {
    name: first(searchParams.get("name")),
    surgeryRecommended: first(searchParams.get("surgeryRecommended")),
    lastMri: first(searchParams.get("lastMri")),
    seenSpecialist: first(searchParams.get("seenSpecialist")),
    age: first(searchParams.get("age")),
  };

  const hasForm = Boolean(form.name);
  const leadRef = generateLeadRef();

  const message = hasForm
    ? buildFormWhatsAppMessage(leadRef, form)
    : buildDefaultWhatsAppMessage(leadRef);

  const supabase = createServiceClient();
  if (supabase) {
    const { error } = await supabase.from("lead_sources").insert({
      lead_ref: leadRef,
      site: tracking.site ?? "endoskopikbelameliyati",
      page_path: tracking.page,
      channel: tracking.channel ?? (hasForm ? "lead_form" : "website"),
      campaign: tracking.campaign,
      utm_source: tracking.utm_source,
      utm_medium: tracking.utm_medium,
      utm_campaign: tracking.utm_campaign,
      utm_content: tracking.utm_content,
      utm_term: tracking.utm_term,
      gclid: tracking.gclid,
      fbclid: tracking.fbclid,
      landing_url: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
      form_payload: hasForm ? form : null,
    });

    if (error) {
      console.error("[/r] lead_sources insert failed:", error.message);
    }
  } else {
    console.warn(
      "[/r] Supabase service role missing — redirecting without DB save",
    );
  }

  return NextResponse.redirect(buildWhatsAppUrl(message), 302);
}
