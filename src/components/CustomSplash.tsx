'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Kurva kustom untuk animasi yang sangat smooth (Premium Ease-Out)
const smoothEase = [0.16, 1, 0.3, 1];

function SplashContent({ onFinish }: { onFinish: () => void }) {
  const [drawComplete, setDrawComplete] = useState(false);
  const [showText, setShowText] = useState(false);

  // Setelah outline logo selesai digambar
  useEffect(() => {
    if (drawComplete) {
      // Waktu jeda sebelum logo bergeser dan teks muncul
      const t = setTimeout(() => setShowText(true), 350);
      return () => clearTimeout(t);
    }
  }, [drawComplete]);

  // Waktu baca sebelum splash screen menghilang
  useEffect(() => {
    if (showText) {
      const t = setTimeout(() => {
        onFinish();
      }, 2200); // Sedikit diperlama agar animasi smooth-nya bisa dinikmati
      return () => clearTimeout(t);
    }
  }, [showText, onFinish]);

  // Variasi untuk container teks
  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // Stagger sangat rapat agar mengalir
        delayChildren: 0.05,   // Muncul hampir bersamaan saat logo mulai geser
      },
    },
  };

  // Variasi per huruf dengan pergerakan sumbu X yang sangat halus
  const letterVariants = {
    hidden: { opacity: 0, x: -25, filter: 'blur(2px)' }, // Tambahan efek blur tipis agar lebih sinematik
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: smoothEase },
    },
  };

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }} // Pas hilang, agak naik sedikit agar manis
      transition={{ duration: 0.6, ease: smoothEase }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'var(--bg-main, #000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        layout
        transition={{
          // KUNCI UTAMA: Membuang spring, menggunakan kurva tween yang sangat halus
          layout: { type: 'tween', ease: smoothEase, duration: 1 },
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
        }}
      >
        {/* LOGO */}
        <motion.svg
          layout
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          style={{
            width: '80px',
            height: '80px',
            color: 'var(--text-main, #fff)',
            flexShrink: 0,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: smoothEase }}
        >
          {/* Stroke drawing */}
          <motion.path
            d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            onAnimationComplete={() => setDrawComplete(true)}
          />
          {/* Fill */}
          {drawComplete && (
            <motion.path
              d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"
              fill="currentColor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: smoothEase }}
            />
          )}
        </motion.svg>

        {/* TEKS HYPECO */}
        <AnimatePresence>
          {showText && (
            <motion.div
              variants={textContainerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-flex', overflow: 'hidden' }}>
                {'HYPECO'.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    variants={letterVariants}
                    style={{
                      display: 'inline-block',
                      fontSize: '34px',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 900,
                      color: 'var(--text-main, #fff)',
                      letterSpacing: '1px',
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
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
      setIsVisible(false);
    }
  }, []);

  const handleFinish = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && <SplashContent onFinish={handleFinish} />}
    </AnimatePresence>
  );
}
