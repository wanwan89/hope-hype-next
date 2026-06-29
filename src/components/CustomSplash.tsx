'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function SplashContent({ onFinish }: { onFinish: () => void }) {
  const [drawComplete, setDrawComplete] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'shift'>('intro');

  useEffect(() => {
    if (drawComplete) {
      const t = setTimeout(() => setPhase('shift'), 400);
      return () => clearTimeout(t);
    }
  }, [drawComplete]);

  useEffect(() => {
    if (phase === 'shift') {
      const t = setTimeout(() => {
        onFinish();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [phase, onFinish]);

  const logoVariants = {
    intro: { x: 0, scale: 1, opacity: 1 },
    shift: {
      x: -60,
      scale: 0.9,
      transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] },
    },
  };

  return (
    <>
      {/* Perbaikan: Import font Poppins Black (900) agar sesuai dengan gaya LottieFiles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@900&display=swap');

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: translateY(40px) rotateX(-70deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-10px) rotateX(10deg);
          }
          70% {
            transform: translateY(4px) rotateX(-4deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotateX(0);
          }
        }

        .bounce-letter {
          display: inline-block;
          opacity: 0;
          animation: bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

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
        {/* Logo SVG */}
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
            transition={{ duration: 1.4, delay: 0.2, ease: 'easeInOut' }}
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

        {/* Teks HYPECO — Font Poppins Black & letter spacing diperbaiki */}
        {phase === 'shift' && (
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ display: 'inline-flex' }}>
              {'HYPECO'.split('').map((char, i) => (
                <span
                  key={i}
                  className="bounce-letter"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    fontSize: '28px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 900, // Gunakan Black weight
                    color: 'var(--text-main)',
                    letterSpacing: '-0.5px', // Disesuaikan agar lebih rapat dan tebal
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </div>
        )}
      </motion.div>
    </>
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