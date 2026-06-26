import React from 'react';

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
      {/* CSS Di-embed langsung di dalam komponen */}
      <style>{`
        .hm-match-overlay-container {
          position: fixed;
          inset: 0;
          background: linear-gradient(180deg, #00b4ff 0%, #0066ff 100%); /* Background Biru */
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
          animation: matchPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .hm-match-title {
          font-family: 'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;
          font-size: 55px;
          font-weight: 900;
          font-style: italic;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: 2px;
          /* Tanpa shadow */
        }

        .hm-match-text {
          font-size: 18px;
          margin-bottom: 20px;
        }

        .hm-match-avatars {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40px 0;
          position: relative; /* Penting untuk love icon di tengah */
        }

        .hm-avatar-circle {
          width: 130px; 
          height: 130px; 
          border-radius: 50%; 
          border: 4px solid #fff;
          object-fit: cover; 
          margin: 0 15px;
          background-color: #ddd; /* fallback color */
          /* Tanpa shadow */
        }

        .hm-favorite-icon {
          color: #ffffff; 
          font-size: 60px; 
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%); /* Posisi persis di tengah */
          z-index: 10;
          animation: heartbeat 1s infinite;
          /* Tanpa shadow */
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
          /* Tanpa shadow */
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

        /* ANIMASI */
        @keyframes heartbeat {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }

        @keyframes matchPop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Konten Overlay */}
      <div className={`hm-match-overlay-container show`}>
        <div className="hm-match-content">
          <h2 className="hm-match-title">HYPE MATCH!</h2>
          <p className="hm-match-text">Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          
          <div className="hm-match-avatars">
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
          </div>

          <button className="hm-btn-chat-now" onClick={onChatNow}>
            Sapa Dia!
          </button>
          
          <button className="hm-btn-keep-swiping" onClick={() => { 
            setMatchedUser(null); 
            nextCard(); 
          }}>
            Lanjut Mencari
          </button>
        </div>
      </div>
    </>
  );
}
