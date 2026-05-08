'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footerroom.css'; // 🔥 FIX: CSS udah dipisah ke luar!

declare global {
  interface Window {
    toggleRoomGiftDrawer?: (e?: any) => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void;
    toast?: (title: string, msg: string, type: string) => void; // Support fungsi notif lu
  }
}

export default function Footerroom() {
  const { t } = useTranslation();

  const bagikanRoom = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 🛡️ Cegah klik nembus ke profil di belakang

    const shareData = { 
      title: 'Voice Room', 
      text: t('share_room_text', 'Gabung panggung suara yuk!'), 
      url: window.location.href 
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // Kalau lu punya sistem toast/notif, dia bakal pake itu. Kalau gak, pake alert bawaan.
        if (window.toast) {
          window.toast('Sukses', t('link_copied', 'Link disalin!'), 'success');
        } else {
          alert(t('link_copied', 'Link disalin!'));
        }
      }
    } catch (err) {
      console.log('Share canceled');
    }
  };

  return (
    <footer className="footer-dock" onClick={(e) => e.stopPropagation()}>
      
      {/* 1. GIFT - Manggil toggleRoomGiftDrawer */}
      <button 
        type="button"
        onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)}
        className="dock-btn gift-btn"
      >
        <span className="material-icons">redeem</span>
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
              e.preventDefault(); // Cegah default enter
              if (window.kirimKomentar) window.kirimKomentar();
            }
          }} 
        />
      </div>

      {/* 3. MINTA NAIK */}
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.mintaNaik) window.mintaNaik();
        }}
        className="dock-btn hand-btn"
      >
        <span className="material-icons">pan_tool</span>
      </button>

      {/* 4. SHARE */}
      <button 
        type="button"
        onClick={bagikanRoom}
        className="dock-btn share-btn"
      >
        <span className="material-icons">share</span>
      </button>
    </footer>
  );
}
