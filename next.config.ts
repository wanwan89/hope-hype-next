import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },

  // 🔥 OBAT KUAT BUAT TERMUX BIAR GAK CRASH 🔥
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // 🔥 TAMBAHAN BARU: MATIIN FITUR KOMPRES BIAR RAM HP LEGA 🔥
  swcMinify: false, 

  webpack: (config) => {
    config.cache = false; // Bungkam error cache
    config.optimization.minimize = false; // 🔥 BUNGKAM TERSER BIAR GAK PINGSAN!
    return config;
  },
};

export default withPWA(nextConfig);
