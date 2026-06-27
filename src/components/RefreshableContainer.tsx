'use client';

import React, { useState, useRef, ReactNode, useEffect } from 'react';
import Lottie from 'lottie-react';
// Sesuaikan path JSON lottie kamu dengan yang ada di project
import refreshAnimation from '@/assets/lottie/refres.json'; 

interface RefreshableWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export default function RefreshableWrapper({ children, onRefresh }: RefreshableWrapperProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const isAtTop = useRef(true);

  // Cek apakah posisi scroll sedang berada paling atas
  useEffect(() => {
    const handleScroll = () => {
      isAtTop.current = window.scrollY <= 0;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAtTop.current || isRefreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTop.current || isRefreshing || startY.current === 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    // Jika diusap ke bawah (distance > 0), beri efek "karet" (resistance)
    if (distance > 0) {
      // Mencegah scroll bawaan browser (jika ada) saat kita menarik ke bawah
      if (document.body.style.overscrollBehaviorY !== 'none') {
        document.body.style.overscrollBehaviorY = 'none';
      }
      setPullDistance(Math.min(distance * 0.4, 80)); // Maksimal tinggi area lottie 80px
    }
  };

  const handleTouchEnd = async () => {
    startY.current = 0;
    document.body.style.overscrollBehaviorY = 'auto'; // Kembalikan default

    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Tahan Lottie di layar

      await onRefresh(); // Tunggu fetch data selesai

      setIsRefreshing(false);
    }
    
    setPullDistance(0); // Sembunyikan Lottie
  };

  return (
    <div 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', width: '100%', minHeight: '100%' }}
    >
      {/* Area Lottie Animation */}
      <div 
        style={{ 
          height: pullDistance, 
          overflow: 'hidden', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          transition: isRefreshing || pullDistance === 0 ? 'height 0.3s ease' : 'none'
        }}
      >
        <div style={{ width: '60px', height: '60px' }}>
          <Lottie 
            animationData={refreshAnimation} 
            loop={true} 
            autoplay={isRefreshing || pullDistance > 0} 
          />
        </div>
      </div>

      {/* Konten Halaman */}
      {children}
    </div>
  );
}
