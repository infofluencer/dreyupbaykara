import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { metaAdsConfig, marketingOAuthBaseUrl } from "@/lib/marketing/config";

export const runtime = "nodejs";

const STATE_COOKIE = "marketing_oauth_meta_state";
const SCOPES = ["ads_read"].join(",");

export async function GET() {
  const { appId } = metaAdsConfig();
  if (!appId) {
    return NextResponse.redirect(
      new URL("/admin/marketing/connect?error=meta_env", marketingOAuthBaseUrl()),
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

  const redirectUri = `${marketingOAuthBaseUrl()}/api/marketing/oauth/meta/callback`;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params}`,
  );
}
