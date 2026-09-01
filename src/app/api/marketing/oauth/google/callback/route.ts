import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  googleAdsConfig,
  marketingOAuthBaseUrl,
} from "@/lib/marketing/config";
import { fetchGoogleAccountDisplayName } from "@/lib/marketing/google-ads/client";
import { upsertAdAccount } from "@/lib/marketing/tokens";

export const runtime = "nodejs";

const STATE_COOKIE = "marketing_oauth_google_state";

export async function GET(request: NextRequest) {
  const base = marketingOAuthBaseUrl();
  const redirectFail = (code: string) =>
    NextResponse.redirect(new URL(`/admin/marketing/connect?error=${code}`, base));

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  if (error) {
    return redirectFail(`google_${error}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return redirectFail("google_state");
  }

  const { clientId, clientSecret, loginCustomerId } = googleAdsConfig();
  if (!clientId || !clientSecret || !loginCustomerId) {
    return redirectFail("google_env");
  }

  const redirectUri = `${base}/api/marketing/oauth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectFail("google_token");
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return redirectFail("supabase");
  }

  let displayName: string | null = null;
  try {
    displayName = await fetchGoogleAccountDisplayName(
      tokenJson.access_token,
      loginCustomerId,
    );
  } catch {
    /* optional */
  }

  await upsertAdAccount(supabase, {
    platform: "google_ads",
    externalAccountId: loginCustomerId,
    displayName,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    tokenExpiresAt: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null,
  });

  return NextResponse.redirect(
    new URL("/admin/marketing/connect?connected=google", base),
  );
}
