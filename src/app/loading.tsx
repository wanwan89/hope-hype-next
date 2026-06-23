'use client';

import { motion } from 'framer-motion';

export default function GlobalLoading() {
  const color1 = '#1f3cff'; // Biru tema
  const color2 = '#ff4757'; // Merah tema

  const dotSize = 14; // ukuran dot (px)
  const containerWidth = 80; // lebar area gerak horizontal

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'transparent', // 🔥 Background transparan
      }}
    >
      {/* Wadah animasi horizontal */}
      <div
        style={{
          position: 'relative',
          width: `${containerWidth}px`,
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* --- Dot Biru (bergerak dari kiri ke kanan) --- */}
        <motion.div
          style={{
            width: dotSize,
            height: dotSize,
            background: color1,
            borderRadius: '50%',
            position: 'absolute',
            left: 0,
            boxShadow: `0 0 12px ${color1}80`,
          }}
          animate={{
            x: [0, containerWidth - dotSize, 0],
            scale: [1, 1.6, 1], // 🔥 Membesar saat di tengah (tabrakan)
          }}
          transition={{
            duration: 1.3,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.5, 1],
          }}
        />

        {/* --- Dot Merah (bergerak dari kanan ke kiri) --- */}
        <motion.div
          style={{
            width: dotSize,
            height: dotSize,
            background: color2,
            borderRadius: '50%',
            position: 'absolute',
            right: 0,
            boxShadow: `0 0 12px ${color2}80`,
          }}
          animate={{
            x: [0, -(containerWidth - dotSize), 0],
            scale: [1, 1.6, 1],
          }}
          transition={{
            duration: 1.3,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.5, 1],
          }}
        />
      </div>
    </div>
  );
}