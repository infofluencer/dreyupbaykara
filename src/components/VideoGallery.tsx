"use client";

import { motion } from "framer-motion";

const VIDEOS = [
  {
    id: "reel-DYpmtdTBQrc",
    thumb: "/hero/instagram/reel-DYpmtdTBQrc.jpg",
    title: "Full Endoskopik Bel Fıtığı Ameliyatı",
    desc: "5 milimetrelik tek girişten, kas kesmeden, aynı gün taburcu.",
    url: "https://www.instagram.com/reel/DYpmtdTBQrc/",
  },
  {
    id: "post-DNGq36fuxkG",
    thumb: "/hero/instagram/post-DNGq36fuxkG.jpg",
    title: "Boyun Fıtığı — Endoskopik Yaklaşım",
    desc: "Kola vuran boyun ağrısında milimetrik girişle sinir baskısı gideriliyor.",
    url: "https://www.instagram.com/p/DNGq36fuxkG/",
  },
  {
    id: "post-DWo4I_ghjgO",
    thumb: "/hero/instagram/post-DWo4I_ghjgO.jpg",
    title: "Kanal Darlığı Ameliyatı Süreci",
    desc: "Platin olmadan dekompresyon ile yürüme mesafesinde belirgin artış.",
    url: "https://www.instagram.com/p/DWo4I_ghjgO/",
  },
  {
    id: "reel-DOgy7JVDAa6",
    thumb: "/hero/instagram/reel-DOgy7JVDAa6.jpg",
    title: "Nükleoplasti Sonrası Kalıcı Çözüm",
    desc: "Üç kez sonuç alınamayan tedavi sonrası full endoskopik ameliyatla dakikalar içinde rahatlama.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DOgy7JVDAa6/",
  },
  {
    id: "reel-DEIh4vpIMZp",
    thumb: "/hero/instagram/reel-DEIh4vpIMZp.jpg",
    title: "Bel Fıtığında Endoskopik Yaklaşım",
    desc: "Bel fıtığı tedavisinde minimal invaziv yaklaşımın hasta konforuna etkisini anlatan reel.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DEIh4vpIMZp/",
  },
  {
    id: "reel-DPWyN1yDJOi",
    thumb: "/hero/instagram/reel-DPWyN1yDJOi.jpg",
    title: "Bel, Boyun Fıtığı ve Kanal Darlığı",
    desc: "Ameliyat düzeyine gelmiş hastalarda full endoskopik yöntemle hızlı iyileşme ve erken taburculuk.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DPWyN1yDJOi/",
  },
  {
    id: "reel-Da0p51xg6Xg",
    thumb: "/hero/instagram/reel-Da0p51xg6Xg.jpg",
    title: "Yürümeyi Zorlaştıran Bel Fıtığı ve Kanal Darlığı",
    desc: "Bel fıtığı ve kanal darlığına bağlı yürüyememe şikayetinde minimal invaziv çözüm yaklaşımı.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/Da0p51xg6Xg/",
  },
  {
    id: "reel-DXzde1cszGk",
    thumb: "/hero/instagram/reel-DXzde1cszGk.jpg",
    title: "Bel Fıtıklarının Büyük Bölümünde Ameliyatsız Tedavi",
    desc: "Hangi hastalarda ameliyatsız yaklaşım yeterli olur, hangi noktada cerrahi gerekir sorusuna kısa açıklama.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DXzde1cszGk/",
  },
  {
    id: "reel-DXcW45PANjc",
    thumb: "/hero/instagram/reel-DXcW45PANjc.jpg",
    title: "İleri Düzey Kanal Darlığında Platinsiz Yaklaşım",
    desc: "İki seviyeli kanal darlığında platin önermeden yapılan full endoskopik tedavi örneği.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DXcW45PANjc/",
  },
  {
    id: "reel-DUtSl19DJ2i",
    thumb: "/hero/instagram/reel-DUtSl19DJ2i.jpg",
    title: "Patlamış Bel Fıtığında Tam Kapalı Yöntem",
    desc: "Patlamış bel fıtığında 4-5 mm girişle uygulanan full endoskopik cerrahi ve hızlı iyileşme süreci.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DUtSl19DJ2i/",
  },
  {
    id: "reel-DTyETquDIMi",
    thumb: "/hero/instagram/reel-DTyETquDIMi.jpg",
    title: "Omurilik Kanal Darlığında Platinsiz Tedavi",
    desc: "Kanal darlığında tam kapalı, platinsiz yaklaşımın avantajlarını anlatan bilgilendirici reel.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DTyETquDIMi/",
  },
];

function PlayIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="22" fill="white" fillOpacity="0.92" />
      <path d="M18 14.5l14 7.5-14 7.5V14.5z" fill="#0b6b45" />
    </svg>
  );
}

const LOOP_VIDEOS = [...VIDEOS, ...VIDEOS];

export function VideoGallery() {
  return (
    <section
      id="instagram"
      className="relative z-10 overflow-hidden px-6 pb-8 pt-16 md:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent-glow">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
              </svg>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-glow">
                Instagram
              </p>
            </div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              @doktoreyupbaykara
            </h2>
          </div>

          <a
            href="https://www.instagram.com/doktoreyupbaykara/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#0b6b45]/20 px-4 py-2 text-sm font-medium text-[#0b6b45] transition hover:border-[#0b6b45] hover:bg-[#f4fbf7] sm:px-5 sm:py-2.5"
          >
            Takip Et
          </a>
        </motion.div>

        <div className="relative -mx-6 overflow-x-clip md:-mx-10 lg:-mx-16">
          <motion.div
            className="flex w-max gap-4 px-6 sm:gap-5 md:px-10 lg:px-16"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 42,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            {LOOP_VIDEOS.map((v, i) => (
              <motion.a
                key={`${v.id}-${i}`}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.6,
                  delay: Math.min(i, 7) * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group block w-[min(16.5rem,78vw)] shrink-0 overflow-hidden rounded-[1.4rem] border-2 border-[#0b6b45]/25 bg-white shadow-sm transition duration-300 hover:border-[#0b6b45] hover:shadow-[0_8px_28px_rgba(11,107,69,0.12)] sm:w-[18.5rem]"
                aria-label={v.title}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "9/13" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumb}
                    alt={v.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-75 transition duration-300 group-hover:opacity-100">
                    <div className="transition duration-300 group-hover:scale-110">
                      <PlayIcon />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-[14px] font-semibold leading-snug text-[#123524] transition duration-200 group-hover:text-[#0b6b45]">
                    {v.title}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b]">
                    {v.desc}
                  </p>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
