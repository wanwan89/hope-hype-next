'use client';
import React from 'react';

type Props = {
  isOpen: boolean;
  isMutual?: boolean; // 🔥 Tambahan props untuk cek status teman
  onClose: () => void;
  onSetNickname?: () => void; // 🔥 Tambahan props fungsi klik nama panggilan
  onReport: () => void;
  onBlock: () => void;
};

const ActionSheet: React.FC<Props> = ({ isOpen, isMutual, onClose, onSetNickname, onReport, onBlock }) => {
  return (
    <>
      <div className={`p-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <aside 
        className={`p-follow-sheet ${isOpen ? 'open' : ''}`}
        style={{ 
          height: 'auto', // 🔥 FIX: Biar tinggi sheet ngikutin jumlah tombol, gak kepanjangan
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' // Aman buat HP layar full (iPhone/Android no-bezel)
        }}
      >
        {/* 🔥 HEADER DIRAPIKAN 🔥 */}
        <div className="follow-sheet-header" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border-card)' }}>
          <div className="drag-handle" style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '5px', background: 'var(--border-card)', borderRadius: '10px' }}></div>
          
          <h3 style={{ margin: '10px 0 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Tindakan</h3>
          
          <span 
            className="material-icons close-icon" 
            onClick={onClose}
            style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', marginTop: '5px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            close
          </span>
        </div>
        
        <div className="follow-sheet-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 🔥 TOMBOL NAMA PANGGILAN (HANYA MUNCUL JIKA MUTUAL/BERTEMAN) 🔥 */}
          {isMutual && (
            <button 
              onClick={onSetNickname} 
              style={{ width: '100%', padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span className="material-icons" style={{ fontSize: '18px', color: '#1f3cff' }}>edit_square</span>
              Beri Nama Panggilan
            </button>
          )}

          <button 
            onClick={onReport} 
            style={{ width: '100%', padding: '16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span className="material-icons" style={{ fontSize: '18px' }}>flag</span>
            Laporkan Pengguna
          </button>
          
          <button 
            onClick={onBlock} 
            style={{ width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span className="material-icons" style={{ fontSize: '18px' }}>block</span>
            Blokir Pengguna
          </button>
          
        </div>
      </aside>
    </>
  );
};

export default React.memo(ActionSheet);
