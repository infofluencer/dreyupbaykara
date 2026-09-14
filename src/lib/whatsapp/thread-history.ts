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

  const fetched = (data ?? []) as ThreadMessageRow[];
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
    const extra = (fill ?? []) as ThreadMessageRow[];
    rows.push(...extra);
    if (extra.length >= 2_000) hasOlder = true;
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
