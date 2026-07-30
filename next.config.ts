import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "endospineistanbul.com",
        pathname: "/wp-content/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dr-baykara-kimdir",
        destination: "/hakkimizda",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
