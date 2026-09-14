import Image from "next/image";
import {
  deleteBotFaq,
  saveBotFaq,
  saveBotSettings,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";
import { INTRO_BODY, INTRO_IMAGE_CAPTION } from "@/lib/whatsapp/bot-intro";
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
          Hasta bize ilk kez yazdığında genel bilgilendirme metni ve işlem
          bölgesi görseli otomatik gider — mesai saatinden bağımsız, konuşma
          başına yalnızca bir kez. Daha önce yazıştığımız hastalar bu mesajı
          almaz. SSS ve “mesai dışındayız” akışı şu an askıda; aşağıdan geri
          açabilirsiniz.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold">İlk mesaj bilgilendirmesi</h2>
          <p className="mt-1 text-sm text-[#466254]">
            Hastanın ilk mesajına giden içerik. Metin, Inbox’taki “Genel
            bilgilendirme” hazır mesajıyla aynıdır.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <p className="rounded-xl bg-[#f4f7f5] p-4 text-sm leading-6 whitespace-pre-line text-[#123524]">
            {INTRO_BODY}
          </p>
          <figure className="space-y-2">
            {/* Görsel public/ altında değil; yetki kontrollü rotadan gelir. */}
            <Image
              src="/api/whatsapp/intro-image"
              alt="İlk mesajda gönderilen işlem bölgesi görseli"
              width={1200}
              height={1600}
              unoptimized
              className="h-auto w-40 rounded-xl border border-[#123524]/10"
            />
            <figcaption className="w-40 text-xs leading-5 text-[#466254]">
              {INTRO_IMAGE_CAPTION}
            </figcaption>
          </figure>
        </div>
      </section>

      <form
        action={saveBotSettings}
        className="space-y-5 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7"
      >
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 font-semibold">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={settings.enabled}
              />
              Bot aktif
            </label>
            <p className="mt-1 text-xs leading-5 text-[#466254]">
              Ana şalter. Kapalıysa hiçbir otomatik mesaj gitmez.
            </p>
          </div>
          <div>
            <label className="flex items-center gap-3 font-semibold">
              <input
                name="intro_enabled"
                type="checkbox"
                defaultChecked={settings.intro_enabled}
              />
              İlk mesaj bilgilendirmesi
            </label>
            <p className="mt-1 text-xs leading-5 text-[#466254]">
              Hasta ilk kez yazdığında yukarıdaki metin + görsel gider. Mesai
              saatine bakmaz, konuşma başına bir kez çalışır.
            </p>
          </div>
          <div>
            <label className="flex items-center gap-3 font-semibold">
              <input
                name="faq_enabled"
                type="checkbox"
                defaultChecked={settings.faq_enabled}
              />
              SSS + mesai dışı yanıtları (şu an askıda)
            </label>
            <p className="mt-1 text-xs leading-5 text-[#466254]">
              Açarsanız eski davranış geri gelir: mesai dışında SSS tutarsa
              sabit cevap, tutmazsa “mesai dışındayız” mesajı gider. Aşağıdaki
              mesai ve SSS ayarları yalnızca bu kutu işaretliyken çalışır.
            </p>
          </div>
        </div>
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
          SSS akışı açıldığında: mesai dışı SSS tekrarı 10 dk, “mesai
          dışındayız” tekrarı 30 dk içinde spamlenmez. Asistan Inbox’tan son 30
          dk içinde yazdıysa bot yine susar.
        </p>
        <SubmitButton pendingLabel="Bot ayarları kaydediliyor…" className="px-6">
          Bot ayarlarını kaydet
        </SubmitButton>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sık sorulan sorular</h2>
          <p className="mt-1 text-sm text-[#466254]">
            TR / EN / AR ayrı maddeler. Virgülle keyword; biri tutarsa o dildeki
            cevap gider. Arapça maddeye wein, se3r gibi Arabizi de ekleyin.
            Kayıtlar korunuyor ama “SSS + mesai dışı yanıtları” kapalıyken
            gönderilmez.
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
              <SubmitButton variant="dark" pendingLabel="SSS kaydediliyor…" className="min-h-10 px-4">
                Kaydet
              </SubmitButton>
              <SubmitButton
                formAction={deleteBotFaq}
                variant="dangerGhost"
                pendingLabel="Siliniyor…"
                className="min-h-10 px-4"
              >
                Sil
              </SubmitButton>
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
          <SubmitButton variant="dark" pendingLabel="SSS ekleniyor…">
            SSS ekle
          </SubmitButton>
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

