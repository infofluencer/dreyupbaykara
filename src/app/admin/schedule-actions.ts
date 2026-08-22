"use server";

import { requireAdminSession } from "@/lib/admin/auth";
import { firstRelation } from "@/lib/crm/labels";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleLead } from "@/components/admin/schedule/types";

export async function loadScheduleLeads(options?: {
  stage?: string;
  q?: string;
}): Promise<{ ok: true; leads: ScheduleLead[] } | { ok: false; error: string }> {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const stage = options?.stage || "active";
  const search = options?.q?.trim() || "";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, stage, site, channel, utm_source, created_at, contacts(id, name, phone)",
    )
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return { ok: false, error: error.message };
  }

  const leads = ((data ?? []) as ScheduleLead[]).filter((lead) => {
    if (stage === "active" && ["won", "lost", "spam"].includes(lead.stage)) {
      return false;
    }
    if (!search) return true;
    const contact = firstRelation(lead.contacts);
    return `${contact?.name ?? ""} ${contact?.phone ?? ""}`
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR"));
  });

  return { ok: true, leads };
}
