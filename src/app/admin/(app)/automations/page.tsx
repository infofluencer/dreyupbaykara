import {
  addWaMessageOptOut,
  removeWaMessageOptOut,
  updateMessageRule,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatDateTimeTr } from "@/lib/date/tr";
import { WA_AUTOMATION_TEMPLATE_SPECS } from "@/lib/whatsapp/automation-templates";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

export default async function AutomationsPage() {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();

  const [{ data: rules, error: rulesError }, { data: dispatches }, { data: optOuts }] =
    await Promise.all([
      supabase
        .from("message_rules")
        .select(
          "key, label, enabled, template_name, language, offset_minutes, send_at_local_time, appointment_types, include_body_params, sort_order",
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
        Otomasyon tabloları yok. Supabase’te{" "}
        <code>20260823200000_wa_message_automations.sql</code> migration’ını
        çalıştırın.
        <span className="mt-1 block text-xs opacity-80">{rulesError.message}</span>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          WhatsApp otomasyonları
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#466254]">
          Randevu ve ameliyat hatırlatmaları Meta onaylı şablonlarla gider.
          Kurallar varsayılan kapalıdır — şablon onayından ve KVKK rızasından
          sonra açın. Cron:{" "}
          <code className="text-xs">POST /api/cron/reminders</code> (15 dk).
        </p>
      </div>

      <section className="rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[#123524]">
          Meta şablon checklist
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-[#466254]">
          {WA_AUTOMATION_TEMPLATE_SPECS.map((spec) => (
            <li key={spec.key}>
              <code className="text-xs text-[#0b6b45]">{spec.templateName}</code>
              {" — "}
              body {"{{1}}"} ad, {"{{2}}"} tarih, {"{{3}}"} saat
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Kurallar</h2>
        {(rules ?? []).map((rule) => (
          <form
            key={rule.key}
            action={updateMessageRule}
            className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5"
          >
            <input type="hidden" name="key" value={rule.key} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#123524]">{rule.label}</p>
                <p className="mt-1 text-xs text-[#466254]">
                  key: <code>{rule.key}</code>
                  {" · "}
                  tipler: {(rule.appointment_types ?? []).join(", ")}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={rule.enabled}
                />
                Aktif
              </label>
            </div>
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
                Offset (dk)
                <input
                  name="offset_minutes"
                  type="number"
                  min={0}
                  defaultValue={rule.offset_minutes}
                  className={input}
                />
              </label>
              <label className="block text-sm font-medium">
                Yerel saat (ameliyat)
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
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="include_body_params"
                defaultChecked={rule.include_body_params !== false}
              />
              Body parametreleri gönder (ad / tarih / saat)
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white"
            >
              Kaydet
            </button>
          </form>
        ))}
      </section>

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
                  <th className="px-3 py-2.5">Kural</th>
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
                    <td className="px-3 py-2.5">{row.rule_key}</td>
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
        <h2 className="text-lg font-semibold">Opt-out / kara liste</h2>
        <p className="text-sm text-[#466254]">
          Hasta <strong>DUR</strong>, <strong>STOP</strong> veya{" "}
          <strong>IPTAL</strong> yazarsa otomatik eklenir. Manuel de
          ekleyebilirsiniz.
        </p>
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
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#0b6b45] px-5 text-sm font-semibold text-white"
          >
            Ekle
          </button>
        </form>
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
                <form action={removeWaMessageOptOut}>
                  <input type="hidden" name="phone" value={row.phone} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-700"
                  >
                    Kaldır
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
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
      {status}
    </span>
  );
}
