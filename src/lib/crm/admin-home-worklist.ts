import "server-only";

import { adminHomeDayBounds } from "@/lib/crm/admin-home-stats";
import { firstRelation } from "@/lib/crm/labels";
import { createClient } from "@/lib/supabase/server";

/** Her blokta gösterilen satır sayısı; gerisi "Tümü →" linkinde. */
const ROW_LIMIT = 6;

/** WhatsApp serbest mesaj penceresi. */
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type WaitingConversation = {
  conversationId: string;
  leadId: string | null;
  name: string | null;
  phone: string | null;
  lastMessageAt: string | null;
  preview: string | null;
  unreadCount: number;
};

export type LeadTask = {
  leadId: string;
  name: string | null;
  phone: string | null;
  /** yeni = bugün geldi, dokunulmadı · tekrar = arandı ama ulaşılamadı */
  reason: "yeni" | "tekrar";
};

export type TodayAppointmentRow = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  name: string | null;
  phone: string | null;
  appointmentType: string;
  status: string;
};

export type AdminHomeWorklistData = {
  waiting: { rows: WaitingConversation[]; total: number };
  leads: { rows: LeadTask[]; total: number };
  appointments: { rows: TodayAppointmentRow[]; total: number };
};

const EMPTY_BLOCK = { rows: [], total: 0 };

export const EMPTY_WORKLIST: AdminHomeWorklistData = {
  waiting: { ...EMPTY_BLOCK, rows: [] },
  leads: { ...EMPTY_BLOCK, rows: [] },
  appointments: { ...EMPTY_BLOCK, rows: [] },
};

/**
 * Özet sayfasının iş listesi. Üç blok, hepsi bugün yapılabilir işler:
 *
 *   1. Yanıt bekleyen konuşmalar — yalnızca 24 saatlik serbest mesaj penceresi
 *      AÇIK olanlar. Pencere kapandıysa zaten cevap yazılamaz; listeye koymak
 *      asistanı yanıltır.
 *   2. Bugün gelen talepler + "tekrar ara" işaretliler.
 *   3. Bugünün randevuları.
 *
 * Not: Bu klinikte talepler neredeyse tamamen WhatsApp üzerinden geliyor
 * (Meta "WhatsApp'a tıkla" reklamları), günde ~40-100 kayıt. Bu yüzden liste
 * birikmiş tüm geçmişi değil, yalnızca bugünü gösterir.
 *
 * Bloklar birbirinden bağımsız: biri hata verirse diğerleri yine gösterilir.
 */
export async function loadAdminHomeWorklist(
  now = new Date(),
): Promise<AdminHomeWorklistData> {
  const supabase = await createClient();
  const { todayIso, tomorrowIso } = await adminHomeDayBounds();
  const replyWindowFrom = new Date(
    now.getTime() - REPLY_WINDOW_MS,
  ).toISOString();

  const [waiting, leads, appointments] = await Promise.all([
    loadWaiting(supabase, replyWindowFrom),
    loadTodayLeads(supabase, todayIso),
    loadTodayAppointments(supabase, todayIso, tomorrowIso),
  ]);

  return { waiting, leads, appointments };
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function loadWaiting(supabase: Client, since: string) {
  try {
    const { data, count, error } = await supabase
      .from("conversations")
      .select(
        "id, lead_id, contact_name, wa_phone, last_message_at, last_message_preview, unread_count",
        { count: "exact" },
      )
      .eq("status", "open")
      .eq("last_message_direction", "inbound")
      .gte("last_message_at", since)
      // En yeni üstte: canlı konuşmalar önce. Saatler önce gelen son mesajlar
      // pratikte çoğunlukla "teşekkürler" tipi kapanış oluyor, cevap beklemiyor.
      .order("last_message_at", { ascending: false })
      .limit(ROW_LIMIT);

    if (error) return { rows: [] as WaitingConversation[], total: 0 };

    const rows: WaitingConversation[] = (data ?? []).map((row) => ({
      conversationId: row.id,
      leadId: row.lead_id ?? null,
      name: row.contact_name ?? null,
      phone: row.wa_phone ?? null,
      lastMessageAt: row.last_message_at ?? null,
      preview: row.last_message_preview ?? null,
      unreadCount: Number(row.unread_count ?? 0),
    }));
    return { rows, total: count ?? rows.length };
  } catch {
    return { rows: [] as WaitingConversation[], total: 0 };
  }
}

async function loadTodayLeads(supabase: Client, todayIso: string) {
  try {
    const { data, count, error } = await supabase
      .from("leads")
      .select("id, status, needs_followup, created_at, contacts!inner(name, phone)", {
        count: "exact",
      })
      .or(
        `and(status.eq.yeni,last_contacted_at.is.null,created_at.gte.${todayIso}),and(status.eq.arandi,needs_followup.is.true)`,
      )
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT);

    if (error) return { rows: [] as LeadTask[], total: 0 };

    const rows: LeadTask[] = (data ?? []).map((row) => {
      const contact = firstRelation(
        row.contacts as
          | { name?: string | null; phone?: string | null }
          | Array<{ name?: string | null; phone?: string | null }>
          | null,
      );
      return {
        leadId: row.id,
        name: contact?.name ?? null,
        phone: contact?.phone ?? null,
        reason: row.status === "yeni" ? "yeni" : "tekrar",
      };
    });
    return { rows, total: count ?? rows.length };
  } catch {
    return { rows: [] as LeadTask[], total: 0 };
  }
}

async function loadTodayAppointments(
  supabase: Client,
  todayIso: string,
  tomorrowIso: string,
) {
  try {
    const { data, count, error } = await supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, appointment_type, status, leads!inner(contacts(name, phone))",
        { count: "exact" },
      )
      .gte("starts_at", todayIso)
      .lt("starts_at", tomorrowIso)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(ROW_LIMIT);

    if (error) return { rows: [] as TodayAppointmentRow[], total: 0 };

    const rows: TodayAppointmentRow[] = (data ?? []).map((row) => {
      const lead = firstRelation(
        row.leads as
          | { contacts?: unknown }
          | Array<{ contacts?: unknown }>
          | null,
      );
      const contact = firstRelation(
        (lead?.contacts ?? null) as
          | { name?: string | null; phone?: string | null }
          | Array<{ name?: string | null; phone?: string | null }>
          | null,
      );
      return {
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at ?? null,
        name: contact?.name ?? null,
        phone: contact?.phone ?? null,
        appointmentType: row.appointment_type ?? "",
        status: row.status,
      };
    });
    return { rows, total: count ?? rows.length };
  } catch {
    return { rows: [] as TodayAppointmentRow[], total: 0 };
  }
}
