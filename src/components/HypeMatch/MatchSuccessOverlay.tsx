import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tipe data disamakan dengan yang ada di main file
type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  [key: string]: any; 
};

type MatchSuccessOverlayProps = {
  matchedUser: MatchUser | null;
  currentUser: any;
  nextCard: () => void;
  setMatchedUser: (user: MatchUser | null) => void;
  onChatClick?: () => void; // Prop baru untuk handle tombol sapa
};

export default function MatchSuccessOverlay({
  matchedUser,
  currentUser,
  nextCard,
  setMatchedUser,
  onChatClick
}: MatchSuccessOverlayProps) {

  // Varian Animasi untuk Background Overlay (Fade In/Out)
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  // Varian Animasi untuk Konten (Muncul membal dari bawah)
  const contentVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', damping: 15, stiffness: 200, staggerChildren: 0.2 } 
    },
    exit: { scale: 0.8, opacity: 0, y: 50, transition: { duration: 0.2 } }
  };

  // Varian Animasi untuk Avatar (Bertabrakan dari kiri dan kanan)
  const avatarLeftVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5 } }
  };

  const avatarRightVariants = {
    hidden: { x: 50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5 } }
  };

  return (
    <>
      {/* Import Font Titan One khusus untuk komponen ini */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
        
        .hm-chunky-match-title {
          font-family: 'Titan One', 'Arial Black', Impact, sans-serif;
          color: #f8ebd4;
          font-size: 3.5rem;
          line-height: 1;
          letter-spacing: -1px;
          margin-bottom: 10px;
          text-transform: lowercase;
          text-shadow: 3px 3px 0px #ec4899; /* Memberikan efek pop timbul warna pink */
        }

        /* Styling tambahan agar overlay fullscreen jika belum ada di CSS kamu */
        .hm-match-overlay-motion {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(15, 23, 42, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .hm-match-content-motion {
          text-align: center;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .hm-match-avatars-motion {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin: 20px 0;
        }

        .hm-avatar-circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #ec4899;
          box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4);
        }

        .hm-favorite-icon-motion {
          color: #ec4899;
          font-size: 40px;
          text-shadow: 0 0 15px rgba(236, 72, 153, 0.8);
        }

        .hm-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 250px;
        }

        @media (max-width: 768px) {
          .hm-chunky-match-title { font-size: 2.8rem; }
          .hm-avatar-circle { width: 75px; height: 75px; }
        }
      `}</style>

      <AnimatePresence>
        {matchedUser && (
          <motion.div 
            className="hm-match-overlay-motion"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div className="hm-match-content-motion" variants={contentVariants}>
              
              {/* Judul dengan font Titan One */}
              <motion.h2 
                className="hm-chunky-match-title"
                variants={{
                  hidden: { scale: 0.5, opacity: 0 },
                  visible: { scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.6 } }
                }}
              >
                hype match!
              </motion.h2>
              
              <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!
              </motion.p>
              
              {/* Animasi Avatar */}
              <motion.div className="hm-match-avatars-motion">
                <motion.img 
                  variants={avatarLeftVariants}
                  src={currentUser?.avatar_url} 
                  alt="You" 
                  className="hm-avatar-circle" 
                />
                
                <motion.span 
                  variants={{
                    hidden: { scale: 0 },
                    visible: { scale: [0, 1.2, 1], transition: { delay: 0.3, type: 'spring' } }
                  }}
                  className="material-icons hm-favorite-icon-motion"
                >
                  favorite
                </motion.span>

                <motion.img 
                  variants={avatarRightVariants}
                  src={matchedUser.avatar_url} 
                  alt="Them" 
                  className="hm-avatar-circle" 
                />
              </motion.div>

              {/* Tombol Aksi */}
              <motion.div 
                className="hm-action-buttons"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { delay: 0.4 } }
                }}
              >
                <button 
                  className="hm-btn-chat-now hm-glass-clean" 
                  onClick={onChatClick}
                  style={{
                    padding: '12px 24px', borderRadius: '25px', backgroundColor: '#ec4899',
                    color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                    fontSize: '1.1rem'
                  }}
                >
                  Sapa Dia!
                </button>
                <button 
                  className="hm-btn-keep-swiping" 
                  onClick={() => { 
                    setMatchedUser(null); 
                    nextCard(); 
                  }}
                  style={{
                    padding: '12px 24px', borderRadius: '25px', backgroundColor: 'transparent',
                    color: '#cbd5e1', border: '2px solid #334155', fontWeight: 'bold', cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Lanjut Mencari
                </button>
              </motion.div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
