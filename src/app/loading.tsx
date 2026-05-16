'use client';

import { motion } from 'framer-motion';

export default function GlobalLoading() {
  // Warna Biru Tema Utama
  const color1 = '#1f3cff'; 
  // Warna Merah Tema Utama
  const color2 = '#ff4757'; 

  // Ukuran Dot (Diperkecil)
  const dotSize = '12px';
  // Jarak orbit (Radius putaran diperkecil)
  const orbitRadius = 15; 

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-main, #121212)', 
      backdropFilter: 'blur(3px)', // Efek blur background
    }}>
      
      {/* --- WADAH ANIMASI UTAMA (DIPERKECIL) --- */}
      <div style={{
        position: 'relative',
        width: '50px', // Setengah dari ukuran sebelumnya
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        
        {/* Container yang berputar secara ORBITAL (Smooth)
          Waktu duration (1.5s) dan ease linear bikin putaran stabil dan sangat smooth.
        */}
        <motion.div
          style={{ width: '100%', height: '100%', position: 'relative' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          
          {/* --- DOT 1 (BIRU TEMA) --- */}
          <motion.div
            style={{
              width: dotSize,
              height: dotSize,
              background: color1,
              borderRadius: '50%',
              position: 'absolute',
              top: `calc(50% - (${dotSize} / 2))`,
              left: `calc(50% - (${dotSize} / 2))`,
              boxShadow: `0 0 10px ${color1}80`, // Efek glow lembut
            }}
            // Gerakan ORBITAL melingkar: berputar mengelilingi pusat
            animate={{ 
              x: [-orbitRadius, orbitRadius, orbitRadius, -orbitRadius, -orbitRadius],
              y: [-orbitRadius, -orbitRadius, orbitRadius, orbitRadius, -orbitRadius],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear" // Linear buat orbit yang stabil
            }}
          />

          {/* --- DOT 2 (MERAH TEMA) --- */}
          <motion.div
            style={{
              width: dotSize,
              height: dotSize,
              background: color2,
              borderRadius: '50%',
              position: 'absolute',
              top: `calc(50% - (${dotSize} / 2))`,
              left: `calc(50% - (${dotSize} / 2))`,
              boxShadow: `0 0 10px ${color2}80`, // Efek glow lembut
            }}
            // Gerakan ORBITAL melingkar (berlawanan dot 1)
            animate={{ 
              x: [orbitRadius, -orbitRadius, -orbitRadius, orbitRadius, orbitRadius],
              y: [orbitRadius, orbitRadius, -orbitRadius, -orbitRadius, orbitRadius],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />

        </motion.div>
      </div>

      {/* Tahan scroll body saat loading muncul */}
      <style jsx global>{`
        body {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
