'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import './GiftAnimOverlayroom.css';

export default function GiftAnimOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [giftData, setGiftData] = useState<any>(null);

  useEffect(() => {
    // Fungsi untuk menangkap event dari page.tsx / chat room
    const handlePlayGift = (e: any) => {
      // Data gift (file json lottie) dan teks dikirim via e.detail
      setGiftData(e.detail);
      setIsVisible(true);

      // Auto-hide animasi setelah 4 detik
      const timer = setTimeout(() => {
        setIsVisible(false);
        setGiftData(null); // Bersihkan memori
      }, 4000); 

      return () => clearTimeout(timer);
    };

    window.addEventListener('showGiftAnimOverlay', handlePlayGift);
    return () => window.removeEventListener('showGiftAnimOverlay', handlePlayGift);
  }, []);

  // Jika tidak aktif, kembalikan wadah kosong yang di-hidden (atau null)
  if (!isVisible || !giftData) return null;

  return (
    <div id="gift-anim-overlay" className="in-voice-room show">
      <div className="gift-anim-content">
        
        {/* Render Animasi Lottie */}
        <div id="gift-anim-img">
          <Lottie 
            animationData={giftData.animation} 
            loop={true} 
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Teks Combo (Muncul kalau data combonya dikirim) */}
        {giftData.comboText && (
          <div id="gift-combo-text">
            {giftData.comboText}
          </div>
        )}

      </div>
    </div>
  );
}
