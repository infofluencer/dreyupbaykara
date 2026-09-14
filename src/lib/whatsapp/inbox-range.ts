import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysYmd, istanbulYmd } from "@/lib/date/tr";

export type InboxTimeRange = "5d" | "10d" | "all";

export const INBOX_TIME_RANGES: Array<{
  id: InboxTimeRange;
  label: string;
  days: number | null;
}> = [
  { id: "5d", label: "Son 5 gün", days: 5 },
  { id: "10d", label: "Son 10 gün", days: 10 },
  { id: "all", label: "Tüm sohbetler", days: null },
];

export const DEFAULT_INBOX_TIME_RANGE: InboxTimeRange = "5d";

/** Güvenlik tavanı — PostgREST tek yanıtta bunları aşmasın. */
export const INBOX_RANGE_LIMIT: Record<InboxTimeRange, number> = {
  "5d": 800,
  "10d": 1500,
  all: 2500,
};

export type InboxContactLead = {
  id: string;
  contact_id: string;
  status: string | null;
  stage: string;
  created_at: string;
  lost_reason: string | null;
  needs_followup: boolean | null;
};

const CONTACT_CHUNK = 100;

/**
 * İstanbul takvim günü: bugün dahil son N günün 00:00'ı.
 * `all` için null — tarih filtresi yok.
 */
export function inboxRangeCutoffIso(range: InboxTimeRange): string | null {
  const spec = INBOX_TIME_RANGES.find((item) => item.id === range);
  if (!spec?.days) return null;
  const startYmd = addDaysYmd(istanbulYmd(), -(spec.days - 1));
  return new Date(`${startYmd}T00:00:00+03:00`).toISOString();
}

export function inboxRangeExpanded(
  from: InboxTimeRange,
  to: InboxTimeRange,
): boolean {
  const fromDays = INBOX_TIME_RANGES.find((item) => item.id === from)?.days;
  const toDays = INBOX_TIME_RANGES.find((item) => item.id === to)?.days;
  if (toDays == null) return fromDays != null;
  if (fromDays == null) return false;
  return toDays > fromDays;
}

export async function fetchInboxContactFlags(
  supabase: SupabaseClient,
  contactIds: string[],
): Promise<Array<{ id: string; is_patient: boolean | null }>> {
  const unique = [...new Set(contactIds.filter(Boolean))];
  if (!unique.length) return [];

  const rows: Array<{ id: string; is_patient: boolean | null }> = [];
  for (let index = 0; index < unique.length; index += CONTACT_CHUNK) {
    const chunk = unique.slice(index, index + CONTACT_CHUNK);
    const { data, error } = await supabase
      .from("contacts")
      .select("id, is_patient")
      .in("id", chunk);
    if (error) throw error;
    rows.push(
      ...((data ?? []) as Array<{ id: string; is_patient: boolean | null }>),
    );
  }
  return rows;
}

export async function fetchInboxContactLeads(
  supabase: SupabaseClient,
  contactIds: string[],
): Promise<InboxContactLead[]> {
  const unique = [...new Set(contactIds.filter(Boolean))];
  if (!unique.length) return [];

  const rows: InboxContactLead[] = [];
  for (let index = 0; index < unique.length; index += CONTACT_CHUNK) {
    const chunk = unique.slice(index, index + CONTACT_CHUNK);
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, contact_id, status, stage, created_at, lost_reason, needs_followup",
      )
      .in("contact_id", chunk)
      .order("created_at", { ascending: false })
      .limit(chunk.length * 5);
    if (error) throw error;
    rows.push(...((data ?? []) as InboxContactLead[]));
  }
  return rows;
}
