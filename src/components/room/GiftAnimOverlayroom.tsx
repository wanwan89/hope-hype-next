'use client';

import './GiftAnimOverlayroom.css'; // 🔥 FIX: Import file CSS khusus overlay kado

export default function GiftAnimOverlay() {
  return (
    // Wadah ini sengaja dikosongin.
    // Nanti isinya (gambar GIF kado & teks combo) bakal di-inject 
    // secara otomatis (pake innerHTML) dari fungsi playGiftAnimation di page.tsx
    <div id="gift-anim-overlay">
      
    </div>
  );
}
