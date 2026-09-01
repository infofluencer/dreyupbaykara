import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  metaAdsConfig,
  marketingOAuthBaseUrl,
} from "@/lib/marketing/config";
import {
  defaultMetaAdAccountId,
  exchangeMetaShortLivedToken,
} from "@/lib/marketing/meta/client";
import { upsertAdAccount } from "@/lib/marketing/tokens";

export const runtime = "nodejs";

const STATE_COOKIE = "marketing_oauth_meta_state";

export async function GET(request: NextRequest) {
  const base = marketingOAuthBaseUrl();
  const redirectFail = (code: string) =>
    NextResponse.redirect(new URL(`/admin/marketing/connect?error=${code}`, base));

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  if (error) {
    return redirectFail(`meta_${error}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return redirectFail("meta_state");
  }

  const { appId, appSecret } = metaAdsConfig();
  const adAccountId = defaultMetaAdAccountId();
  if (!appId || !appSecret || !adAccountId) {
    return redirectFail("meta_env");
  }

  const redirectUri = `${base}/api/marketing/oauth/meta/callback`;
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    })}`,
  );

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectFail("meta_token");
  }

  const longLived = await exchangeMetaShortLivedToken(tokenJson.access_token);

  const supabase = createServiceClient();
  if (!supabase) {
    return redirectFail("supabase");
  }

  await upsertAdAccount(supabase, {
    platform: "meta",
    externalAccountId: adAccountId,
    displayName: `Meta act_${adAccountId}`,
    accessToken: longLived.accessToken,
    refreshToken: null,
    tokenExpiresAt: longLived.expiresAt,
  });

  return NextResponse.redirect(
    new URL("/admin/marketing/connect?connected=meta", base),
  );
}
