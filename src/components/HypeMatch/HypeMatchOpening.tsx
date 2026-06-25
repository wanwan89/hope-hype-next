import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HypeMatchOpening() {
  // State untuk mengontrol durasi loading
  const [isLoading, setIsLoading] = useState(true);

  // Efek untuk menghilangkan loading screen setelah 4 detik (4000 milidetik)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => clearTimeout(timer); // Membersihkan timer jika komponen di-unmount
  }, []);

  // Palet warna (Background diubah menjadi biru pekat sesuai gambar 1000607729.jpg)
  const bgColor = '#0000cc'; // Biru pekat
  const textColor = '#f8ebd4'; // Krem teks (dipertahankan dari desain sebelumnya)

  // Konfigurasi animasi container untuk efek berurutan (stagger)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  // Konfigurasi animasi per baris kata dengan efek spring (membal)
  const wordVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 14,
        stiffness: 120,
      },
    },
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          /* Tambahan animasi exit agar memudar perlahan saat 4 detik selesai */
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: bgColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
            
            .hm-chunky-text {
              font-family: 'Titan One', 'Arial Black', Impact, sans-serif;
              color: ${textColor};
              font-size: 5rem;
              line-height: 0.8;
              letter-spacing: -2px;
              margin: 0;
              text-transform: lowercase;
              position: relative;
              z-index: 10;
            }

            .hm-dot {
              position: absolute;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              z-index: -1;
            }

            @media (max-width: 768px) {
              .hm-chunky-text {
                font-size: 3.5rem;
              }
              .hm-dot {
                width: 14px;
                height: 14px;
              }
            }
          `}</style>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {/* Baris 1: hype */}
            <motion.div variants={wordVariants} className="hm-chunky-text" style={{ marginLeft: '0px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fcd34d', top: '-5px', left: '-15px' }}></span>
              hype
            </motion.div>

            {/* Baris 2: match */}
            <motion.div variants={wordVariants} className="hm-chunky-text" style={{ marginLeft: '40px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fb923c', top: '15px', right: '-25px' }}></span>
              match
            </motion.div>

            {/* Baris 3: make a */}
            <motion.div variants={wordVariants} className="hm-chunky-text" style={{ marginLeft: '-15px', marginTop: '10px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#4ade80', top: '25px', left: '-25px' }}></span>
              make a
            </motion.div>

            {/* Baris 4: friend */}
            <motion.div variants={wordVariants} className="hm-chunky-text" style={{ marginLeft: '60px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#f472b6', top: '-10px', left: '35%' }}></span>
              friend
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
