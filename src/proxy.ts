import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const WEBHOOK_PREFIX = "/api/whatsapp/webhook/";

/** Uzunluk ve içerik farkını aynı sürede kapatır — sızdırma olmasın. */
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Gizli adres parçalı webhook: /api/whatsapp/webhook/<WHATSAPP_WEBHOOK_KEY>
 *
 * Dualhook kendi Meta uygulamasıyla imzaladığı için `WHATSAPP_APP_SECRET`
 * elimizde yok ve imza doğrulanamıyor. Anahtar bu boşluğu kapatan tek kimlik
 * doğrulaması; eşleşmeyen istek uygulama koduna hiç ulaşmaz.
 *
 * Anahtar tanımlı değilse de 404 döner — yarım yapılandırmayla açık kapı
 * bırakmaktansa yeni adres hiç çalışmasın.
 */
function guardWebhookKey(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(WEBHOOK_PREFIX)) return null;

  const expected = process.env.WHATSAPP_WEBHOOK_KEY?.trim() ?? "";
  const provided = pathname.slice(WEBHOOK_PREFIX.length);

  if (!expected || !secretsMatch(provided, expected)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Gövde, metot ve sorgu dizesi korunur — GET handshake de buradan geçer.
  const url = request.nextUrl.clone();
  url.pathname = "/api/whatsapp/webhook";
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const webhookResponse = guardWebhookKey(request);
  if (webhookResponse) return webhookResponse;

  return updateSession(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/whatsapp/webhook/:key+"],
};
