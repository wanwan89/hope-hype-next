import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import Lottie from 'lottie-react';
// Sesuaikan import path ini dengan lokasi file JSON kamu
import loveAnimation from '@/assets/lottie/love.json';

type HypeMatchOpeningProps = {
  onComplete?: () => void;
};

export default function HypeMatchOpening({ onComplete }: HypeMatchOpeningProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showButton, setShowButton] = useState(false);

  // 🎬 Controller untuk masing-masing grup animasi
  const topTextControls = useAnimation();
  const bottomTextControls = useAnimation();
  const lottieControls = useAnimation();

  const bgColor = '#0000cc'; 
  const textColor = '#f8ebd4'; 

  // Variasi animasi masuk untuk setiap kata
  const wordVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        delay: 0.3 + i * 0.2, // Efek stagger manual
        type: 'spring', 
        damping: 14, 
        stiffness: 120 
      },
    }),
  };

  useEffect(() => {
    // Fungsi async untuk mengatur skenario / urutan animasi
    const runAnimationSequence = async () => {
      // 1. Teks berkumpul (Animasi Masuk)
      topTextControls.start("visible");
      bottomTextControls.start("visible");

      // Tunggu animasi masuk selesai
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Teks membelah (atas & bawah) SECARA BERSAMAAN + MENGEKIL (scale: 0.85)
      // Jarak 'y' diperbesar jadi -100 dan 100 untuk mengakomodasi Lottie yang lebih besar
      topTextControls.start({ y: -100, scale: 0.85, transition: { duration: 0.6, ease: 'easeInOut' } });
      bottomTextControls.start({ y: 100, scale: 0.85, transition: { duration: 0.6, ease: 'easeInOut' } });

      // 3. Lottie muncul (Pop up)
      await lottieControls.start({
        opacity: 1,
        scale: 1,
        x: '-50%',
        y: '-50%',
        transition: { type: 'spring', damping: 12, stiffness: 100, delay: 0.2 } // delay sedikit agar smooth dengan teks yang membelah
      });

      // 4. Memunculkan tombol GO!
      setShowButton(true);
    };

    runAnimationSequence();
  }, [topTextControls, bottomTextControls, lottieControls]);

  return (
    <AnimatePresence onExitComplete={() => { if (onComplete) onComplete(); }}>
      {isVisible && (
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
            flexDirection: 'column',
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
              transform-origin: center center; /* Memastikan saat scale down, mengecilnya terpusat */
            }

            .hm-dot {
              position: absolute;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              z-index: -1;
            }

            .hm-btn-go {
              margin-top: 180px; /* Margin diperbesar lumayan jauh agar tombol agak kebawah */
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

            .hm-btn-go:hover { transform: scale(1.05); box-shadow: 0 6px 12px rgba(0,0,0,0.4); }
            .hm-btn-go:active { transform: scale(0.95); }

            @media (max-width: 768px) {
              .hm-chunky-text { font-size: 3.5rem; }
              .hm-dot { width: 14px; height: 14px; }
              .hm-btn-go { margin-top: 140px; font-size: 1.4rem; padding: 10px 30px; }
            }
          `}</style>

          {/* Wrapper Relative untuk menampung Teks dan Lottie di tengah */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            
            {/* 🔥 Lottie Love Animation (Absolute Center & Ukuran Diperbesar) */}
            <motion.div
              initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
              animate={lottieControls}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '220px', /* Ukuran diperbesar dari 140px */
                height: '220px',
                zIndex: 5, 
                pointerEvents: 'none' 
              }}
            >
              <Lottie animationData={loveAnimation} loop={true} />
            </motion.div>

            {/* Grup Atas: "hype match" */}
            <motion.div custom={0} variants={wordVariants} initial="hidden" animate={topTextControls} className="hm-chunky-text" style={{ marginLeft: '0px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fcd34d', top: '-5px', left: '-15px' }}></span>hype
            </motion.div>
            <motion.div custom={1} variants={wordVariants} initial="hidden" animate={topTextControls} className="hm-chunky-text" style={{ marginLeft: '40px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fb923c', top: '15px', right: '-25px' }}></span>match
            </motion.div>
            
            {/* Grup Bawah: "make a friend" */}
            <motion.div custom={2} variants={wordVariants} initial="hidden" animate={bottomTextControls} className="hm-chunky-text" style={{ marginLeft: '-15px', marginTop: '10px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#4ade80', top: '25px', left: '-25px' }}></span>make a
            </motion.div>
            <motion.div custom={3} variants={wordVariants} initial="hidden" animate={bottomTextControls} className="hm-chunky-text" style={{ marginLeft: '60px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#f472b6', top: '-10px', left: '35%' }}></span>friend
            </motion.div>

          </div>

          {showButton && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="hm-btn-go"
              onClick={() => setIsVisible(false)} 
            >
              GO!
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
