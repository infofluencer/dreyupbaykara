import Link from "next/link";
import { saveHomeSection, saveSiteSettings } from "@/app/admin/actions";
import { AdminMediaPanel } from "@/components/admin/AdminMediaPanel";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";
import { HOME_FALLBACK, type HomeSections } from "@/lib/cms/home";
import { getHomeSections } from "@/lib/cms/home-server";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-2.5 text-base outline-none focus:border-[#0b6b45] sm:text-sm";

type Tab = "sections" | "media" | "settings";

function parseTab(raw?: string): Tab {
  if (raw === "media" || raw === "settings") return raw;
  return "sections";
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    imported?: string;
    linked?: string;
    failed?: string;
  }>;
}) {
  await requireAdminSession(["admin", "editor", "agency"]);
  const query = await searchParams;
  const tab = parseTab(query.tab);
  const home = await getHomeSections();
  const supabase = await createClient();
  const [{ data: pages }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("content_pages")
      .select("id, slug, title, status")
      .order("slug"),
    supabase
      .from("site_settings")
      .select("setting_key, value")
      .in("setting_key", ["contact.phone", "contact.email", "contact.clinic"]),
  ]);
  const settings = Object.fromEntries(
    (settingsRows ?? []).map((item) => [item.setting_key, item.value]),
  );
  const clinic =
    typeof settings["contact.clinic"] === "object" &&
    settings["contact.clinic"] !== null
      ? (settings["contact.clinic"] as { name?: string; city?: string })
      : {};

  const tabClass = (id: Tab) =>
    `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${
      tab === id
        ? "bg-[#123524] text-white"
        : "border border-[#123524]/12 bg-white text-[#466254] hover:border-[#123524]/25"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          İçerik
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Ana sayfa section’larının yeri sabittir. Burada yalnızca metin, sayı ve
          görsel yollarını değiştirirsiniz. Yeni section eklenmez.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/content" className={tabClass("sections")}>
          Ana sayfa
        </Link>
        <Link href="/admin/content?tab=media" className={tabClass("media")}>
          Medya
        </Link>
        <Link
          href="/admin/content?tab=settings"
          className={tabClass("settings")}
        >
          İletişim ayarları
        </Link>
      </div>

      {tab === "media" ? (
        <AdminMediaPanel
          imported={query.imported}
          linked={query.linked}
          failed={query.failed}
        />
      ) : null}

      {tab === "settings" ? (
        <form
          action={saveSiteSettings}
          className="grid gap-5 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:grid-cols-2 sm:p-7"
        >
          <Field label="Telefon">
            <input
              name="phone"
              required
              defaultValue={String(settings["contact.phone"] ?? "")}
              className={input}
            />
          </Field>
          <Field label="E-posta">
            <input
              name="email"
              type="email"
              required
              defaultValue={String(settings["contact.email"] ?? "")}
              className={input}
            />
          </Field>
          <Field label="Klinik adı">
            <input
              name="clinic_name"
              required
              defaultValue={clinic.name ?? ""}
              className={input}
            />
          </Field>
          <Field label="Klinik adresi / şehir">
            <input
              name="clinic_city"
              required
              defaultValue={clinic.city ?? ""}
              className={input}
            />
          </Field>
          <SubmitButton pendingLabel="Ayarlar kaydediliyor…" className="px-6 sm:col-span-2 sm:justify-self-start">
            Ayarları kaydet
          </SubmitButton>
        </form>
      ) : null}

      {tab === "sections" ? (
        <div className="space-y-5">
          <HeroForm hero={home.hero} />
          <WhyUsForm whyUs={home.whyUs} />
          <CopyForm
            section="leadForm"
            title="Randevu formu"
            hint="Ana sayfadaki WhatsApp bilgi formu başlığı."
            data={home.leadForm}
            showDescription
          />
          <CopyForm
            section="instagram"
            title="Instagram galeri"
            hint="Başlık satırı. Videolar kodda sabittir."
            data={home.instagram}
          />
          <CopyForm
            section="testimonials"
            title="Hasta hikâyeleri"
            hint="Yorum kartlarının üst başlığı. Alıntılar şimdilik kodda."
            data={home.testimonials}
          />
          <CopyForm
            section="youtube"
            title="Hasta videoları"
            hint="YouTube bölüm başlığı."
            data={home.youtube}
          />
          <CopyForm
            section="blog"
            title="Blog"
            hint="Ana sayfa blog önizleme başlığı."
            data={home.blog}
            showCta
          />
          <BannerForm banner={home.banner} />

          <section className="rounded-2xl border border-[#123524]/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Sayfa SEO</h2>
            <p className="mt-1 text-sm text-[#466254]">
              Hakkımızda, iletişim, blog gibi sayfaların başlık ve açıklaması.
            </p>
            <div className="mt-4 divide-y divide-[#123524]/08">
              {(pages ?? []).map((page) => (
                <Link
                  key={page.id}
                  href={`/admin/content/${page.id}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:text-[#0b6b45]"
                >
                  <span>
                    <span className="font-medium">{page.title}</span>
                    <span className="ml-2 text-[#466254]">{page.slug}</span>
                  </span>
                  <span className="text-xs text-[#466254]">{page.status}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
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

function SaveButton() {
  return (
    <SubmitButton pendingLabel="Section kaydediliyor…">
      Bu section’ı kaydet
    </SubmitButton>
  );
}

function HeroForm({ hero }: { hero: HomeSections["hero"] }) {
  return (
    <form
      action={saveHomeSection}
      className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-6"
    >
      <input type="hidden" name="section" value="hero" />
      <div>
        <h2 className="text-lg font-semibold">Hero</h2>
        <p className="mt-1 text-sm text-[#466254]">
          Sol metin + sağ doktor kartı. 3D iskelet değişmez.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Üst etiket">
          <input name="kicker" defaultValue={hero.kicker} className={input} />
        </Field>
        <Field label="Buton metni">
          <input name="cta_label" defaultValue={hero.ctaLabel} className={input} />
        </Field>
        <Field label="Başlık (önce)">
          <input
            name="title_before"
            defaultValue={hero.titleBefore}
            className={input}
          />
        </Field>
        <Field label="Başlık (vurgu, yeşil)">
          <input
            name="title_highlight"
            defaultValue={hero.titleHighlight}
            className={input}
          />
        </Field>
        <Field label="Başlık (sonra)">
          <input
            name="title_after"
            defaultValue={hero.titleAfter}
            className={input}
          />
        </Field>
        <Field label="Buton linki">
          <input name="cta_href" defaultValue={hero.ctaHref} className={input} />
        </Field>
        <Field label="Satır 1">
          <input name="line1" defaultValue={hero.line1} className={input} />
        </Field>
        <Field label="Satır 1 vurgu">
          <input
            name="line1_highlight"
            defaultValue={hero.line1Highlight}
            className={input}
          />
        </Field>
        <Field label="Satır 2">
          <input name="line2" defaultValue={hero.line2} className={input} />
        </Field>
        <Field label="Kısa açıklama">
          <input
            name="description"
            defaultValue={hero.description}
            className={input}
          />
        </Field>
      </div>
      <p className="text-xs font-semibold tracking-wide text-[#466254] uppercase">
        Doktor kartı
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="İsim satır 1">
          <input
            name="doctor_name_1"
            defaultValue={hero.doctorName1}
            className={input}
          />
        </Field>
        <Field label="İsim satır 2">
          <input
            name="doctor_name_2"
            defaultValue={hero.doctorName2}
            className={input}
          />
        </Field>
        <Field label="Kısa bio">
          <textarea
            name="doctor_bio"
            rows={3}
            defaultValue={hero.doctorBio}
            className={input}
          />
        </Field>
        <div className="grid gap-4">
          <Field label="Puan">
            <input name="rating" defaultValue={hero.rating} className={input} />
          </Field>
          <Field label="Yorum sayısı">
            <input
              name="review_count"
              defaultValue={hero.reviewCount}
              className={input}
            />
          </Field>
        </div>
        <Field label="Yıl / deneyim kutusu">
          <input
            name="doctor_years"
            defaultValue={hero.doctorYears}
            className={input}
          />
        </Field>
        <Field label="Perk kutusu">
          <input
            name="doctor_perk"
            defaultValue={hero.doctorPerk}
            className={input}
          />
        </Field>
        <Field label="Doktor görseli (yol)">
          <input
            name="doctor_image"
            defaultValue={hero.doctorImage}
            className={input}
          />
        </Field>
      </div>
      <SaveButton />
    </form>
  );
}

function WhyUsForm({ whyUs }: { whyUs: HomeSections["whyUs"] }) {
  const a = whyUs.stats[0] ?? HOME_FALLBACK.whyUs.stats[0];
  const b = whyUs.stats[1] ?? HOME_FALLBACK.whyUs.stats[1];
  return (
    <form
      action={saveHomeSection}
      className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-6"
    >
      <input type="hidden" name="section" value="whyUs" />
      <div>
        <h2 className="text-lg font-semibold">Neden biz</h2>
        <p className="mt-1 text-sm text-[#466254]">
          Fotoğraf + kayan metin + sayaçlar.
        </p>
      </div>
      <Field label="Etiket">
        <input name="label" defaultValue={whyUs.label} className={input} />
      </Field>
      <Field label="Metin">
        <textarea name="text" rows={4} defaultValue={whyUs.text} className={input} />
      </Field>
      <Field label="Görsel yolu">
        <input name="image" defaultValue={whyUs.image} className={input} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {[a, b].map((stat, i) => (
          <div key={i} className="rounded-xl bg-[#f7f9f8] p-3">
            <p className="text-xs font-semibold text-[#466254]">Sayaç {i + 1}</p>
            <input type="hidden" name={`stat${i + 1}_icon`} value={stat.icon} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                name={`stat${i + 1}_value`}
                type="number"
                defaultValue={stat.value}
                className={input}
              />
              <input
                name={`stat${i + 1}_suffix`}
                defaultValue={stat.suffix}
                className={input}
              />
              <input
                name={`stat${i + 1}_label`}
                defaultValue={stat.label}
                className={`${input} col-span-3`}
              />
            </div>
          </div>
        ))}
      </div>
      <SaveButton />
    </form>
  );
}

function CopyForm({
  section,
  title,
  hint,
  data,
  showDescription,
  showCta,
}: {
  section: string;
  title: string;
  hint: string;
  data: HomeSections["leadForm"];
  showDescription?: boolean;
  showCta?: boolean;
}) {
  return (
    <form
      action={saveHomeSection}
      className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-6"
    >
      <input type="hidden" name="section" value={section} />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[#466254]">{hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Etiket">
          <input name="kicker" defaultValue={data.kicker} className={input} />
        </Field>
        <Field label="Başlık">
          <input name="title" defaultValue={data.title} className={input} />
        </Field>
      </div>
      {showDescription ? (
        <Field label="Açıklama">
          <textarea
            name="description"
            rows={3}
            defaultValue={data.description ?? ""}
            className={input}
          />
        </Field>
      ) : null}
      {showCta ? (
        <Field label="Link metni">
          <input
            name="cta_label"
            defaultValue={data.ctaLabel ?? ""}
            className={input}
          />
        </Field>
      ) : null}
      <SaveButton />
    </form>
  );
}

function BannerForm({ banner }: { banner: HomeSections["banner"] }) {
  return (
    <form
      action={saveHomeSection}
      className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-6"
    >
      <input type="hidden" name="section" value="banner" />
      <div>
        <h2 className="text-lg font-semibold">Alt banner fotoğrafı</h2>
        <p className="mt-1 text-sm text-[#466254]">
          Tedaviler kayınca görünen tam ekran ameliyathane görseli.
        </p>
      </div>
      <Field label="Görsel yolu">
        <input name="image" defaultValue={banner.image} className={input} />
      </Field>
      <Field label="Alt metin">
        <input name="alt" defaultValue={banner.alt} className={input} />
      </Field>
      <SaveButton />
    </form>
  );
}
