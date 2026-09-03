import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  metaAdsConfig,
  marketingOAuthBaseUrl,
} from "@/lib/marketing/config";
import { exchangeMetaShortLivedToken } from "@/lib/marketing/meta/client";
import { META_PENDING_COOKIE } from "@/lib/marketing/meta/pending";

export const runtime = "nodejs";

const STATE_COOKIE = "marketing_oauth_meta_state";

export async function GET(request: NextRequest) {
  const base = marketingOAuthBaseUrl();
  const redirectFail = (code: string) =>
    NextResponse.redirect(
      new URL(`/admin/marketing/connect?error=${code}`, base),
    );

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
  if (!appId || !appSecret) {
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

  cookieStore.set(
    META_PENDING_COOKIE,
    JSON.stringify({
      accessToken: longLived.accessToken,
      expiresAt: longLived.expiresAt,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    },
  );

  return NextResponse.redirect(
    new URL("/admin/marketing/connect/meta-select", base),
  );
}
