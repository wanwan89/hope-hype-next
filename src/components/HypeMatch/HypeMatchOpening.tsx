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
        delay: 0.3 + i * 0.2,
        type: 'spring', 
        damping: 14, 
        stiffness: 120 
      },
    }),
  };

  useEffect(() => {
    const runAnimationSequence = async () => {
      // 1. Teks berkumpul (Animasi Masuk)
      topTextControls.start("visible");
      bottomTextControls.start("visible");

      // Tunggu animasi masuk selesai
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Teks membelah (atas & bawah) SECARA BERSAMAAN
      // Scale dihapus karena ukuran teks sudah kita bedakan dari awal via CSS
      topTextControls.start({ y: -100, transition: { duration: 0.6, ease: 'easeInOut' } });
      bottomTextControls.start({ y: 100, transition: { duration: 0.6, ease: 'easeInOut' } });

      // 3. Lottie muncul (Pop up)
      await lottieControls.start({
        opacity: 1,
        scale: 1,
        x: '-50%',
        y: '-50%',
        transition: { type: 'spring', damping: 12, stiffness: 100, delay: 0.2 } 
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
              line-height: 0.8;
              letter-spacing: -2px;
              margin: 0;
              text-transform: lowercase;
              position: relative;
            }

            /* Teks Atas: Ukuran lebih kecil, posisi di BELAKANG Lottie */
            .hm-text-top {
              font-size: 4rem;
              z-index: 2; 
            }

            /* Teks Bawah: Ukuran lebih besar, posisi di DEPAN Lottie */
            .hm-text-bottom {
              font-size: 5rem;
              z-index: 10; 
            }

            .hm-dot {
              position: absolute;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              z-index: -1;
            }

            .hm-btn-container {
              position: absolute;
              bottom: 12%; /* Jarak dari bawah layar */
              left: 0;
              width: 100%;
              display: flex;
              justify-content: center;
              z-index: 20;
            }

            .hm-btn-go {
              padding: 12px 40px;
              font-family: 'Titan One', 'Arial Black', sans-serif;
              font-size: 1.8rem;
              color: ${bgColor};
              background-color: ${textColor};
              border: none;
              border-radius: 30px;
              cursor: pointer;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }

            @media (max-width: 768px) {
              .hm-text-top { font-size: 3rem; }
              .hm-text-bottom { font-size: 3.8rem; }
              .hm-dot { width: 14px; height: 14px; }
              .hm-btn-go { font-size: 1.4rem; padding: 10px 30px; }
              .hm-btn-container { bottom: 10%; }
            }
          `}</style>

          {/* Wrapper Relative untuk menampung Teks dan Lottie di tengah */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            
            {/* 🔥 Lottie Love Animation (z-index: 5, berada di antara teks atas dan bawah) */}
            <motion.div
              initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
              animate={lottieControls}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '220px', 
                height: '220px',
                zIndex: 5, 
                pointerEvents: 'none' 
              }}
            >
              <Lottie animationData={loveAnimation} loop={true} />
            </motion.div>

            {/* Grup Atas: "hype match" */}
            <motion.div custom={0} variants={wordVariants} initial="hidden" animate={topTextControls} className="hm-chunky-text hm-text-top" style={{ marginLeft: '0px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fcd34d', top: '-5px', left: '-15px' }}></span>hype
            </motion.div>
            <motion.div custom={1} variants={wordVariants} initial="hidden" animate={topTextControls} className="hm-chunky-text hm-text-top" style={{ marginLeft: '40px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#fb923c', top: '15px', right: '-25px' }}></span>match
            </motion.div>
            
            {/* Grup Bawah: "make a friend" */}
            <motion.div custom={2} variants={wordVariants} initial="hidden" animate={bottomTextControls} className="hm-chunky-text hm-text-bottom" style={{ marginLeft: '-15px', marginTop: '10px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#4ade80', top: '25px', left: '-25px' }}></span>make a
            </motion.div>
            <motion.div custom={3} variants={wordVariants} initial="hidden" animate={bottomTextControls} className="hm-chunky-text hm-text-bottom" style={{ marginLeft: '60px' }}>
              <span className="hm-dot" style={{ backgroundColor: '#f472b6', top: '-10px', left: '35%' }}></span>friend
            </motion.div>

          </div>

          {/* Container absolute agar saat tombol muncul, layout tengah tidak loncat */}
          <div className="hm-btn-container">
            {showButton && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                // Memindahkan efek hover ke framer-motion agar tidak konflik dengan animasi masuk
                whileHover={{ scale: 1.05, boxShadow: "0 6px 12px rgba(0,0,0,0.4)" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="hm-btn-go"
                onClick={() => setIsVisible(false)} 
              >
                GO!
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
