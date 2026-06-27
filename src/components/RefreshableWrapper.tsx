'use client';

import React, { useState, useRef, ReactNode, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import refreshAnimation from '@/assets/lottie/refres.json';

interface RefreshableWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export default function RefreshableWrapper({ children, onRefresh }: RefreshableWrapperProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const startY = useRef(0);
  const isAtTop = useRef(true);

  // Fungsi untuk update frame Lottie berdasarkan tarikan jari (0 sampai 100%)
  const updateLottieFrame = (distance: number) => {
    if (!lottieRef.current) return;
    
    // Normalisasi jarak: misalnya 0px - 100px menjadi 0.0 - 1.0 (frame 0% - 100%)
    const progress = Math.min(distance / 100, 1);
    const totalFrames = lottieRef.current.getDuration(true);
    const frame = progress * totalFrames;
    
    lottieRef.current.goToAndStop(frame, true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTop.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      const dampenedDistance = Math.min(distance * 0.5, 120); // Maksimal 120px
      setPullDistance(dampenedDistance);
      updateLottieFrame(dampenedDistance); // 🔥 Animasi ikut gerak di sini
    }
  };

  const handleTouchEnd = async () => {
    startY.current = 0;
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      // Mainkan animasi secara normal saat loading
      lottieRef.current?.play(); 
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div onTouchStart={(e) => startY.current = e.touches[0].clientY} 
         onTouchMove={handleTouchMove} 
         onTouchEnd={handleTouchEnd}
         style={{ position: 'relative', width: '100%' }}>
      
      <div style={{ height: pullDistance, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '60px', height: '60px' }}>
          <Lottie 
            lottieRef={lottieRef} // 🔥 Sambungkan ke ref
            animationData={refreshAnimation} 
            loop={isRefreshing} // Loop hanya saat loading
            autoplay={false}    // Kita kontrol manual via frame
          />
        </div>
      </div>

      {children}
    </div>
  );
}
