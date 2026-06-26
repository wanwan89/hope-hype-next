'use client';
import React from 'react';
import { motion } from 'framer-motion';

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
  onChatNow: () => void; 
  nextCard: () => void;
  setMatchedUser: (user: MatchUser | null) => void;
};

export default function MatchSuccessOverlay({
  matchedUser,
  currentUser,
  onChatNow,
  nextCard,
  setMatchedUser
}: MatchSuccessOverlayProps) {
  
  // Jika tidak ada user yang match, jangan render isinya
  if (!matchedUser) return null;

  return (
    <>
      <style>{`
        .hm-match-overlay-container {
          position: fixed;
          inset: 0;
          background: linear-gradient(180deg, #00b4ff 0%, #0066ff 100%); 
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .hm-match-overlay-container.show {
          opacity: 1;
          pointer-events: auto;
        }

        .hm-match-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
        }

        /* --- DESAIN TEKS MATCH SEPERTI GAMBAR --- */
        .hm-match-text-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 25px;
        }

        .hm-its-a-text {
          font-family: 'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;
          font-size: 24px;
          font-weight: 800;
          font-style: italic;
          color: #ffffff; /* Menggunakan putih agar kontras dengan background biru */
          letter-spacing: 2px;
          margin: 0 0 -5px 0;
          z-index: 4;
          position: relative;
        }

        .hm-match-word-container {
          position: relative;
          display: flex;
          justify-content: center;
          height: 150px; /* Memberikan ruang agar outline bawah tidak memotong elemen di bawahnya */
          width: 100%;
        }

        .hm-match-word {
          font-family: 'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;
          font-size: 75px;
          font-weight: 900;
          font-style: italic;
          margin: 0;
          line-height: 1;
          letter-spacing: 1px;
          position: absolute;
        }

        .hm-main-match {
          background: linear-gradient(90deg, #ff007a 0%, #ff7300 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          z-index: 3;
          top: 0;
        }

        .hm-outline-1 {
          top: 35px;
          -webkit-text-stroke: 1.5px #ffffff;
          -webkit-text-fill-color: transparent;
          z-index: 2;
        }

        .hm-outline-2 {
          top: 70px;
          -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.3);
          -webkit-text-fill-color: transparent;
          z-index: 1;
        }

        /* --- SISA DESAIN UI --- */
        .hm-match-desc {
          font-size: 18px;
          margin-bottom: 20px;
          z-index: 10;
        }

        .hm-match-avatars {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0 40px 0;
          position: relative; 
        }

        .hm-avatar-circle {
          width: 130px; 
          height: 130px; 
          border-radius: 50%; 
          border: 4px solid #fff;
          object-fit: cover; 
          margin: 0 15px;
          background-color: #ddd; 
        }

        .hm-favorite-icon {
          color: #ff1e56; /* WARNA MERAH MENYALA */
          font-size: 60px; 
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%); 
          z-index: 10;
          animation: heartbeat 1s infinite;
        }

        .hm-btn-chat-now {
          background: #ffffff; 
          color: #0066ff; 
          padding: 16px 40px; 
          border-radius: 30px;
          font-weight: bold; 
          font-size: 16px; 
          border: none; 
          cursor: pointer;
          margin-bottom: 15px; 
          width: 100%; 
          max-width: 320px; 
          transition: transform 0.2s;
        }
        .hm-btn-chat-now:active { transform: scale(0.95); }

        .hm-btn-keep-swiping {
          background: transparent; 
          color: #fff; 
          padding: 16px 40px; 
          border-radius: 30px;
          font-weight: bold; 
          font-size: 16px; 
          border: 2px solid #ffffff; 
          cursor: pointer; 
          width: 100%; 
          max-width: 320px; 
          transition: transform 0.2s, background 0.2s;
        }
        .hm-btn-keep-swiping:active { 
          transform: scale(0.95); 
          background: rgba(255,255,255,0.1); 
        }

        @keyframes heartbeat {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Konten Overlay */}
      <div className={`hm-match-overlay-container show`}>
        <motion.div 
          className="hm-match-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          
          {/* Framer Motion Animasi Teks */}
          <div className="hm-match-text-container">
            <motion.h3 
              className="hm-its-a-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              IT'S A
            </motion.h3>

            <div className="hm-match-word-container">
              {/* Layer 3: Outline paling bawah */}
              <motion.h1 
                className="hm-match-word hm-outline-2"
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
              >
                MATCH!
              </motion.h1>

              {/* Layer 2: Outline tengah */}
              <motion.h1 
                className="hm-match-word hm-outline-1"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 150 }}
              >
                MATCH!
              </motion.h1>

              {/* Layer 1: Text Gradient Utama */}
              <motion.h1 
                className="hm-match-word hm-main-match"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
              >
                MATCH!
              </motion.h1>
            </div>
          </div>

          <motion.p 
            className="hm-match-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!
          </motion.p>
          
          <motion.div 
            className="hm-match-avatars"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: "spring", bounce: 0.4 }}
          >
            <img 
              src={currentUser?.avatar_url || 'https://via.placeholder.com/150'} 
              alt="You" 
              className="hm-avatar-circle" 
            />
            
            <span className="material-icons hm-favorite-icon">favorite</span>
            
            <img 
              src={matchedUser.avatar_url || 'https://via.placeholder.com/150'} 
              alt="Them" 
              className="hm-avatar-circle" 
            />
          </motion.div>

          <motion.button 
            className="hm-btn-chat-now" 
            onClick={onChatNow}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            Sapa Dia!
          </motion.button>
          
          <motion.button 
            className="hm-btn-keep-swiping" 
            onClick={() => { 
              setMatchedUser(null); 
              nextCard(); 
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            Lanjut Mencari
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}
