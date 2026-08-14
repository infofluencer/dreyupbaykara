import type { NextConfig } from "next";

/** Sürüm sorgusuyla (`?v=`) yayınlanan varlıklar — değişince sorgu artırılır. */
const IMMUTABLE = "public, max-age=31536000, immutable";
/** Deploy ile değişen görseller: 7 gün taze, sonrası arka planda yenilenir. */
const STATIC_ASSET = "public, max-age=604800, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // AVIF kodlaması tek konteynerde ilk isteği yavaşlatıyor; WebP yeterli kazanç veriyor.
    formats: ["image/webp"],
    minimumCacheTTL: 604800,
    /*
      2048/3840 varyantları kaldırıldı: retina ekranda tam genişlik görseller
      kaynaktan büyük dosyalar üretiyordu (drtv.webp 3840w'de 144KB, orijinali
      124KB). 1920 bu site için tavan; hem bant genişliği hem de sunucunun
      ürettiği varyant sayısı azalıyor.
    */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    qualities: [65, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "endospineistanbul.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
      {
        /*
          Host'u `NEXT_PUBLIC_SUPABASE_URL`den türetmiyoruz: `remotePatterns`
          build sırasında sabitleniyor, Dockerfile ise build'e hiçbir
          NEXT_PUBLIC_* değişkeni geçirmiyor. Env yoksa CMS görselleri
          optimizasyondan 400 dönerdi. Yol kısıtı public storage ile sınırlı.
        */
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/hero/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET }],
      },
      {
        source: "/portfolio/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET }],
      },
      ...["/kaduseus-green.png", "/vector_dr.webp", "/drtv.webp", "/banner_dr.jpg"].map(
        (source) => ({
          source,
          headers: [{ key: "Cache-Control", value: STATIC_ASSET }],
        }),
      ),
      {
        // 3B model `?v=` ile sürümleniyor, sonsuza kadar önbelleklenebilir.
        source: "/hero/spine-hernia.glb",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dr-baykara-kimdir",
        destination: "/hakkimizda",
        permanent: true,
      },
      {
        source: "/hasta-videolari",
        destination: "/hasta-deneyimleri",
        permanent: true,
      },
      {
        source: "/hasta-hikayeleri",
        destination: "/hasta-deneyimleri",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
