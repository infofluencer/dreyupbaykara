import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Play,
  Quote,
  Stethoscope,
} from "lucide-react";
import type { Treatment } from "@/data/treatments";
import {
  getRelatedTreatments,
  TREATMENT_ICONS,
} from "@/data/treatments";
import { PageHero } from "@/components/PageHero";
import { TreatmentFaq } from "./TreatmentFaq";
import { TreatmentHeroVideo } from "./TreatmentHeroVideo";

const PATIENT_STORIES = [
  {
    quote:
      "Yaklaşık üç yıldır yaşadığım bel fıtığı ve kanal daralması şikâyetlerimden Eyüp Hocam sayesinde kurtuldum.",
    name: "Deniz Öğüt",
    source: "Google yorumu",
  },
  {
    quote:
      "Ameliyat sürecini son derece kolay ve konforlu hâle getiren Eyüp Hocam’a sonsuz teşekkürlerimi sunarım.",
    name: "Hüsnü Aksoy",
    source: "Google yorumu",
  },
  {
    quote:
      "İlgisi, bilgisi ve güven veren yaklaşımı sayesinde süreci çok rahat geçirdik. Şimdi annem çok daha iyi hissediyor.",
    name: "Cengiz Yavaş",
    source: "Google yorumu",
  },
] as const;

