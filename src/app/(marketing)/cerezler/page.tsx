import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { VectorPattern } from "@/components/VectorPattern";
import { CookiePreferencesButton } from "@/components/layouts/footer/cookie-preferences-button";
import { PAGE_SEO } from "@/data/seo";

export const metadata: Metadata = {
  title: PAGE_SEO.cerezler.title,
  description: PAGE_SEO.cerezler.description,
  alternates: { canonical: "/cerezler" },
};

const CATEGORIES = [
  {
    title: "Zorunlu çerezler",
    body: "Sitenin güvenli ve düzgün çalışması, oturum ve çerez tercihlerinizin saklanması için gereklidir. Bu çerezler olmadan site temel işlevlerini sunamaz; bu nedenle kapatılamaz.",
  },
  {
    title: "Fonksiyonel çerezler",
    body: "Tercihlerinizi hatırlayan ve site deneyimini kolaylaştıran isteğe bağlı özellikler için kullanılır. Yalnızca onayınız varsa çalışır.",
  },
  {
    title: "Analitik çerezler",
    body: "Sayfa görüntüleme, gezinme ve performans ölçümü için kullanılır. Google Analytics 4 ve Microsoft Clarity bu kategoriye girer. Onay vermezseniz bu araçlar yüklenmez.",
  },
  {
    title: "Pazarlama çerezleri",
    body: "Reklam ölçümü, dönüşüm takibi ve yeniden pazarlama için kullanılır. Meta Pixel, TikTok Pixel ve Google Ads bu kategoriye girer. Onay vermezseniz bu pikseller yüklenmez.",
  },
] as const;

export default function CerezlerPage() {
  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title="Çerez politikası"
        description={PAGE_SEO.cerezler.snippet}
        cta={false}
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Çerez politikası", href: "/cerezler" },
        ]}
      />

      <section className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-14">
          <div className="blog-prose">
            <p>
              Bu politika, Op. Dr. Eyüp Baykara / Endospine İstanbul web
              sitesinde kullanılan çerezleri ve benzeri izleme teknolojilerini
              açıklar. Tercihleriniz{" "}
              <code className="rounded bg-[#0b6b45]/10 px-1.5 py-0.5 text-[0.9em] text-[#123524]">
                eyupbaykara_cookie_consent
              </code>{" "}
              adlı birinci taraf çerezde 180 gün saklanır.
            </p>

            <h2>Onay modeli</h2>
            <p>
              İlk ziyaretinizde çerez banner’ı görünür. Tümünü kabul edebilir,
              tüm isteğe bağlı kategorileri reddedebilir veya kategorileri tek
              tek seçebilirsiniz. Tercihiniz kaydedildikten sonra banner
              gizlenir. İstediğiniz zaman footer’daki{" "}
              <strong>Çerez tercihlerini güncelle</strong> bağlantısından veya
              aşağıdaki butondan paneli yeniden açabilirsiniz.
            </p>
            <p>
              <CookiePreferencesButton className="font-semibold text-[#0b6b45] underline-offset-2 hover:underline" />
            </p>

            <h2>Çerez kategorileri</h2>
            {CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3>{category.title}</h3>
                <p>{category.body}</p>
              </div>
            ))}

            <h2>Üçüncü taraf araçlar</h2>
            <p>
              Aşağıdaki araçlar yalnızca ilgili kategori için onay verdiyseniz
              yüklenir. Ayrıca Google Consent Mode v2 kullanılır: onay
              verilmeden önce depolama sinyalleri varsayılan olarak{" "}
              <em>denied</em> gönderilir.
            </p>
            <ul>
              <li>
                <strong>Google Tag Manager</strong> — kapsayıcı; içindeki
                etiketler Consent Mode sinyallerine uyar.
              </li>
              <li>
                <strong>Google Analytics 4</strong> — analitik.
              </li>
              <li>
                <strong>Microsoft Clarity</strong> — analitik / oturum
                içgörüsü.
              </li>
              <li>
                <strong>Meta Pixel</strong> — pazarlama.
              </li>
              <li>
                <strong>TikTok Pixel</strong> — pazarlama.
              </li>
              <li>
                <strong>Google Ads</strong> — pazarlama / dönüşüm (AW etiketi +
                GTM).
              </li>
            </ul>
            <p>
              Analitik veya pazarlama onayını daha sonra kapatırsanız sayfa
              yenilenir; tarayıcıda kalmış üçüncü taraf çerezlerin
              temizlenmesi için bu yenileme gereklidir. Tarayıcı ayarlarından
              da çerezleri silebilirsiniz.
            </p>

            <h2>Haklarınız</h2>
            <p>
              6698 sayılı KVKK ve GDPR kapsamında çerezler aracılığıyla işlenen
              kişisel verilere ilişkin bilgilendirme, erişim, düzeltme, silme
              ve onayınızı geri çekme haklarınız vardır. Onayınızı bu sayfadaki
              tercih paneliyle dilediğiniz an değiştirebilirsiniz.
            </p>

            <h2>İletişim</h2>
            <p>
              Çerezler ve kişisel veriler hakkında sorularınız için{" "}
              <a href="mailto:info@endospineistanbul.com">
                info@endospineistanbul.com
              </a>{" "}
              adresine yazabilir veya{" "}
              <Link href="/iletisim">iletişim sayfasını</Link> kullanabilirsiniz.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
