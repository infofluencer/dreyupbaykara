import type { Metadata } from "next";
import { PageCta, PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Hakkımızda | Op. Dr. Eyüp Baykara",
  description:
    "Op. Dr. Eyüp Baykara — full endoskopik omurga cerrahisi uzmanı. Endospine İstanbul yaklaşımı.",
  alternates: { canonical: "/hakkimizda" },
};

export default function HakkimizdaPage() {
  return (
    <PageShell
      title="Op. Dr. Eyüp Baykara"
      description="Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli."
      image="/hero/hero_dr.webp"
      imageAlt="Op. Dr. Eyüp Baykara"
      breadcrumb={[
        { label: "Anasayfa", href: "/" },
        { label: "Hakkımızda", href: "/hakkimizda" },
      ]}
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-5 text-sm leading-7 text-[#466254] sm:text-[15px]">
          <p>
            Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı olarak bel fıtığı,
            boyun fıtığı ve omurilik kanal darlığı tedavilerinde full endoskopik
            (tam kapalı) yöntemlere odaklanır.
          </p>
          <p>
            Tıp eğitimini Trakya Üniversitesi Tıp Fakültesinde tamamlamış; uzmanlık
            eğitimini Pamukkale Üniversitesi Beyin ve Sinir Cerrahisi Ana Bilim
            Dalında almıştır. Kariyeri boyunca omurga cerrahisindeki teknolojik
            gelişmeleri yakından takip ederek milimetrik girişli, doku koruyucu
            cerrahi tekniklerde uzmanlaşmıştır.
          </p>
          <p>
            Hedef; her hastaya bireyselleştirilmiş tedavi sunmak, ameliyat sonrası
            ağrıyı azaltmak ve mümkün olan en kısa sürede günlük yaşama dönüşü
            sağlamaktır. Çoğu hastada aynı gün taburcu ve hızlı mobilizasyon
            mümkündür.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Full endoskopik bel fıtığı ameliyatı</li>
            <li>Full endoskopik boyun fıtığı ameliyatı</li>
            <li>Full endoskopik kanal darlığı ameliyatı</li>
            <li>Minimal invaziv omurga cerrahisi</li>
          </ul>
          <PageCta />
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/10 bg-white shadow-[0_12px_36px_rgba(18,53,36,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/hero_dr.webp"
            alt="Op. Dr. Eyüp Baykara"
            width={900}
            height={1100}
            className="aspect-[4/5] w-full object-cover object-[center_18%]"
          />
        </div>
      </div>
    </PageShell>
  );
}
