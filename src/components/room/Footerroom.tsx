'use client';

// 👇 FIX: Kasih tau TypeScript fungsi apa aja yang nempel di window 👇
declare global {
  interface Window {
    toggleGiftDrawer?: () => void;
    kirimKomentar?: () => void;
  }
}

export default function Footer() {
  return (
    <footer className="footer-controls">
      <button className="btn-gift-main" onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()}>
        <span className="material-icons">redeem</span>
      </button>
      <div className="input-wrapper">
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
        <button className="btn-send" onClick={() => window.kirimKomentar && window.kirimKomentar()}>
          {/* Di React, inline style nulisnya pakai object camelCase seperti di bawah ini */}
          <span className="material-icons" style={{ fontSize: '18px', marginLeft: '3px' }}>send</span>
        </button>
      </div>
    </footer>
  );
}
