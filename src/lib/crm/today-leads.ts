import "server-only";

import type { TodayLeadRow } from "@/components/admin/TodayLeadWorklist";
import { CLOSED_LEAD_STATUSES } from "@/lib/crm/lead-status";
import { createClient } from "@/lib/supabase/server";

function mapRow(row: {
  id: string;
  status: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  contacts?:
    | { name?: string | null; phone?: string | null }
    | Array<{ name?: string | null; phone?: string | null }>
    | null;
}): TodayLeadRow {
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  return {
    id: row.id,
    status: row.status,
    next_action_at: row.next_action_at,
    next_action_note: row.next_action_note,
    contact_name: contact?.name ?? null,
    phone: contact?.phone ?? null,
  };
}

export async function loadTodayLeadWorklist(todayYmd: string) {
  const supabase = await createClient();
  const closed = CLOSED_LEAD_STATUSES.join(",");

  const [{ data: yeniRows }, { data: dueRows }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, status, next_action_at, next_action_note, contacts!inner(name, phone, is_patient)",
      )
      .eq("contacts.is_patient", true)
      .eq("status", "yeni")
      .is("last_contacted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("leads")
      .select(
        "id, status, next_action_at, next_action_note, contacts!inner(name, phone, is_patient)",
      )
      .eq("contacts.is_patient", true)
      .lte("next_action_at", todayYmd)
      .not("status", "in", `(${closed})`)
      .order("next_action_at")
      .limit(50),
  ]);

  const bugun = (dueRows ?? []).map(mapRow);
  const geciken = bugun.filter(
    (row) => row.next_action_at && row.next_action_at < todayYmd,
  );

  return {
    yeni: (yeniRows ?? []).map(mapRow),
    bugun,
    geciken,
  };
}
