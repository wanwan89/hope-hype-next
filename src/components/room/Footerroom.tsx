'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
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

  return (
    <div 
      className="footer-floating-wrapper" 
      onClick={(e) => e.stopPropagation()} 
      style={{ 
        position: 'fixed',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '480px',
        zIndex: 1000 
      }}
    >
      {/* 🔥 CONTAINER GLASSMORPHISM 🔥 */}
      <footer style={{ 
        display: 'flex', 
        gap: '8px', 
        padding: '8px', 
        alignItems: 'center', 
        background: 'rgba(15, 20, 25, 0.55)', 
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
                if (window.kirimKomentar) window.kirimKomentar();
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
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); window.toggleRoomGiftDrawer?.(); }}
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #f6d365, #fda085)', 
            color: '#000', border: 'none', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 4px 10px rgba(246, 211, 101, 0.3)'
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>card_giftcard</span>
        </button>

        {/* 3. ICON MINTA NAIK PANGGUNG (Buka Action Menu) */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); window.toggleActionMenu?.(); }}
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0, transition: '0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>front_hand</span>
        </button>

        {/* 4. ICON SHARE */}
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
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0, transition: '0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>ios_share</span>
        </button>

      </footer>
    </div>
  );
}
