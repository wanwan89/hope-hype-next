'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footerroom.css';

declare global {
  interface Window {
    toggleActionMenu?: () => void;
    kirimKomentar?: () => void;
    toast?: (title: string, msg: string, type: string) => void; 
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void; 
  }
}

export default function Footerroom() {
  const { t } = useTranslation();

  return (
    <div className="footer-floating-wrapper" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
      <footer className="footer-dock" style={{ display: 'flex', gap: '10px', padding: '10px 15px', alignItems: 'center', background: 'rgba(11,20,26,0.85)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        
        {/* 1. KOTAK INPUT KOMENTAR */}
        <div className="input-container" style={{ flex: 1 }}>
          <input 
            type="text" 
            id="chat-input" 
            className="floating-chat-input"
            placeholder={t('type_comment', 'Ketik sesuatu...')} 
            autoComplete="off" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); 
                if (window.kirimKomentar) window.kirimKomentar();
              }
            }} 
            style={{ width: '100%', padding: '12px 18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', fontSize: '14px' }}
          />
        </div>

        {/* 2. TOMBOL AKSI PANGGUNG (PENGGANTI SIDEBAR) */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); window.toggleActionMenu?.(); }}
          className="dock-btn action-btn premium-glow"
          style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #1f3cff, #bc13fe)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 15px rgba(31, 60, 255, 0.4)' }}
        >
          <span className="material-icons" style={{ fontSize: '22px' }}>rocket_launch</span>
        </button>

        {/* 3. TOMBOL SHARE KECIL */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (window.openGlobalShare) {
              window.openGlobalShare(window.location.href, 'Voice Room HypeTalk', 'Gabung panggung suara yuk!');
            } else {
              navigator.clipboard.writeText(window.location.href);
              if (window.toast) window.toast('Sukses', 'Link disalin!', 'success');
              else alert('Link disalin!');
            }
          }}
          className="dock-btn share-btn"
          style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>share</span>
        </button>

      </footer>
    </div>
  );
}
