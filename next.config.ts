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

// 🔥 UPDATE CSP SULTAN: Apple, Stiker, & Cloudflare (Turnstile/Analytics) siap tempur!
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://app.sandbox.midtrans.com https://app.midtrans.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://ui-avatars.com https://res.cloudinary.com https://*.mzstatic.com https://*.apple.com https://*.tenor.com https://*.giphy.com https://imagedelivery.net;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://app.sandbox.midtrans.com https://app.midtrans.com https://itunes.apple.com https://*.apple.com https://*.tenor.com https://tenor.googleapis.com https://*.giphy.com https://cloudflareinsights.com https://challenges.cloudflare.com;
    frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com https://challenges.cloudflare.com;
    media-src 'self' https://*.supabase.co https://res.cloudinary.com https://*.mzstatic.com https://*.apple.com https://*.tenor.com https://*.giphy.com blob: data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`.replace(/\n/g, "");

const nextConfig: NextConfig = {
  turbopack: {}, 
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
