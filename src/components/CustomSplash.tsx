'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function SplashContent({ onFinish }: { onFinish: () => void }) {
  const [drawComplete, setDrawComplete] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'shift'>('intro');

  // Trigger pergeseran setelah drawing selesai
  useEffect(() => {
    if (drawComplete) {
      const t = setTimeout(() => setPhase('shift'), 400);
      return () => clearTimeout(t);
    }
  }, [drawComplete]);

  // Setelah fase shift + animasi teks selesai (estimasi 1.5 detik), panggil onFinish
  useEffect(() => {
    if (phase === 'shift') {
      const t = setTimeout(() => {
        onFinish();
      }, 1500); // waktu cukup untuk animasi teks
      return () => clearTimeout(t);
    }
  }, [phase, onFinish]);

  const logoVariants = {
    intro: { x: 0, scale: 1, opacity: 1 },
    shift: { x: -60, scale: 0.9, transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] } },
  };

  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.08,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 30, rotateX: -70 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.7, ease: [0.215, 0.61, 0.355, 1] },
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
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        flexDirection: 'row',
        padding: '0 30px',
      }}
    >
      {/* Logo SVG dengan drawing + pergeseran */}
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        variants={logoVariants}
        animate={phase}
        style={{
          width: '100px',
          height: '100px',
          color: 'var(--text-main)',
          flexShrink: 0,
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: phase === 'intro' ? 1 : 0.9, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
      >
        <motion.path
          d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeInOut' }}
          onAnimationComplete={() => setDrawComplete(true)}
        />
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

      {/* Teks HYPECO */}
      <motion.div
        variants={textContainerVariants}
        initial="hidden"
        animate={phase === 'shift' ? 'visible' : 'hidden'}
        style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}
      >
        <span style={{ fontSize: '12px', color: '#888888', fontWeight: 600, letterSpacing: '1px', marginRight: '6px' }}>
          <motion.span variants={letterVariants} style={{ display: 'inline-block' }}>f</motion.span>
          <motion.span variants={letterVariants} style={{ display: 'inline-block' }}>r</motion.span>
          <motion.span variants={letterVariants} style={{ display: 'inline-block' }}>o</motion.span>
          <motion.span variants={letterVariants} style={{ display: 'inline-block' }}>m</motion.span>
        </span>
        <span style={{ display: 'inline-flex' }}>
          {'HYPECO'.split('').map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariants}
              style={{
                display: 'inline-block',
                fontSize: '28px',
                color: '#1f3cff',
                fontWeight: 900,
                letterSpacing: '1px',
              }}
            >
              {char}
            </motion.span>
          ))}
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
      setIsVisible(false);
    }
  }, []);

  const handleFinish = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Tidak perlu timer lagi, onFinish dari dalam yang menutup
  return (
    <AnimatePresence>
      {isVisible && <SplashContent onFinish={handleFinish} />}
    </AnimatePresence>
  );
}