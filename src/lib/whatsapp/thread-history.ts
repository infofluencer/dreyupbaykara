import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sohbet geçmişi veritabanında süresiz durur; silen bir iş yok. Buradaki
 * sınırlar yalnızca "tek seferde ne kadarını çekelim" sorusunu yanıtlar.
 *
 * Kural: açılan sohbette verilen pencerenin (`windowCutoffIso`) tamamı
 * garanti yüklenir. Pencere yoksa (tüm sohbetler) ilk sayfa gelir; daha
 * eskisi "Daha eski mesajlar" ile sayfa sayfa gelir.
 */
export const WA_THREAD_WINDOW_DAYS = 5;

/** İlk yüklemede çekilen mesaj sayısı. Tek indeks taramasıyla karşılanır. */
export const WA_THREAD_PAGE_SIZE = 400;

/** "Daha eski mesajlar" her basışta bu kadar geriye gider. */
export const WA_THREAD_OLDER_PAGE_SIZE = 200;

/** Artımlı yoklamada tek seferde alınacak yeni mesaj tavanı. */
const WA_THREAD_NEWER_PAGE_SIZE = 200;

/**
 * Liste sorgusu raw_payload'a hiç dokunmaz: o kolon büyük webhook JSON'u
 * (TOAST) taşıyor ve her satırda açmak sorguyu belirgin yavaşlatıyordu.
 * Teslim hatası yalnızca `failed` giden mesajda gösterildiği için alanları
 * ayrı ve küçük bir sorguyla sadece o satırlara ekleriz (attachDeliveryErrors).
 */
export const WA_MESSAGE_SELECT =
  "id, direction, body, status, automated, created_at, media_type, media_url, source";

/**
 * Meta status webhook'u delivery_error / delivery_code yazar, gönderim anında
 * reddedilen mesajda ise error.message bulunur.
 */
const WA_MESSAGE_ERROR_SELECT =
  "id, delivery_error:raw_payload->>delivery_error, delivery_code:raw_payload->>delivery_code, " +
  "error_message:raw_payload->error->>message";

export type ThreadMessageRow = {
  id: string;
  direction: string;
  body: string | null;
  status: string;
  automated: boolean | null;
  created_at: string;
  media_type: string | null;
  media_url: string | null;
  source: string | null;
  delivery_error?: string | null;
  delivery_code?: string | null;
  error_message?: string | null;
};

export type ThreadPage = {
  /** Eskiden yeniye sıralı. */
  rows: ThreadMessageRow[];
  /** Daha geride yüklenmemiş mesaj var mı? */
  hasOlder: boolean;
};

/** 5 günlük pencerenin başlangıcı (ISO). */
export function threadWindowStartIso(now: number = Date.now()): string {
  return new Date(now - WA_THREAD_WINDOW_DAYS * 86_400_000).toISOString();
}

/** Başarısız mesajlara hata alanlarını ekler (yerinde). Genelde 0–birkaç satır. */
async function attachDeliveryErrors(
  supabase: SupabaseClient,
  rows: ThreadMessageRow[],
): Promise<ThreadMessageRow[]> {
  const failedIds = rows
    .filter((row) => row.status === "failed")
    .map((row) => row.id);
  if (!failedIds.length) return rows;

  const { data, error } = await supabase
    .from("messages")
    .select(WA_MESSAGE_ERROR_SELECT)
    .in("id", failedIds);
  if (error) {
    // Hata metni olmadan da mesaj "İletilemedi" görünür; listeyi düşürme.
    console.error("[whatsapp] delivery errors:", error.message);
    return rows;
  }

  const byId = new Map(
    ((data ?? []) as unknown as Array<{
      id: string;
      delivery_error: string | null;
      delivery_code: string | null;
      error_message: string | null;
    }>).map((row) => [row.id, row]),
  );
  for (const row of rows) {
    const extra = byId.get(row.id);
    if (!extra) continue;
    row.delivery_error = extra.delivery_error;
    row.delivery_code = extra.delivery_code;
    row.error_message = extra.error_message;
  }
  return rows;
}

function select(supabase: SupabaseClient, conversationId: string) {
  return supabase
    .from("messages")
    .select(WA_MESSAGE_SELECT)
    .eq("conversation_id", conversationId);
}

/**
 * Sohbetin en yeni mesajları. `messages (conversation_id, created_at)`
 * indeksini tersten tarar: tablo ne kadar büyürse büyüsün sabit maliyet.
 *
 * `windowCutoffIso` doluysa o tarihe kadar olan mesajlar da tamamlanır
 * (gelen kutusu dönem filtresiyle aynı kesit). `null` = yalnızca ilk sayfa.
 */
export async function fetchThreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
  windowCutoffIso: string | null = threadWindowStartIso(),
): Promise<ThreadPage> {
  const { data, error } = await select(supabase, conversationId)
    .order("created_at", { ascending: false })
    .limit(WA_THREAD_PAGE_SIZE + 1);
  if (error) throw error;

  const fetched = (data ?? []) as unknown as ThreadMessageRow[];
  let hasOlder = fetched.length > WA_THREAD_PAGE_SIZE;
  const rows = hasOlder ? fetched.slice(0, WA_THREAD_PAGE_SIZE) : fetched;

  const cutoff = windowCutoffIso;
  const oldest = rows[rows.length - 1];
  const oldestMs = oldest ? Date.parse(oldest.created_at) : NaN;
  if (
    cutoff &&
    hasOlder &&
    oldest &&
    Number.isFinite(oldestMs) &&
    oldestMs > Date.parse(cutoff)
  ) {
    const { data: fill, error: fillError } = await select(
      supabase,
      conversationId,
    )
      .gte("created_at", cutoff)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(2_000);
    if (fillError) throw fillError;
    const extra = (fill ?? []) as unknown as ThreadMessageRow[];
    rows.push(...extra);
    if (extra.length >= 2_000) hasOlder = true;
  }

  await attachDeliveryErrors(supabase, rows);
  return { rows: rows.reverse(), hasOlder };
}

/** "Daha eski mesajlar": verilen tarihten önceki bir sayfa. */
export async function fetchOlderThreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
  beforeIso: string,
): Promise<ThreadPage> {
  const { data, error } = await select(supabase, conversationId)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(WA_THREAD_OLDER_PAGE_SIZE + 1);
  if (error) throw error;

  const fetched = (data ?? []) as unknown as ThreadMessageRow[];
  const hasOlder = fetched.length > WA_THREAD_OLDER_PAGE_SIZE;
  const rows = hasOlder ? fetched.slice(0, WA_THREAD_OLDER_PAGE_SIZE) : fetched;
  await attachDeliveryErrors(supabase, rows);
  return { rows: rows.reverse(), hasOlder };
}

/**
 * Açık sohbetin yoklaması: tüm geçmişi yeniden indirmek yerine yalnızca
 * bilinen son mesajdan sonrasını getirir.
 */
export async function fetchNewerThreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
  afterIso: string,
): Promise<ThreadMessageRow[]> {
  const { data, error } = await select(supabase, conversationId)
    .gt("created_at", afterIso)
    .order("created_at", { ascending: true })
    .limit(WA_THREAD_NEWER_PAGE_SIZE);
  if (error) throw error;
  return attachDeliveryErrors(
    supabase,
    (data ?? []) as unknown as ThreadMessageRow[],
  );
}
