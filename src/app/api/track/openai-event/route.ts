import { NextResponse, type NextRequest } from "next/server";
import { scheduleOpenAiConversion } from "@/lib/marketing/openai-ads/conversions";

export const runtime = "nodejs";

const MAX_LEN = 2048;
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

function clip(value: unknown, max = MAX_LEN): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      if (parsed.origin === new URL(site).origin) return true;
    } catch {
      /* ignore invalid SITE_URL */
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (body.type !== "page_viewed") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventId = clip(body.event_id, 128);
  if (!eventId || !EVENT_ID_RE.test(eventId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sourceUrl = clip(body.source_url);
  const oppref = clip(body.oppref, 256);

  scheduleOpenAiConversion({
    request,
    eventId,
    type: "page_viewed",
    sourceUrl,
    oppref,
  });

  return NextResponse.json({ ok: true });
}
