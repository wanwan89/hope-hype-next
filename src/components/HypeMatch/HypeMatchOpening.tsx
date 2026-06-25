import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HypeMatchOpening() {
  // State untuk mengontrol durasi overlay secara keseluruhan
  const [isLoading, setIsLoading] = useState(true);
  // State baru untuk memunculkan tombol setelah animasi selesai
  const [showButton, setShowButton] = useState(false);

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

  // Variasi animasi untuk tombol "Go" agar muncul dengan mulus
  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // Fungsi ini dipanggil otomatis oleh Framer Motion saat animasi teks selesai
  const handleAnimationComplete = (definition: string) => {
    if (definition === 'visible') {
      // Alih-alih menutup layar, kita munculkan tombol "Go"
      setShowButton(true);
    }
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: bgColor,
            display: 'flex',
            flexDirection: 'column', // Diubah menjadi column agar tombol ada di bawah
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

            /* Styling untuk tombol Go */
            .hm-btn-go {
              margin-top: 50px;
              padding: 12px 40px;
              font-family: 'Titan One', 'Arial Black', sans-serif;
              font-size: 1.8rem;
              color: ${bgColor};
              background-color: ${textColor};
              border: none;
              border-radius: 30px;
              cursor: pointer;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .hm-btn-go:hover {
              transform: scale(1.05);
              box-shadow: 0 6px 12px rgba(0,0,0,0.4);
            }

            .hm-btn-go:active {
              transform: scale(0.95);
            }

            @media (max-width: 768px) {
              .hm-chunky-text {
                font-size: 3.5rem;
              }
              .hm-dot {
                width: 14px;
                height: 14px;
              }
              .hm-btn-go {
                margin-top: 40px;
                font-size: 1.4rem;
                padding: 10px 30px;
              }
            }
          `}</style>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onAnimationComplete={handleAnimationComplete}
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

          {/* Render tombol Go secara kondisional */}
          {showButton && (
            <motion.button
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              className="hm-btn-go"
              onClick={() => setIsLoading(false)} // Tutup overlay saat diklik
            >
              GO!
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
