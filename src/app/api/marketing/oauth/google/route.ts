import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAdsConfig, marketingOAuthBaseUrl } from "@/lib/marketing/config";

export const runtime = "nodejs";

const STATE_COOKIE = "marketing_oauth_google_state";
const SCOPES = ["https://www.googleapis.com/auth/adwords"].join(" ");

export async function GET() {
  const { clientId } = googleAdsConfig();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/admin/marketing/connect?error=google_env", marketingOAuthBaseUrl()),
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${marketingOAuthBaseUrl()}/api/marketing/oauth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
