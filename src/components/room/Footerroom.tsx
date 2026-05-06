'use client';

declare global {
  interface Window {
    toggleGiftDrawer?: () => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void;
  }
}

export default function Footer() {
  
  const bagikanRoom = async () => {
    const shareData = {
      title: 'Voice Room',
      text: 'Gabung panggung suara yuk!',
      url: window.location.href 
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link disalin!'); 
      }
    } catch (err) {
      console.log('Share canceled');
    }
  };

  return (
    <footer className="footer-dock">
      
      {/* 1. GIFT - Pakai warna Amber yang solid & elegan */}
      <button 
        onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()}
        className="dock-btn gift-btn"
      >
        <span className="material-icons">redeem</span>
      </button>

      {/* 2. CHATBOX - Lebih menyatu dengan background */}
      <div className="input-container">
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Ketik komentar..." 
          autoComplete="off" 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.kirimKomentar && window.kirimKomentar();
            }
          }} 
        />
      </div>

      {/* 3. MINTA NAIK - Biru yang lebih calm (Bukan AI Blue) */}
      <button 
        onClick={() => window.mintaNaik && window.mintaNaik()}
        className="dock-btn hand-btn"
      >
        <span className="material-icons">pan_tool</span>
      </button>

      {/* 4. SHARE - Icon panah khas share, warna abu-abu pro */}
      <button 
        onClick={bagikanRoom}
        className="dock-btn share-btn"
      >
        <span className="material-icons">share</span>
      </button>

      <style jsx>{`
        .footer-dock {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 16px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom));
          background: var(--panel-bg);
          border-top: 1px solid var(--border);
          display: flex;
          gap: 10px;
          align-items: center;
          z-index: 900;
        }

        /* Styling Tombol secara Umum */
        .dock-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.1s ease;
        }

        .dock-btn:active {
          transform: scale(0.92);
        }

        /* Warna masing-masing tombol */
        .gift-btn {
          background: #f59e0b; /* Solid Amber */
          color: white;
        }

        .hand-btn {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .share-btn {
          background: var(--empty-slot);
          color: var(--text-main);
        }

        /* Container Chat */
        .input-container {
          flex: 1;
          background: var(--input-bg);
          border-radius: 12px;
          padding: 0 14px;
          height: 44px;
          display: flex;
          align-items: center;
        }

        #chat-input {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 500;
          outline: none;
        }

        #chat-input::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
        }
      `}</style>

    </footer>
  );
}
