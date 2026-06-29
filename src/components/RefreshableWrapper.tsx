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
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const isAtTop = useRef(true);
  const isPulling = useRef(false);

  // ═════════════════════════════════════
  // Tangkap event dari SwipeableChatRow
  // ═════════════════════════════════════
  useEffect(() => {
    const onSwipeStart = () => setIsSwipeActive(true);
    const onSwipeEnd = () => setIsSwipeActive(false);

    window.addEventListener('swipe-start', onSwipeStart);
    window.addEventListener('swipe-end', onSwipeEnd);
    return () => {
      window.removeEventListener('swipe-start', onSwipeStart);
      window.removeEventListener('swipe-end', onSwipeEnd);
    };
  }, []);

  // ═════════════════════════════════════
  // Update frame Lottie sesuai tarikan
  // ═════════════════════════════════════
  const updateLottieFrame = (distance: number) => {
    if (!lottieRef.current) return;
    const progress = Math.min(distance / 100, 1);
    const totalFrames = lottieRef.current.getDuration(true);
    const frame = progress * totalFrames;
    lottieRef.current.goToAndStop(frame, true);
  };

  // ═════════════════════════════════════
  // Touch handlers
  // ═════════════════════════════════════
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Jika ada swipe horizontal aktif → jangan pull
    if (isSwipeActive) return;
    if (!isAtTop.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY.current;
    const deltaX = Math.abs(currentX - startX.current);

    // Hanya pull jika tarikan vertikal jauh lebih besar dari horizontal
    if (deltaY > 0 && deltaY > deltaX * 1.5) {
      if (!isPulling.current) {
        isPulling.current = true;
      }
      const dampenedDistance = Math.min(deltaY * 0.5, 120);
      setPullDistance(dampenedDistance);
      updateLottieFrame(dampenedDistance);
    } else if (deltaX > deltaY * 1.5) {
      // Gerakan dominan horizontal → batalkan pull
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleTouchEnd = async () => {
    startY.current = 0;
    startX.current = 0;
    isPulling.current = false;

    if (isSwipeActive) return;

    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      lottieRef.current?.play();
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', width: '100%' }}
    >
      <div style={{ height: pullDistance, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 60, height: 60 }}>
          <Lottie
            lottieRef={lottieRef}
            animationData={refreshAnimation}
            loop={isRefreshing}
            autoplay={false}
          />
        </div>
      </div>

      {children}
    </div>
  );
}