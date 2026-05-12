'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import './Footerroom.css';

declare global {
  interface Window {
    toggleActionMenu?: () => void;
    toggleRoomGiftDrawer?: (e?: any) => void;
    kirimKomentar?: () => void;
    toast?: (title: string, msg: string, type: string) => void; 
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void; 
  }
}

export default function Footerroom() {
  const { t } = useTranslation();

  // 🔥 FUNGSI SAKTI BUAT BUKA KADO (ANTI GAGAL) 🔥
  const handleGiftClick = (e: React.MouseEvent) => {
    // 1. Tahan klik biar nggak tembus ke belakang layar (bikin nge-bug)
    e.preventDefault();
    e.stopPropagation(); 
    
    // 2. Langsung tembak sinyal CustomEvent (Cara paling aman di Next.js)
    window.dispatchEvent(new CustomEvent('openRoomGift'));
    
    // 3. Cek di Console (F12). Kalau tulisan ini muncul, tombol 100% jalan!
    console.log("🔥 Sinyal Buka Kado Ditembak dari Footer!");
  };

  return (
    <div 
      className="footer-floating-wrapper" 
      style={{ 
        position: 'fixed',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '480px',
        // 🔥 Z-INDEX DEWA: Biar nggak ada yang berani nutupin footer ini
        zIndex: 90000, 
        pointerEvents: 'auto' 
      }}
    >
      <footer style={{ 
        display: 'flex', 
        gap: '8px', 
        padding: '8px', 
        alignItems: 'center', 
        background: 'rgba(15, 20, 25, 0.65)', 
        backdropFilter: 'blur(16px) saturate(180%)', 
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '32px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
      }}>
        
        {/* 1. KOTAK INPUT KOMENTAR */}
        <div style={{ 
          flex: 1, 
          background: 'rgba(255,255,255,0.08)', 
          borderRadius: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 14px', 
          border: '1px solid rgba(255,255,255,0.05)' 
        }}>
          <input 
            type="text" 
            id="chat-input" 
            placeholder={t('type_comment', 'Ketik sesuatu...')} 
            autoComplete="off" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); 
                if (typeof window.kirimKomentar === 'function') window.kirimKomentar();
              }
            }} 
            style={{ 
              width: '100%', 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              padding: '12px 0', 
              outline: 'none', 
              fontSize: '13px' 
            }}
          />
        </div>

        {/* 2. ICON GIFT (KADO) */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }} 
          onClick={handleGiftClick}
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #f6d365, #fda085)', 
            color: '#000', border: 'none', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 4px 10px rgba(246, 211, 101, 0.4)',
            position: 'relative', // Perkuat posisi tombol
            zIndex: 90001
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>card_giftcard</span>
        </motion.button>

        {/* 3. ICON MINTA NAIK PANGGUNG */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); window.toggleActionMenu?.(); }}
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>front_hand</span>
        </motion.button>

        {/* 4. ICON SHARE */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (typeof window.openGlobalShare === 'function') {
              window.openGlobalShare(window.location.href, 'Voice Room HypeTalk', 'Gabung panggung suara yuk!');
            } else {
              navigator.clipboard.writeText(window.location.href);
              if (window.toast) window.toast('Sukses', 'Link disalin!', 'success');
              else alert('Link disalin!');
            }
          }}
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>ios_share</span>
        </motion.button>

      </footer>
    </div>
  );
}
