import Link from "next/link";
import { Check } from "lucide-react";
import type { Treatment } from "@/data/treatments";
import { getRelatedTreatments } from "@/data/treatments";
import { PageHero } from "@/components/PageHero";
import { ComparisonCard } from "./ComparisonCard";
import { ProcessSteps } from "./ProcessSteps";
import { StatCards } from "./StatCards";
import { SymptomCards } from "./SymptomCards";
import { TreatmentFaq } from "./TreatmentFaq";
import { TreatmentHeroVideo } from "./TreatmentHeroVideo";
import { TreatmentShorts } from "./TreatmentShorts";
import { TreatmentSidebar } from "./TreatmentSidebar";
import { VectorPattern } from "@/components/VectorPattern";

export function TreatmentDetailView({ treatment }: { treatment: Treatment }) {
  const related = getRelatedTreatments(treatment.slug);

  return (
    <div className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title={treatment.h1}
        description={treatment.heroSubtitle}
        cta={{ label: "Randevu Al", href: "/iletisim" }}
        media={
          <TreatmentHeroVideo
            youtubeId={treatment.youtubeId}
            title={treatment.h1}
          />
        }
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

      <div className="relative">
        <VectorPattern tone="light" opacity={0.035} size={400} />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-14 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
            {/* ANA İÇERİK */}
            <div className="min-w-0 space-y-12 md:space-y-16">
              {/* About service */}
              <section aria-labelledby="about-service-title">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
                  Tedavi hakkında
                </p>
                <h2
                  id="about-service-title"
                  className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl"
                >
                  {treatment.whatIsIt.title}
                </h2>
                <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
                  <div className="space-y-5 text-base leading-8 text-[#466254] sm:text-[17px]">
                    {treatment.intro.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>

                  {treatment.advantages.length > 0 ? (
                    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                      {treatment.advantages.map((item) => (
                        <li
                          key={item.title}
                          className="flex items-start gap-3 text-[15px] font-medium text-[#244233]"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0b6b45]/12">
                            <Check
                              className="h-3.5 w-3.5 text-[#0b6b45]"
                              aria-hidden
                            />
                          </span>
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>

              <SymptomCards items={treatment.symptoms.items} />

              <ComparisonCard data={treatment.comparison} />

              <section aria-labelledby="method-title">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
                  Yöntem
                </p>
                <h2
                  id="method-title"
                  className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl"
                >
                  {treatment.method.title}
                </h2>
                <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
                  <div className="space-y-5 text-base leading-8 text-[#466254] sm:text-[17px]">
                    {treatment.whatIsIt.body.slice(0, 2).map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                    {treatment.method.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </section>

              <ProcessSteps steps={treatment.processSteps} />

              {treatment.shorts.length > 0 ? (
                <TreatmentShorts shorts={treatment.shorts} />
              ) : null}

              <StatCards items={treatment.stats} />

              {treatment.faq && treatment.faq.length > 0 ? (
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
                    SSS
                  </p>
                  <h2 className="mb-6 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl">
                    Sıkça sorulan sorular
                  </h2>
                  <TreatmentFaq items={treatment.faq} />
                </section>
              ) : null}

              {/* Alt CTA band */}
              <div className="overflow-hidden rounded-2xl bg-[#123524] px-6 py-8 text-white sm:px-8 sm:py-10">
                <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
                  Bu tedavi sizin için uygun mu?
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#c9dccf]">
                  Değerlendirme için randevu alın; muayene ve görüntüleme
                  sonrasında size en uygun yaklaşım netleşir.
                </p>
                <Link
                  href="/iletisim"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#fdfaf5] px-7 py-3 text-sm font-semibold text-[#123524] transition hover:bg-white"
                >
                  Randevu Al
                </Link>
              </div>
            </div>

            {/* SIDEBAR */}
            <TreatmentSidebar related={related} />
          </div>
        </div>
      </div>
    </div>
  );
}
