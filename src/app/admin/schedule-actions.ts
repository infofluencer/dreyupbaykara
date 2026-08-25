"use server";

import { requireAdminSession } from "@/lib/admin/auth";
import { firstRelation } from "@/lib/crm/labels";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleLead } from "@/components/admin/schedule/types";

/**
 * Takvim “kayıtlı hasta” listesi — yalnızca is_patient=true.
 * Durum Panosu ile aynı kural; silinen hastalar burada görünmez.
 */
export async function loadScheduleLeads(options?: {
  stage?: string;
  q?: string;
}): Promise<{ ok: true; leads: ScheduleLead[] } | { ok: false; error: string }> {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const stage = options?.stage || "active";
  const search = options?.q?.trim() || "";
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, stage, status, site, channel, utm_source, created_at, contacts!inner(id, name, phone, is_patient)",
    )
    .eq("contacts.is_patient", true)
    .order("created_at", { ascending: false })
    .limit(120);

  // Kapalı aşamalar (eski stage) + bitti durumu gizle
  if (stage === "active") {
    query = query
      .not("stage", "in", "(won,lost,spam)")
      .neq("status", "bitti");
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  const leads = ((data ?? []) as ScheduleLead[]).filter((lead) => {
    if (!search) return true;
    const contact = firstRelation(lead.contacts);
    return `${contact?.name ?? ""} ${contact?.phone ?? ""}`
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR"));
  });

  return { ok: true, leads };
}
