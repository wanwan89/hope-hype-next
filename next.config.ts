import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // 🔥 FIX UTAMA: Matiin PWA paksa biar Terser gak jalan ngebunuh RAM Termux!
  disable: true, 
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // 🔥 FIX API 404: Mati di Vercel (API nyala), Hidup di Termux (Buat APK)
  output: process.env.VERCEL ? undefined : "export",
  
  images: { unoptimized: true },

  // 🔥 OBAT KUAT: Next.js 16
  typescript: { ignoreBuildErrors: true },
  
  webpack: (config, { isServer }) => {
    config.cache = false; // Bungkam error cache di lingkungan terbatas (Termux)
    
    if (!isServer) {
      config.optimization.minimize = false; // 🔥 BUNGKAM TERSER BIAR RAM HP GAK PINGSAN
    }
    
    return config;
  },
};

export default withPWA(nextConfig);
