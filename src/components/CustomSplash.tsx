'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function SplashContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      {/* Logo */}
      <motion.img
        src="/hope_splash.png"
        alt="HopeHype Logo"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
        style={{
          width: '120px',
          height: '120px',
          objectFit: 'contain',
        }}
        onError={() => console.warn('Logo splash gagal dimuat')}
      />

      {/* Spinner */}
      <motion.div
        style={{
          width: '30px',
          height: '30px',
          border: '4px solid rgba(31, 60, 255, 0.2)',
          borderTop: '4px solid #1f3cff',
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: '#888888',
            fontWeight: 600,
            letterSpacing: '1px',
          }}
        >
          from
        </span>
        <span
          style={{
            fontSize: '18px',
            color: '#1f3cff',
            fontWeight: 900,
            letterSpacing: '2px',
            marginTop: '4px',
          }}
        >
          HYPECO
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function CustomSplash() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
      if (!hasSeenSplash) {
        setIsVisible(true);
        sessionStorage.setItem('hasSeenSplash', 'true');
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      // Jika sessionStorage tidak tersedia (misal di SSR atau browser tertentu)
      setIsVisible(false);
    }
  }, []);

  if (isVisible === null || isVisible === false) return null;

  return (
    <AnimatePresence>
      {isVisible && <SplashContent />}
    </AnimatePresence>
  );
}