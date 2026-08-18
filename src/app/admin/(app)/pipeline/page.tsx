import { LeadPipelineBoard } from "@/components/admin/LeadPipelineBoard";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  LEAD_STATUS_FILTERS,
  type LeadStatusFilter,
} from "@/lib/crm/lead-status";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    sort?: string;
    lead?: string;
  }>;
}) {
  const session = await requireAdminSession([
    "admin",
    "doctor",
    "assistant",
  ]);
  const query = await searchParams;
  const filter: LeadStatusFilter = LEAD_STATUS_FILTERS.some(
    (item) => item.id === query.status,
  )
    ? (query.status as LeadStatusFilter)
    : "all";
  const sort = query.sort === "action" ? "action" : "newest";
  const search = query.q?.trim() ?? "";
  const selectedId = query.lead ?? null;
  const supabase = await createClient();

  const [{ data: leadRows, error }, { data: staff }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        `
        id, status, last_contacted_at, next_action_at, next_action_note,
        assigned_to, lost_reason, site, channel, campaign,
        utm_source, utm_medium, utm_campaign, gclid, fbclid, created_at,
        contacts(name, phone),
        assignee:assigned_to(full_name)
      `,
      )
      .order(sort === "action" ? "next_action_at" : "created_at", {
        ascending: sort === "action",
        nullsFirst: false,
      })
      .limit(250),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["admin", "doctor", "assistant"])
      .order("full_name"),
  ]);

  if (error) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Talepler yüklenemedi. Migration{" "}
        <code>20260818120000_lead_status_machine.sql</code> uygulandı mı?
        <br />
        <span className="mt-1 block text-xs opacity-80">{error.message}</span>
      </p>
    );
  }

  const leads = (leadRows ?? []).map((row) => {
    const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
    const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
    return {
      id: row.id,
      status: row.status,
      last_contacted_at: row.last_contacted_at,
      next_action_at: row.next_action_at,
      next_action_note: row.next_action_note,
      assigned_to: row.assigned_to,
      lost_reason: row.lost_reason,
      site: row.site,
      channel: row.channel,
      campaign: row.campaign,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      gclid: row.gclid,
      fbclid: row.fbclid,
      created_at: row.created_at,
      contact_name: contact?.name ?? null,
      phone: contact?.phone ?? null,
      assignee_name: assignee?.full_name ?? null,
    };
  });

  let history: Array<{
    id: string;
    from_status: string | null;
    to_status: string | null;
    from_stage: string | null;
    to_stage: string | null;
    note: string | null;
    created_at: string;
    changer_name: string | null;
  }> = [];

  if (selectedId) {
    const { data } = await supabase
      .from("lead_status_history")
      .select("id, from_status, to_status, from_stage, to_stage, note, created_at, profiles:changed_by(full_name)")
      .eq("lead_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(50);
    history = (data ?? []).map((item) => {
      const profile = Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles;
      return {
        id: item.id,
        from_status: item.from_status,
        to_status: item.to_status,
        from_stage: item.from_stage,
        to_stage: item.to_stage,
        note: item.note,
        created_at: item.created_at,
        changer_name: profile?.full_name ?? null,
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-2xl">
          Talepler
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#466254]">
          Tüm taleplerin listesi. Ara, durum güncelle veya randevu verin.
        </p>
      </div>
      <LeadPipelineBoard
        leads={leads}
        selectedId={selectedId}
        history={history}
        staff={(staff ?? []).map((member) => ({
          id: member.id,
          full_name: member.full_name,
        }))}
        filter={filter}
        query={search}
        sort={sort}
        role={session.role}
      />
    </div>
  );
}
