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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const isAtTop = useRef(true);
  const isPulling = useRef(false);

  // ═════════════════════════════════════
  // Deteksi Scroll di dalam .tg-chat-list
  // ═════════════════════════════════════
  useEffect(() => {
    const chatList = document.querySelector('.tg-chat-list');
    if (!chatList) return;

    const handleScroll = () => {
      // Deteksi apakah konten chat list sudah di posisi paling atas
      isAtTop.current = chatList.scrollTop <= 0;
    };

    chatList.addEventListener('scroll', handleScroll);
    return () => chatList.removeEventListener('scroll', handleScroll);
  }, []);

  // Event listener untuk swipe (tetap sama)
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

  const updateLottieFrame = (distance: number) => {
    if (!lottieRef.current) return;
    const progress = Math.min(distance / 100, 1);
    const totalFrames = lottieRef.current.getDuration(true) || 60;
    const frame = progress * totalFrames;
    lottieRef.current.goToAndStop(frame, true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAtTop.current || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSwipeActive || !isAtTop.current || isRefreshing) return;

    const deltaY = e.touches[0].clientY - startY.current;
    const deltaX = Math.abs(e.touches[0].clientX - startX.current);

    // Pastikan gerakan adalah pull kebawah dan bukan scroll horizontal
    if (deltaY > 0 && deltaY > deltaX * 1.5) {
      isPulling.current = true;
      const dampenedDistance = Math.min(deltaY * 0.5, 120);
      setPullDistance(dampenedDistance);
      updateLottieFrame(dampenedDistance);
    } else if (deltaX > deltaY * 1.5) {
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling.current && pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      lottieRef.current?.play();
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    isPulling.current = false;
  };

  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div 
        style={{ 
          height: pullDistance, 
          overflow: 'hidden', 
          display: 'flex', 
          justifyContent: 'center',
          transition: isPulling.current ? 'none' : 'height 0.3s ease-out'
        }}
      >
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
