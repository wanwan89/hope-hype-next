'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function SplashContent({ onFinish }: { onFinish: () => void }) {
  const [drawComplete, setDrawComplete] = useState(false);
  const [showText, setShowText] = useState(false);

  // Setelah outline logo selesai digambar
  useEffect(() => {
    if (drawComplete) {
      // Tunggu sebentar untuk menampilkan fill, lalu mulai pergeseran & munculkan teks
      const t = setTimeout(() => setShowText(true), 400);
      return () => clearTimeout(t);
    }
  }, [drawComplete]);

  // Setelah teks muncul, beri waktu untuk dibaca sebelum splash screen hilang
  useEffect(() => {
    if (showText) {
      const t = setTimeout(() => {
        onFinish();
      }, 1800); // Waktu agar animasinya terasa pas dan tidak buru-buru
      return () => clearTimeout(t);
    }
  }, [showText, onFinish]);

  // Variasi untuk container teks (Staggering effect)
  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Jarak waktu muncul tiap huruf
        delayChildren: 0.1,    // Sedikit delay agar pas dengan mulainya logo bergeser
      },
    },
  };

  // Variasi untuk tiap huruf (Lebih clean, mirip LottieFiles)
  const letterVariants = {
    // Teks muncul dengan sedikit geser dari kiri dan efek fade in yang smooth
    hidden: { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }, // Curve easeOutCubic untuk rasa premium
    },
  };

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
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
      {/* Container utama menggunakan prop 'layout'. 
        Ini adalah kunci agar saat teks muncul, logo otomatis terdorong ke kiri dengan mulus! 
      */}
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
        transition={{
          layout: { type: 'spring', bounce: 0.1, duration: 0.8 }, // Membuat geserannya terasa empuk
        }}
      >
        {/* LOGO */}
        <motion.svg
          layout // Penting ditambahkan agar logo merespons layout container
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          style={{
            width: '85px', // Dikecilkan sedikit dari 100px agar proporsional sejajar dengan teks
            height: '85px',
            color: 'var(--text-main, #fff)',
            flexShrink: 0,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
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
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            onAnimationComplete={() => setDrawComplete(true)}
          />
          {/* Fill */}
          {drawComplete && (
            <motion.path
              d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"
              fill="currentColor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
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
              <span style={{ display: 'inline-flex' }}>
                {'HYPECO'.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    variants={letterVariants}
                    style={{
                      display: 'inline-block',
                      fontSize: '32px', // Ukuran font disesuaikan biar pas dengan logo 85px
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
