'use client';

import { motion } from 'framer-motion';

export default function GlobalLoading() {
  // Warna Biru Utama (Dark Blue)
  const color1 = '#1f3cff'; 
  // Warna Biru Muda (Light Blue)
  const color2 = '#70d6ff'; 

  // Ukuran Dot
  const dotSize = '20px';
  // Jarak orbit (Radius putaran)
  const orbitRadius = 30; 

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-main, #121212)', 
      backdropFilter: 'blur(3px)', // Sedikit efek blur background
    }}>
      
      {/* --- WADAH ANIMASI UTAMA --- */}
      <div style={{
        position: 'relative',
        width: '100px',
        height: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        
        {/* Container yang berputar terus menerus.
          Waktu duration (2s) dan ease linear bikin putaran stabil dan smooth.
        */}
        <motion.div
          style={{ width: '100%', height: '100%', position: 'relative' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          
          {/* --- DOT 1 (BIRU TUA) --- */}
          <motion.div
            style={{
              width: dotSize,
              height: dotSize,
              background: color1,
              borderRadius: '50%',
              position: 'absolute',
              top: `calc(50% - (${dotSize} / 2))`,
              left: `calc(50% - (${dotSize} / 2))`,
              boxShadow: `0 0 15px ${color1}80`, // Efek glow lembut
            }}
            // Logika "Mengadu": bergerak dari kiri ke kanan melewati titik tengah
            animate={{ 
              x: [-orbitRadius, orbitRadius, -orbitRadius], 
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: "easeInOut" // Transisi smooth di ujung gerakan
            }}
          />

          {/* --- DOT 2 (BIRU MUDA) --- */}
          <motion.div
            style={{
              width: dotSize,
              height: dotSize,
              background: color2,
              borderRadius: '50%',
              position: 'absolute',
              top: `calc(50% - (${dotSize} / 2))`,
              left: `calc(50% - (${dotSize} / 2))`,
              boxShadow: `0 0 15px ${color2}80`, // Efek glow lembut
            }}
            // Logika "Mengadu": bergerak dari kanan ke kiri melewati titik tengah (berlawanan dot 1)
            animate={{ 
              x: [orbitRadius, -orbitRadius, orbitRadius], 
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />

        </motion.div>
      </div>

      {/* --- TEKS --- */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ 
          marginTop: '10px', 
          color: 'var(--text-muted, #888)', 
          fontSize: '12px', 
          fontWeight: 'bold', 
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textAlign: 'center'
        }}
      >
        Menghubungkan...
      </motion.p>

      {/* Tahan scroll body saat loading muncul */}
      <style jsx global>{`
        body {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
