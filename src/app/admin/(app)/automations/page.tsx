import type { ReactNode } from "react";
import {
  addWaMessageOptOut,
  removeWaMessageOptOut,
  updateMessageRule,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";
import { APPOINTMENT_TYPE_LABEL } from "@/lib/crm/labels";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/crm/lead-status";
import { formatDateTimeTr } from "@/lib/date/tr";
import {
  automationSampleBody,
  WA_AUTOMATION_TEMPLATE_SPECS,
} from "@/lib/whatsapp/automation-templates";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

type RuleRow = {
  key: string;
  label: string;
  enabled: boolean;
  template_name: string;
  language: string;
  offset_minutes: number;
  send_at_local_time: string | null;
  timing_mode: "before_start" | "calendar_day" | null;
  appointment_types: string[] | null;
  appointment_statuses: string[] | null;
  lead_statuses: string[] | null;
  include_body_params: boolean;
  sort_order: number;
};

export default async function AutomationsPage() {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const canEdit = session.role === "admin";
  const supabase = await createClient();

  const [{ data: rules, error: rulesError }, { data: dispatches }, { data: optOuts }] =
    await Promise.all([
      supabase
        .from("message_rules")
        .select(
          "key, label, enabled, template_name, language, offset_minutes, send_at_local_time, timing_mode, appointment_types, appointment_statuses, lead_statuses, include_body_params, sort_order",
        )
        .order("sort_order"),
      supabase
        .from("message_dispatches")
        .select(
          "id, appointment_id, rule_key, phone, template_name, status, error, sent_at, wa_message_id",
        )
        .order("sent_at", { ascending: false })
        .limit(40),
      supabase
        .from("wa_message_opt_outs")
        .select("phone, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (rulesError) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Otomasyon tabloları güncel değil. Supabase’te şu migration’ları
        çalıştırın:{" "}
        <code>20260823200000_wa_message_automations.sql</code>,{" "}
        <code>20260824140000_message_rules_lead_statuses.sql</code>,{" "}
        <code>20260824150000_postop_bilgilendirme_rule.sql</code>,{" "}
        <code>20260828150000_google_maps_review_rule.sql</code>.
        <span className="mt-1 block text-xs opacity-80">{rulesError.message}</span>
      </p>
    );
  }

  const ruleList = (rules ?? []) as RuleRow[];
  const labelByKey = Object.fromEntries(ruleList.map((r) => [r.key, r.label]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          WhatsApp otomasyonları
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#466254]">
          Toplam 4 otomatik mesaj: randevudan 1 gün önce, 1 saat önce, ameliyat
          günü saat 16:00 bilgilendirme ve ardından Google Maps yorum isteği.
          Cron her 15 dakikada uygun hastaları bulup Meta şablonuyla gönderir.
        </p>
      </div>

      <WhoGetsWhatGuide rules={ruleList} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Kurallar</h2>
          <p className="mt-1 text-sm text-[#466254]">
            Her kural kapalıysa mesaj gitmez. Açmak için şablonun Meta’da
            onaylı olması ve KVKK rızası gerekir.
            {!canEdit ? (
              <span className="mt-1 block text-xs">
                Ayarları yalnızca admin değiştirebilir; bu ekran bilgilendirme
                içindir.
              </span>
            ) : null}
          </p>
        </div>
        {ruleList.map((rule) => (
          <RuleCard key={rule.key} rule={rule} canEdit={canEdit} />
        ))}
      </section>

      {canEdit ? (
        <section className="rounded-2xl border border-[#123524]/10 bg-[#f7faf8] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#123524]">
            Meta şablon checklist — yalnızca bu 4 şablon
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[#466254]">
            {WA_AUTOMATION_TEMPLATE_SPECS.map((spec) => (
              <li key={spec.key}>
                <code className="text-xs text-[#0b6b45]">{spec.templateName}</code>
                {" — "}
                {spec.bodyParams.length === 0
                  ? "sabit metin (değişken yok), kategori UTILITY"
                  : `body {{1}} ad, {{2}} tarih, {{3}} saat`}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-[#466254]">
            Bilgilendirme metni Meta’da 1024 karakter sınırına sığdırılmıştır;
            paneldeki örnek Meta’ya onaylatılacak metindir.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Son gönderimler</h2>
        {!dispatches?.length ? (
          <p className="text-sm text-[#466254]">Henüz kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#123524]/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#123524]/10 text-xs uppercase text-[#466254]">
                <tr>
                  <th className="px-3 py-2.5">Zaman</th>
                  <th className="px-3 py-2.5">Mesaj</th>
                  <th className="px-3 py-2.5">Telefon</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5">Detay</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#123524]/06 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#466254]">
                      {formatDateTimeTr(row.sent_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {labelByKey[row.rule_key] ?? row.rule_key}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {row.phone || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs text-[#466254]">
                      {row.error || row.template_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mesaj almak istemeyenler</h2>
        <p className="text-sm text-[#466254]">
          Hasta <strong>DUR</strong>, <strong>STOP</strong> veya{" "}
          <strong>IPTAL</strong> yazarsa otomatik eklenir. Bu listedekilere
          hatırlatma gitmez.
        </p>
        {canEdit ? (
          <form
            action={addWaMessageOptOut}
            className="flex flex-col gap-2 rounded-2xl border border-[#123524]/10 bg-white p-4 sm:flex-row sm:items-end"
          >
            <label className="block min-w-0 flex-1 text-sm font-medium">
              Telefon
              <input
                name="phone"
                required
                placeholder="905xxxxxxxxx"
                className={input}
              />
            </label>
            <label className="block min-w-0 flex-1 text-sm font-medium">
              Sebep
              <input name="reason" placeholder="manual" className={input} />
            </label>
            <SubmitButton pendingLabel="Ekleniyor…" className="shrink-0">
              Ekle
            </SubmitButton>
          </form>
        ) : null}
        {!optOuts?.length ? (
          <p className="text-sm text-[#466254]">Liste boş.</p>
        ) : (
          <ul className="divide-y divide-[#123524]/08 overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
            {optOuts.map((row) => (
              <li
                key={row.phone}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-mono text-xs sm:text-sm">{row.phone}</p>
                  <p className="text-xs text-[#466254]">
                    {row.reason || "—"} · {formatDateTimeTr(row.created_at)}
                  </p>
                </div>
                {canEdit ? (
                  <form action={removeWaMessageOptOut}>
                    <input type="hidden" name="phone" value={row.phone} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-red-700"
                    >
                      Kaldır
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WhoGetsWhatGuide({ rules }: { rules: RuleRow[] }) {
  const byType = new Map<string, RuleRow[]>();
  for (const rule of rules) {
    for (const type of rule.appointment_types ?? []) {
      const list = byType.get(type) ?? [];
      list.push(rule);
      byType.set(type, list);
    }
  }

  const typeOrder = [
    "consultation",
    "control",
    "online",
    "other",
    "procedure",
  ];
  const orderedTypes = [
    ...typeOrder.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((t) => !typeOrder.includes(t)),
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
      <div className="border-b border-[#123524]/08 bg-[#f7faf8] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[#123524]">
          Kim hangi mesajı alır?
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#466254]">
          Muayene / kontrol / online randevulara hatırlatma; ameliyat
          (procedure) randevusuna gün sonunda bilgilendirme gider. Hasta durumu
          Durum Panosu ile aynıdır.
        </p>
      </div>
      <div className="divide-y divide-[#123524]/08">
        {orderedTypes.map((type) => {
          const linked = byType.get(type) ?? [];
          return (
            <div
              key={type}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:items-start sm:px-6"
            >
              <div>
                <p className="font-semibold text-[#123524]">
                  {APPOINTMENT_TYPE_LABEL[type] ?? type}
                </p>
                <p className="mt-0.5 text-xs text-[#466254]">Randevu tipi</p>
              </div>
              <ul className="space-y-2">
                {linked.map((rule) => (
                  <li
                    key={`${type}-${rule.key}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <EnabledDot enabled={rule.enabled} />
                    <span className="font-medium text-[#123524]">
                      {rule.label}
                    </span>
                    <span className="text-[#466254]">
                      · {formatWhen(rule)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RuleCard({ rule, canEdit }: { rule: RuleRow; canEdit: boolean }) {
  const types = rule.appointment_types?.length
    ? rule.appointment_types
    : ["consultation"];
  const leadStatuses = (
    rule.lead_statuses?.length
      ? rule.lead_statuses
      : rule.key === "surgery_day" || rule.timing_mode === "calendar_day"
        ? ["randevulu", "bitti"]
        : ["randevulu"]
  ).filter((s): s is LeadPipelineStatus =>
    LEAD_STATUSES.includes(s as LeadPipelineStatus),
  );
  const sample = automationSampleBody(rule.key);

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#123524]">{rule.label}</p>
            <EnabledBadge enabled={rule.enabled} />
          </div>
          <p className="text-sm text-[#466254]">
            <span className="font-medium text-[#123524]">Ne zaman:</span>{" "}
            {formatWhen(rule)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
            Randevu tipi
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {types.map((t) => (
              <Chip key={t}>{APPOINTMENT_TYPE_LABEL[t] ?? t}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
            Hasta durumu (Durum Panosu)
          </p>
          {canEdit ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {LEAD_STATUSES.map((status) => (
                <label
                  key={status}
                  className="inline-flex items-center gap-2 text-sm text-[#123524]"
                >
                  <input
                    type="checkbox"
                    name="lead_statuses"
                    value={status}
                    defaultChecked={leadStatuses.includes(status)}
                  />
                  {LEAD_STATUS_LABEL[status]}
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {leadStatuses.map((s) => (
                <Chip key={s}>{LEAD_STATUS_LABEL[s]}</Chip>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs leading-5 text-[#466254]">
            Durum Panosu’ndaki durumlarla aynıdır. Varsayılan: Randevulu.
          </p>
        </div>
      </div>

      {sample ? (
        <blockquote className="rounded-xl bg-[#f7faf8] px-4 py-3 text-sm leading-6 text-[#466254]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0b6b45]">
            Örnek mesaj
          </p>
          <p className="whitespace-pre-wrap">{sample}</p>
        </blockquote>
      ) : null}

      {canEdit ? (
        <>
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={rule.enabled}
            />
            Bu kuralı aktif et
          </label>

          <details className="rounded-xl border border-[#123524]/10 bg-[#f7faf8] open:bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[#123524]">
              Teknik ayarlar (şablon / zaman)
            </summary>
            <div className="space-y-4 border-t border-[#123524]/08 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-medium">
                  Şablon adı
                  <input
                    name="template_name"
                    required
                    defaultValue={rule.template_name}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Dil
                  <input
                    name="language"
                    defaultValue={rule.language || "tr"}
                    className={input}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Kaç dakika önce
                  <input
                    name="offset_minutes"
                    type="number"
                    min={0}
                    defaultValue={rule.offset_minutes}
                    className={input}
                  />
                  <span className="mt-1 block text-xs font-normal text-[#466254]">
                    1440 = 1 gün, 60 = 1 saat. Ameliyat günü için 0.
                  </span>
                </label>
                <label className="block text-sm font-medium">
                  Gönderim saati (ameliyat günü)
                  <input
                    name="send_at_local_time"
                    type="time"
                    defaultValue={
                      rule.send_at_local_time
                        ? String(rule.send_at_local_time).slice(0, 5)
                        : ""
                    }
                    className={input}
                  />
                  <span className="mt-1 block text-xs font-normal text-[#466254]">
                    Ameliyat sonrası bilgilendirme saati (İstanbul).
                  </span>
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="include_body_params"
                  defaultChecked={rule.include_body_params !== false}
                />
                Mesaja ad / tarih / saat ekle
              </label>
            </div>
          </details>

          <SubmitButton pendingLabel="Kural kaydediliyor…">
            Kaydet
          </SubmitButton>
        </>
      ) : null}
    </>
  );

  if (!canEdit) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5">
        {body}
      </div>
    );
  }

  return (
    <form
      action={updateMessageRule}
      className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5"
    >
      <input type="hidden" name="key" value={rule.key} />
      {body}
    </form>
  );
}

function formatWhen(rule: Pick<
  RuleRow,
  "offset_minutes" | "send_at_local_time" | "timing_mode" | "key"
>): string {
  const time = rule.send_at_local_time
    ? String(rule.send_at_local_time).slice(0, 5)
    : null;
  if (rule.timing_mode === "calendar_day" || rule.key === "surgery_day") {
    return time
      ? `Ameliyat günü saat ${time} (İstanbul) — ameliyat sonrası`
      : "Ameliyat günü (saat ayarı yok)";
  }
  const minutes = rule.offset_minutes ?? 0;
  if (minutes > 0) {
    if (minutes === 1440) return "Randevudan 1 gün önce";
    if (minutes === 60) return "Randevudan 1 saat önce";
    if (minutes % 1440 === 0) {
      return `Randevudan ${minutes / 1440} gün önce`;
    }
    if (minutes % 60 === 0) {
      return `Randevudan ${minutes / 60} saat önce`;
    }
    return `Randevudan ${minutes} dakika önce`;
  }
  if (time) return `Gün içinde saat ${time} (İstanbul)`;
  return "Zaman ayarı tanımlı değil";
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#e7f5ed] px-2.5 py-1 text-xs font-semibold text-[#0b6b45]">
      {children}
    </span>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        enabled
          ? "bg-[#e7f5ed] text-[#0b6b45]"
          : "bg-[#f1f5f9] text-[#64748b]"
      }`}
    >
      {enabled ? "Açık" : "Kapalı"}
    </span>
  );
}

function EnabledDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${
        enabled ? "bg-[#0b6b45]" : "bg-[#94a3b8]"
      }`}
      title={enabled ? "Açık" : "Kapalı"}
      aria-label={enabled ? "Açık" : "Kapalı"}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "sent"
      ? "Gönderildi"
      : status === "failed"
        ? "Hata"
        : status === "skipped"
          ? "Atlandı"
          : status;
  const tone =
    status === "sent"
      ? "bg-[#e7f5ed] text-[#0b6b45]"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
