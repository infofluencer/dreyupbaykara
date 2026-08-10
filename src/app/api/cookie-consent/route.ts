import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_CONSENT_MAX_AGE,
  COOKIE_CONSENT_NAME,
  isCookieConsentPreferences,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

export const runtime = "nodejs";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isCookieConsentPreferences(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const consent: CookieConsentPreferences = {
    necessary: true,
    functional: body.functional,
    analytics: body.analytics,
    marketing: body.marketing,
    updatedAt: body.updatedAt,
  };

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_CONSENT_NAME, JSON.stringify(consent), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_CONSENT_MAX_AGE,
  });

  return response;
}
