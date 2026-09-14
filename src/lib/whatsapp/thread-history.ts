import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sohbet geçmişi veritabanında süresiz durur; silen bir iş yok. Buradaki
 * sınırlar yalnızca "tek seferde ne kadarını çekelim" sorusunu yanıtlar.
 *
 * Kural: açılan her sohbette son {@link WA_THREAD_WINDOW_DAYS} günün tamamı
 * garanti yüklenir. Sohbet bu pencerede sayfa boyutundan fazla mesaj
 * içeriyorsa pencerenin başına kadar tamamlanır; daha eskisi "Daha eski
 * mesajlar" ile sayfa sayfa gelir.
 */
export const WA_THREAD_WINDOW_DAYS = 5;

/** İlk yüklemede çekilen mesaj sayısı. Tek indeks taramasıyla karşılanır. */
export const WA_THREAD_PAGE_SIZE = 400;

/** "Daha eski mesajlar" her basışta bu kadar geriye gider. */
export const WA_THREAD_OLDER_PAGE_SIZE = 200;

/** Artımlı yoklamada tek seferde alınacak yeni mesaj tavanı. */
const WA_THREAD_NEWER_PAGE_SIZE = 200;

export const WA_MESSAGE_SELECT =
  "id, direction, body, status, automated, created_at, media_type, media_url, source";

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

function select(supabase: SupabaseClient, conversationId: string) {
  return supabase
    .from("messages")
    .select(WA_MESSAGE_SELECT)
    .eq("conversation_id", conversationId);
}

/**
 * Sohbetin en yeni mesajları. `messages (conversation_id, created_at)`
 * indeksini tersten tarar: tablo ne kadar büyürse büyüsün sabit maliyet.
 */
export async function fetchThreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ThreadPage> {
  const { data, error } = await select(supabase, conversationId)
    .order("created_at", { ascending: false })
    .limit(WA_THREAD_PAGE_SIZE + 1);
  if (error) throw error;

  const fetched = (data ?? []) as ThreadMessageRow[];
  const hasOlder = fetched.length > WA_THREAD_PAGE_SIZE;
  const rows = hasOlder ? fetched.slice(0, WA_THREAD_PAGE_SIZE) : fetched;

  // Sayfa dolduysa ve en eski satır hâlâ pencerenin içindeyse, 5 günün
  // tamamı görünsün diye pencerenin başına kadar tamamla. Günde 400'den fazla
  // mesajlaşılan sohbetlerde devreye girer; normalde bu sorgu hiç çalışmaz.
  const cutoff = threadWindowStartIso();
  const oldest = rows[rows.length - 1];
  const oldestMs = oldest ? Date.parse(oldest.created_at) : NaN;
  if (hasOlder && oldest && oldestMs > Date.parse(cutoff)) {
    const { data: fill, error: fillError } = await select(
      supabase,
      conversationId,
    )
      .gte("created_at", cutoff)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false });
    if (fillError) throw fillError;
    rows.push(...((fill ?? []) as ThreadMessageRow[]));
  }

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

  const fetched = (data ?? []) as ThreadMessageRow[];
  const hasOlder = fetched.length > WA_THREAD_OLDER_PAGE_SIZE;
  const rows = hasOlder ? fetched.slice(0, WA_THREAD_OLDER_PAGE_SIZE) : fetched;
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
  return (data ?? []) as ThreadMessageRow[];
}
