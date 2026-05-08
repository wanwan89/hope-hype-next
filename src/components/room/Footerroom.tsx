'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footerroom.css';

declare global {
  interface Window {
    toggleRoomGiftDrawer?: (e?: any) => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void;
    toast?: (title: string, msg: string, type: string) => void; 
    // 🔥 FIX: Daftarin fungsi global share biar Vercel nggak protes 🔥
    openGlobalShare?: (url?: string, title?: string, text?: string) => void; 
  }
}

export default function Footerroom() {
  const { t } = useTranslation();

  return (
    <footer className="footer-dock" onClick={(e) => e.stopPropagation()}>
      
      {/* 1. GIFT - Icon Kado Modern */}
      <button 
        type="button"
        onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)}
        className="dock-btn gift-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12"></polyline>
          <rect x="2" y="7" width="20" height="5"></rect>
          <line x1="12" y1="22" x2="12" y2="7"></line>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
      </button>

      {/* 2. CHATBOX */}
      <div className="input-container">
        <input 
          type="text" 
          id="chat-input" 
          placeholder={t('type_comment', 'Ketik komentar...')} 
          autoComplete="off" 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); 
              if (window.kirimKomentar) window.kirimKomentar();
            }
          }} 
        />
      </div>

      {/* 3. MINTA NAIK - Icon Tangan Waving Modern */}
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.mintaNaik) window.mintaNaik();
        }}
        className="dock-btn hand-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-4 0v4"/>
          <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
          <path d="M10 10.5V3a2 2 0 0 0-4 0v9"/>
          <path d="M6 14a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2.5a11 11 0 0 0 11 11h.5a8 8 0 0 0 8-8V11a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/>
        </svg>
      </button>

      {/* 4. SHARE - Icon Share Node Modern */}
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 🔥 FIX: Panggil Modal Bagikan (GlobalShareModal) buatan kita! 🔥
          if (window.openGlobalShare) {
            window.openGlobalShare(
              window.location.href, 
              'Voice Room HypeTalk', 
              t('share_room_text', 'Gabung panggung suara yuk!')
            );
          } else {
            // Fallback (jaga-jaga kalau komponen modanya belum sempet kerender)
            navigator.clipboard.writeText(window.location.href);
            if (window.toast) {
              window.toast('Sukses', t('link_copied', 'Link disalin!'), 'success');
            } else {
              alert(t('link_copied', 'Link disalin!'));
            }
          }
        }}
        className="dock-btn share-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
    </footer>
  );
}
