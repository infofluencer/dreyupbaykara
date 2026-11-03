import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith("/admin");
  const isLogin = path === "/admin/login";

  /*
    Proxy her gezinme ve prefetch isteğinin önünde çalışır; yanıtı dönmeden
    loading.tsx de gösterilemez. getClaims JWT'yi yerelde doğrular (JWKS bellekte
    önbelleklenir), Supabase'e gitmez. İptal edilmiş oturumu ise sayfalardaki
    requireAdminSession yakalar ve /admin/login'e yollar. Bu yüzden login'de
    getUser şart: JWT'ye güvenirsek süresi dolana kadar /admin'e geri döner,
    yönlendirme döngüsü oluşur.
  */
  const user = isLogin
    ? (await supabase.auth.getUser()).data.user
    : (await supabase.auth.getClaims()).data?.claims;

  if (isAdmin && !isLogin && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && user) {
    // Profili olmayan kullanıcıyı /admin ↔ /login döngüsüne sokma
    if (request.nextUrl.searchParams.get("error") === "yetkisiz") {
      return supabaseResponse;
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