export function TreatmentDetailView({ treatment }: { treatment: Treatment }) {
  const related = getRelatedTreatments(treatment.slug);
  const process = treatment.processSteps?.slice(0, 3) ?? [];
  const stats = treatment.stats?.slice(0, 2) ?? [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7ef] text-[#17372a]">
      <PageHero
        title={treatment.h1.replace("Full Endoskopik Tam Kapalı ", "")}
        description={treatment.heroSubtitle}
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          {
            label: treatment.navTitle.replace(
              /^Full Endoskopik Tam Kapalı\s+/i,
              "",
            ),
            href: `/tedaviler/${treatment.slug}`,
          },
        ]}
      />

      <section className="bg-[#f8faf4] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
              Tedavi hakkında
            </p>
            <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] text-[#17372a] sm:text-5xl">
              {treatment.whatIsIt.title}
            </h2>
            <div className="mt-7 space-y-4 text-[15px] leading-7 text-[#466254] sm:text-base">
              {treatment.intro.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              <p>{treatment.whatIsIt.body[0]}</p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-[#17372a]/15 pt-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-[family-name:var(--font-instrument-sans)] text-4xl font-medium tracking-[-0.04em] text-[#17372a] sm:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#466254]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 min-w-0 overflow-hidden rounded-[2rem] bg-[#17372a] p-3 lg:order-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-[1.45rem]">
              <Image
                src={treatment.image}
                alt={treatment.h1}
                fill
                sizes="(min-width: 1024px) 50vw, 94vw"
                className="max-w-full object-contain object-center"
                preload
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#17372a] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-2 lg:items-end">
            <h2 className="max-w-2xl font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Belirtiler ve tedavi kapsamı
            </h2>
            <p className="max-w-lg text-sm leading-7 text-white/60 lg:justify-self-end">
              Doğru değerlendirme, şikâyetin kaynağını anlamanın ve kişiye özel
              tedavi planı oluşturmanın ilk adımıdır.
            </p>
          </div>

          <div className="mt-3 divide-y divide-white/12">
            {treatment.symptoms.items.map((item, index) => {
              const Icon = TREATMENT_ICONS[item.icon];
              return (
                <div
                  key={item.text}
                  className="grid gap-4 py-5 sm:grid-cols-[60px_1fr] sm:items-center"
                >
                  <span className="text-sm text-white/35">
                    0{index + 1}
                  </span>
                  <div className="flex items-center gap-4">
                    <Icon className="h-5 w-5 text-[#73df68]" aria-hidden />
                    <h3 className="font-[family-name:var(--font-instrument-sans)] text-xl font-medium text-white/90 sm:text-2xl">
                      {item.text}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#eef2e8] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#dce9d5]">
              <Image
                src="/banner_dr.jpg"
                alt="Op. Dr. Eyüp Baykara ameliyathanede"
                width={1200}
                height={1400}
                sizes="(min-width: 1024px) 42vw, 92vw"
                className="aspect-[4/5] h-full w-full object-cover object-[68%_center]"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b6b45]">
                  Modern cerrahi yaklaşım
                </p>
                <p className="mt-2 font-[family-name:var(--font-instrument-sans)] text-xl font-medium">
                  4–5 mm giriş, daha hızlı günlük yaşama dönüş
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
                Sizin için önemli olanlara odaklı
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
                {treatment.method.title}
              </h2>
              <p className="mt-6 text-base leading-8 text-[#466254]">
                {treatment.method.body[0]}
              </p>

              <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-[#17372a]/10 sm:grid-cols-2">
                {treatment.advantages.slice(0, 4).map((item) => {
                  const Icon = TREATMENT_ICONS[item.icon];
                  return (
                    <div key={item.title} className="bg-[#f8faf4] p-6">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dce9d5] text-[#0b6b45]">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <h3 className="mt-5 font-[family-name:var(--font-instrument-sans)] text-lg font-medium">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#466254]">
                        {item.desc ??
                          "Kas ve çevre dokuları mümkün olduğunca korumayı hedefleyen kişiselleştirilmiş yaklaşım."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf4] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
              Üç basit adım
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Tedavi yolculuğunuz
            </h2>
            <p className="mt-5 text-base leading-7 text-[#466254]">
              Değerlendirmeden günlük yaşama dönüşe kadar açık, anlaşılır ve
              size özel bir süreç.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {process.map((step, index) => (
              <article
                key={step.title}
                className={`min-h-80 rounded-[1.75rem] p-7 sm:p-8 ${
                  index === 1
                    ? "bg-[#dce9d5]"
                    : index === 2
                      ? "bg-[#17372a] text-white"
                      : "bg-[#eef2e8]"
                }`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${
                    index === 2
                      ? "bg-[#73df68] text-[#17372a]"
                      : "bg-[#17372a] text-white"
                  }`}
                >
                  {index + 1}
                </span>
                <h3 className="mt-20 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium">
                  {step.title}
                </h3>
                <p
                  className={`mt-3 text-sm leading-7 ${
                    index === 2 ? "text-white/60" : "text-[#466254]"
                  }`}
                >
                  {step.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#dce9d5] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
                Hasta deneyimleri
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
                Gerçek hikâyeler, güven veren sonuçlar
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-[#466254] lg:justify-self-end">
              Hastalarımızın değerlendirmeleri, tedavi sürecindeki iletişim ve
              güven yaklaşımımızı yansıtıyor.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PATIENT_STORIES.map((story) => (
              <blockquote
                key={story.name}
                className="flex min-h-80 flex-col rounded-[1.75rem] bg-[#f8faf4] p-7 sm:p-8"
              >
                <Quote className="h-8 w-8 text-[#0b6b45]" aria-hidden />
                <p className="mt-8 flex-1 text-[15px] leading-7 text-[#334f40]">
                  “{story.quote}”
                </p>
                <footer className="mt-8 border-t border-[#17372a]/12 pt-5">
                  <cite className="font-[family-name:var(--font-instrument-sans)] text-base font-semibold not-italic">
                    {story.name}
                  </cite>
                  <p className="mt-1 text-xs text-[#466254]">{story.source}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf4] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="overflow-hidden rounded-[2rem] bg-[#17372a] p-4">
            <TreatmentHeroVideo
              youtubeId={treatment.youtubeId}
              title={treatment.h1}
            />
          </div>
          <div className="lg:pl-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dce9d5] text-[#0b6b45]">
              <Play className="h-5 w-5 fill-current" aria-hidden />
            </span>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
              Tedaviyi izleyin
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Yöntemi hastalarımızdan dinleyin
            </h2>
            <p className="mt-6 text-base leading-8 text-[#466254]">
              Tedavi yaklaşımı, uygulama süreci ve iyileşme dönemi hakkında
              merak ettiklerinizi hasta deneyim videolarında keşfedin.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#eef2e8] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
              Sıkça sorulan sorular
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Merak ettikleriniz
            </h2>
            <div className="mt-8 rounded-2xl bg-[#17372a] p-6 text-white">
              <Stethoscope className="h-6 w-6 text-[#73df68]" aria-hidden />
              <p className="mt-5 text-sm leading-7 text-white/65">
                Sorunuzun yanıtını bulamadınız mı? Ekibimiz size yardımcı olsun.
              </p>
              <Link
                href="/iletisim"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white"
              >
                Bize ulaşın
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="self-start rounded-[1.75rem] bg-[#f8faf4] px-6 py-3 sm:px-8">
            {treatment.faq?.length ? (
              <TreatmentFaq items={treatment.faq} />
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf4] px-5 py-20 sm:px-8 md:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
                Diğer tedaviler
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-instrument-sans)] text-4xl font-medium tracking-[-0.04em]">
                Size uygun tedaviyi keşfedin
              </h2>
            </div>
            <Link
              href="/#tedaviler"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b6b45]"
            >
              Tüm tedaviler
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/tedaviler/${item.slug}`}
                className="group relative min-h-96 overflow-hidden rounded-[1.75rem]"
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 45vw, 92vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17372a] via-[#17372a]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-7 text-white">
                  <h3 className="max-w-md font-[family-name:var(--font-instrument-sans)] text-2xl font-medium">
                    {item.navTitle.replace(
                      /^Full Endoskopik Tam Kapalı\s+/i,
                      "",
                    )}
                  </h3>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#73df68] text-[#17372a]">
                    <ArrowUpRight className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
