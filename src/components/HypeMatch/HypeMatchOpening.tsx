import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HypeMatchOpening() {
  // State untuk mengontrol durasi loading
  const [isLoading, setIsLoading] = useState(true);

  // KITA HAPUS useEffect setTimeout di sini

  const bgColor = '#0000cc'; 
  const textColor = '#f8ebd4'; 

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

  // Fungsi ini akan dipanggil otomatis oleh Framer Motion saat animasi selesai
  const handleAnimationComplete = (definition) => {
    // Pastikan yang selesai adalah animasi "visible" (animasi masuk)
    if (definition === 'visible') {
      // Setelah animasi beres, tunggu 1.5 detik agar tulisan enak dibaca, baru hilangkan layar
      setTimeout(() => {
        setIsLoading(false);
      }, 1500); 
    }
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }} // Perlambat sedikit exitnya biar lebih smooth
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
            onAnimationComplete={handleAnimationComplete} /* <-- Tambahkan trigger di sini */
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
