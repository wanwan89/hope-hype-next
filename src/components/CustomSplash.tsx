'use client';

import React, { useEffect, useState } from 'react'; // ⬅️ tambahkan React
import { motion, AnimatePresence } from 'framer-motion';

// ... sisa kode TIDAK BERUBAH sama sekali
export default function CustomSplash() {
  // 🔥 FIX: Cek sessionStorage langsung di awal state biar gak kedip pas direfresh
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
      return !hasSeenSplash; // Kalau udah ada jejaknya, langsung set false (jangan muncul)
    }
    return true; // Default saat proses render di server (SSR)
  });

  useEffect(() => {
    // Kalau isVisible udah false dari awal (karena hasil refresh), gak usah jalanin timer
    if (!isVisible) return;

    // Splash screen bakal tayang selama 2.5 detik, habis itu ngilang
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 🔥 FIX: Catat di sessionStorage kalau user udah liat splash screen-nya
      sessionStorage.setItem('hasSeenSplash', 'true');
    }, 2500);

    return () => clearTimeout(timer);
  }, [isVisible]);

  // Kalau udah gak perlu muncul, langsung return null biar elemennya hilang total dari DOM
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }} // Pas ngilang dia nge-zoom dikit biar elegan
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999, // Harus paling atas nutupin semuanya
            background: '#FFFFFF', // 🔥 Background Putih Solid
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px' // Menambahkan jarak antar elemen agar rapi
          }}
        >
          {/* 🔥 LOGO PNG (TANPA BAYANGAN) 🔥 */}
          <motion.img
            src="/hope_splash.png" 
            alt="HopeHype Logo"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
            style={{
              width: '120px', 
              height: '120px',
              objectFit: 'contain',
            }}
          />

          {/* 🔥 EFEK LOADING (SPINNER) 🔥 */}
          <motion.div
            style={{
              width: '30px',
              height: '30px',
              border: '4px solid rgba(31, 60, 255, 0.2)', // Warna latar spinner samar
              borderTop: '4px solid #1f3cff', // Warna spinner utama biru khas lu
              borderRadius: '50%'
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear' // Putaran stabil dan halus
            }}
          />

          {/* 🔥 TULISAN HYPECO DI PALING BAWAH 🔥 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{
              position: 'absolute',
              bottom: '40px', // Jarak dari ujung bawah layar
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '12px', color: '#888888', fontWeight: 600, letterSpacing: '1px' }}>
              from
            </span>
            <span style={{ fontSize: '18px', color: '#1f3cff', fontWeight: 900, letterSpacing: '2px', marginTop: '4px' }}>
              HYPECO
            </span>
          </motion.div>
          
        </motion.div>
      )}
    </AnimatePresence>
  );
}
