import {
  deleteBotFaq,
  saveBotFaq,
  saveBotSettings,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { faqLang } from "@/lib/whatsapp/bot-match";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

const DAYS = [
  [1, "Pazartesi"],
  [2, "Salı"],
  [3, "Çarşamba"],
  [4, "Perşembe"],
  [5, "Cuma"],
  [6, "Cumartesi"],
  [7, "Pazar"],
] as const;

export default async function BotPage() {
  await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const [{ data: settings, error }, { data: faqs }] = await Promise.all([
    supabase.from("bot_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("bot_faqs").select("*").order("sort_order"),
  ]);

  if (error || !settings) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Bot tabloları bulunamadı. Önce{" "}
        <code>20260808034500_operations.sql</code> migration’ını çalıştırın.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Otomatik yanıt botu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#466254]">
          Bot yalnızca mesai saatleri DIŞINDA otomatik cevap verir. Mesai içinde
          ekip yanıtlar — bot susar, çakışma olmaz. Mesai dışında SSS tutarsa
          sabit cevap gider; tutmazsa “mesai dışındayız” mesajı gönderilir.
          Hastalar TR / EN / AR (Arabizi: wein, se3r) yazar. Tıbbi teşhis yok.
        </p>
      </div>

      <form
        action={saveBotSettings}
        className="space-y-5 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7"
      >
        <label className="flex items-center gap-3 font-semibold">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={settings.enabled}
          />
          Bot aktif
        </label>
        <p className="text-xs leading-5 text-[#466254]">
          Kapalıysa bot hiç çalışmaz (mesai dışı olsa bile). Açıkken yalnızca
          aşağıdaki mesai saatlerinin dışında yanıt verir.
        </p>
        <Field label="Saat dilimi (IANA)">
          <input
            name="timezone"
            required
            defaultValue={settings.timezone || "Europe/Istanbul"}
            placeholder="Europe/Istanbul"
            className={input}
          />
        </Field>
        <div>
          <p className="text-sm font-medium">Mesai günleri (bot bu günlerde saat aralığında susar)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {DAYS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 text-sm">
                <input
                  name="business_days"
                  type="checkbox"
                  value={value}
                  defaultChecked={settings.business_days.includes(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mesai başlangıcı">
            <input
              name="business_start"
              type="time"
              defaultValue={settings.business_start.slice(0, 5)}
              className={input}
            />
          </Field>
          <Field label="Mesai bitişi">
            <input
              name="business_end"
              type="time"
              defaultValue={settings.business_end.slice(0, 5)}
              className={input}
            />
          </Field>
        </div>
        <Field label="Mesai dışı (SSS yok — birincil otomatik mesaj)">
          <textarea
            name="after_hours_message"
            rows={5}
            defaultValue={settings.after_hours_message}
            className={input}
          />
        </Field>
        <Field label="Karşılama (saklanır; mesai dışı modunda kullanılmaz)">
          <textarea
            name="welcome_message"
            rows={6}
            defaultValue={settings.welcome_message}
            className={input}
          />
        </Field>
        <Field label="Fallback (saklanır; mesai dışı modunda kullanılmaz)">
          <textarea
            name="fallback_message"
            rows={6}
            defaultValue={settings.fallback_message}
            className={input}
          />
        </Field>
        <p className="text-xs leading-5 text-[#466254]">
          Mesai dışı SSS tekrarı 10 dk, “mesai dışındayız” tekrarı 30 dk içinde
          spamlenmez. Asistan Inbox’tan son 30 dk içinde yazdıysa bot yine
          susar.
        </p>
        <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b6b45] px-6 text-sm font-semibold text-white">
          Bot ayarlarını kaydet
        </button>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sık sorulan sorular</h2>
          <p className="mt-1 text-sm text-[#466254]">
            TR / EN / AR ayrı maddeler. Virgülle keyword; biri tutarsa o dildeki
            cevap gider. Arapça maddeye wein, se3r gibi Arabizi de ekleyin.
          </p>
        </div>
        {faqs?.map((faq) => (
          <form
            key={faq.id}
            action={saveBotFaq}
            className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5"
          >
            <input type="hidden" name="id" value={faq.id} />
            <p className="text-[11px] font-semibold tracking-wide text-[#466254] uppercase">
              {faqLang(faq) === "ar"
                ? "AR · Arapça"
                : faqLang(faq) === "tr"
                  ? "TR · Türkçe"
                  : "EN · English"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Soru / başlık">
                <input
                  name="question"
                  required
                  defaultValue={faq.question}
                  className={input}
                />
              </Field>
              <Field label="Anahtar kelimeler">
                <input
                  name="keywords"
                  required
                  defaultValue={faq.keywords.join(", ")}
                  className={input}
                />
              </Field>
            </div>
            <Field label="Sabit cevap">
              <textarea
                name="answer"
                rows={3}
                required
                defaultValue={faq.answer}
                className={input}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={faq.enabled}
                />
                Aktif
              </label>
              <input
                name="sort_order"
                type="number"
                defaultValue={faq.sort_order}
                className="w-20 rounded-lg border border-[#123524]/15 px-2 py-1 text-sm"
                aria-label="Sıra"
              />
              <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#123524] px-4 text-sm font-semibold text-white">
                Kaydet
              </button>
              <button
                formAction={deleteBotFaq}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700"
              >
                Sil
              </button>
            </div>
          </form>
        ))}

        <form
          action={saveBotFaq}
          className="space-y-4 rounded-2xl border border-dashed border-[#123524]/20 bg-white p-5"
        >
          <h3 className="font-semibold">Yeni SSS</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Soru / başlık">
              <input name="question" required className={input} />
            </Field>
            <Field label="Anahtar kelimeler">
              <input
                name="keywords"
                required
                placeholder="adres, konum, hastane"
                className={input}
              />
            </Field>
          </div>
          <Field label="Sabit cevap">
            <textarea name="answer" rows={3} required className={input} />
          </Field>
          <input type="hidden" name="enabled" value="true" />
          <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#123524] px-5 text-sm font-semibold text-white">
            SSS ekle
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

