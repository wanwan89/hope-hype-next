'use client';

// 👇 FIX: Daftarin fungsi global ke TypeScript
declare global {
  interface Window {
    toggleGiftDrawer?: () => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void;
  }
}

export default function Footer() {
  
  // Fungsi bagikan yang keren & modern
  const bagikanRoom = async () => {
    const shareData = {
      title: 'Ayo Gabung ke Voice Room!',
      text: 'Nongkrong bareng gw di panggung suara ini yuk, seru nih!',
      url: window.location.href 
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link panggung berhasil disalin!'); 
      }
    } catch (err) {
      console.error('Batal share', err);
    }
  };

  return (
    <footer className="footer-controls" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '10px 14px',
      paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      background: 'var(--panel-bg)',
      borderTop: '1px solid var(--border)',
      display: 'flex', gap: '10px', alignItems: 'center',
      zIndex: 900, backdropFilter: 'blur(15px)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
    }}>
      
      {/* 1. GIFT (PALING KIRI) */}
      <button 
        onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()}
        className="btn-footer-press"
        style={{ 
          width: '44px', height: '44px', borderRadius: '14px', 
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
          border: 'none', color: '#fff', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
        }}
      >
        <span className="material-icons">redeem</span>
      </button>

      {/* 2. CHATBOX (TENGAH - MELEBAR) */}
      <div className="input-wrapper" style={{
        flex: 1, display: 'flex', alignItems: 'center',
        background: 'var(--input-bg)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '0 16px', height: '44px'
      }}>
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Ketik komentar..." 
          autoComplete="off" 
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'var(--text-main)', fontSize: '14px', fontWeight: '500', outline: 'none'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.kirimKomentar && window.kirimKomentar();
            }
          }} 
        />
      </div>

      {/* 3. MINTA NAIK (KANAN 1) */}
      <button 
        onClick={() => window.mintaNaik && window.mintaNaik()}
        className="btn-footer-press"
        style={{ 
          width: '44px', height: '44px', borderRadius: '14px', 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0 
        }}
      >
        <span className="material-icons">pan_tool</span>
      </button>

      {/* 4. SHARE (PALING KANAN - COOL GRADIENT) */}
      <button 
        onClick={bagikanRoom}
        className="btn-footer-press"
        style={{ 
          width: '44px', height: '44px', borderRadius: '14px', 
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', 
          border: 'none', color: '#fff', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
        }}
      >
        <span className="material-icons">ios_share</span>
      </button>

      {/* CSS KHUSUS ANIMASI PENCET (Klik) */}
      <style jsx>{`
        .btn-footer-press:active {
          transform: scale(0.9);
          filter: brightness(0.9);
          transition: transform 0.1s ease;
        }
      `}</style>

    </footer>
  );
}
