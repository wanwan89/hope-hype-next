'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function CustomSplash() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Splash screen bakal tayang selama 2.5 detik, habis itu ngilang
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

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
            background: '#FFFFFF', // 🔥 Background diubah jadi Putih Solid
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* 🔥 LOGO PNG LU 🔥 */}
          <motion.img
            // Pastiin URL ini bener ngarah ke lokasi gambar hope_splash.png lu
            src="/hope_splash.png" 
            alt="HopeHype Logo"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
            style={{
              width: '120px', 
              height: '120px',
              objectFit: 'contain',
              marginBottom: '20px',
              // Drop shadow tipis biar logonya agak "ngambang" di background putih
              filter: 'drop-shadow(0px 10px 20px rgba(31, 60, 255, 0.15))' 
            }}
          />

          {/* Animasi Teks Tengah */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              color: '#121212', // 🔥 Teks dibikin gelap karena background putih
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '1px',
              margin: 0
            }}
          >
            HopeHype
          </motion.h1>

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
