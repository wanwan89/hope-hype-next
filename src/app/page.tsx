// src/app/page.tsx
import React from 'react'; // 🔥 TAMBAHKAN INI DI BARIS PALING ATAS 🔥
import { Metadata } from 'next';
import Gallery from '@/components/post/Gallerypost';

// 🔥 FIX PAGESPEED: Ini yang bakal dibaca langsung sama Googlebot sebelum web lu beres loading 🔥
export const metadata: Metadata = {
  title: 'HypeTalk - Creative Community',
  description: 'Tempat berbagi karya, cerita, dan ngobrol seru bareng kreator lain di HypeTalk.',
};

/**
 * HomePage sekarang bener-bener bersih.
 * Modal (Comment, Post, Gift) sudah ditangani secara global 
 * di layout.tsx lewat komponen Overlays.
 */

export default function HomePage() {
  return (
    <main>
      <Gallery />
    </main>
  );
}
