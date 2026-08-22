import "server-only";

import {
  classifyAdPlatform,
  classifySourceEvent,
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";
import { createClient } from "@/lib/supabase/server";

export type AdminHomeWaStats = {
  open: number;
  unread: number;
  awaiting: number;
  todayInbound: number;
};

export type AdminHomeSourceStats = {
  platforms: Record<AdPlatform, number>;
  events: Record<SourceEvent, number>;
};

const emptyPlatforms = (): Record<AdPlatform, number> => ({
  google_ads: 0,
  meta: 0,
  other: 0,
  organic: 0,
});

const emptyEvents = (): Record<SourceEvent, number> => ({
  landing: 0,
  whatsapp: 0,
  form: 0,
});

/** Bugün aralığı — önceki Özet sayfası ile aynı (sunucu yerel gece yarısı). */
export function adminHomeDayBounds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { todayIso: today.toISOString(), tomorrowIso: tomorrow.toISOString() };
}

export async function loadAdminHomeHeaderCounts() {
  const supabase = await createClient();
  const { todayIso, tomorrowIso } = adminHomeDayBounds();

  const [{ count: fresh }, { count: appointments }] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("stage", "new"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", todayIso)
      .lt("starts_at", tomorrowIso)
      .neq("status", "cancelled"),
  ]);

  return {
    newLeadCount: fresh ?? 0,
    appointmentCount: appointments ?? 0,
  };
}

export async function loadAdminHomeWaStats(): Promise<AdminHomeWaStats> {
  const supabase = await createClient();
  const { todayIso, tomorrowIso } = adminHomeDayBounds();

  const [rpcResult, inboundResult] = await Promise.all([
    supabase.rpc("admin_dashboard_wa_stats"),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "inbound")
      .gte("created_at", todayIso)
      .lt("created_at", tomorrowIso),
  ]);

  if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === "object") {
    const data = rpcResult.data as {
      open_count?: number;
      unread_sum?: number;
      awaiting_count?: number;
    };
    return {
      open: Number(data.open_count ?? 0),
      unread: Number(data.unread_sum ?? 0),
      awaiting: Number(data.awaiting_count ?? 0),
      todayInbound: inboundResult.count ?? 0,
    };
  }

  // Migration yoksa: satır çekmeden count; unread sum için RPC gerekir.
  const [openRes, awaitingRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .eq("last_message_direction", "inbound"),
  ]);

  let unread = 0;
  const sumRes = await supabase
    .from("conversations")
    .select("unread_count.sum()");
  if (!sumRes.error && Array.isArray(sumRes.data) && sumRes.data[0]) {
    const row = sumRes.data[0] as { sum?: number };
    unread = Number(row.sum ?? 0);
  }

  return {
    open: openRes.count ?? 0,
    unread,
    awaiting: awaitingRes.count ?? 0,
    todayInbound: inboundResult.count ?? 0,
  };
}

export async function loadAdminHomeSourceStats(): Promise<AdminHomeSourceStats> {
  const supabase = await createClient();
  const rpcResult = await supabase.rpc("admin_dashboard_source_stats");

  if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === "object") {
    const data = rpcResult.data as {
      platforms?: Partial<Record<AdPlatform, number>>;
      events?: Partial<Record<SourceEvent, number>>;
    };
    return {
      platforms: { ...emptyPlatforms(), ...data.platforms },
      events: { ...emptyEvents(), ...data.events },
    };
  }

  // Fallback: en fazla 500 satır (eski 5000 yerine); sadece classify kolonları.
  const { data: rows } = await supabase
    .from("lead_source_report")
    .select(
      "channel, utm_source, utm_medium, utm_campaign, campaign, gclid, fbclid",
    )
    .limit(500);

  const platforms = emptyPlatforms();
  const events = emptyEvents();
  for (const row of rows ?? []) {
    platforms[classifyAdPlatform(row)] += 1;
    events[classifySourceEvent(row.channel)] += 1;
  }
  return { platforms, events };
}
