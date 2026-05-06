'use client';

// 👇 FIX: Kasih tau TypeScript fungsi apa aja yang nempel di window 👇
declare global {
  interface Window {
    toggleGiftDrawer?: () => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void; // 🔥 Tambahan fungsi minta naik panggung
  }
}

export default function Footer() {
  
  // Fungsi canggih buat nge-share link room langsung ke WA/IG/dll
  const bagikanRoom = async () => {
    const shareData = {
      title: 'Ayo Gabung ke Voice Room!',
      text: 'Nongkrong bareng gw di panggung suara ini yuk, seru nih!',
      url: window.location.href // Otomatis ngambil link room saat ini
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback kalau browser jadul/in-app browser gak support
        await navigator.clipboard.writeText(window.location.href);
        alert('Link panggung berhasil disalin!'); 
      }
    } catch (err) {
      console.error('Batal share', err);
    }
  };

  return (
    <footer className="footer-controls">
      
      {/* 1. Tombol Bagikan (Share) */}
      <button 
        onClick={bagikanRoom}
        style={{ 
          width: '40px', height: '40px', borderRadius: '50%', background: 'var(--empty-slot)', 
          border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0 
        }}
      >
        <span className="material-icons" style={{ fontSize: '20px' }}>share</span>
      </button>

      {/* 2. Tombol Minta Naik Panggung (Angkat Tangan) */}
      <button 
        onClick={() => window.mintaNaik && window.mintaNaik()}
        style={{ 
          width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', 
          border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0 
        }}
      >
        <span className="material-icons" style={{ fontSize: '20px' }}>pan_tool</span>
      </button>

      {/* 3. Tombol Gift Utama (Sultan) */}
      <button className="btn-gift-main" onClick={() => window.toggleGiftDrawer && window.toggleGiftDrawer()}>
        <span className="material-icons">redeem</span>
      </button>
      
      {/* 4. Kolom Input Chat */}
      <div className="input-wrapper">
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Ketik komentar..." 
          autoComplete="off" 
          // 🔥 Fitur Enter langsung ngirim udah ada di sini 🔥
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.kirimKomentar && window.kirimKomentar();
            }
          }} 
        />
        <button className="btn-send" onClick={() => window.kirimKomentar && window.kirimKomentar()}>
          <span className="material-icons" style={{ fontSize: '18px', marginLeft: '3px' }}>send</span>
        </button>
      </div>

    </footer>
  );
}
