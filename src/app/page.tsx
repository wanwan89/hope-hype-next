// src/app/page.tsx
import Gallery from '@/components/post/Gallerypost';

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