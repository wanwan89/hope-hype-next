'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GiftDrawerroom.css';

declare global {
  interface Window {
    toggleRoomGiftDrawer?: (e?: any) => void;
    sendGift?: (giftName: string, harga: number | string, giftId: number | string, jumlah?: number) => void;
  }
}

// 🔥 LIST KADO (Pindah ke array biar kode bersih & gampang diatur) 🔥
const GIFTS = [
  { id: 1, name: 'Love', price: 1, img: '/asets/png/gift1.png' },
  { id: 2, name: 'Daebak', price: 10, img: '/asets/png/gift2.png' },
  { id: 3, name: 'Omoomo', price: 50, img: '/asets/png/gift3.png' },
  { id: 4, name: 'Oppa', price: 100, img: '/asets/png/gift4.png' },
  { id: 5, name: 'Fighting', price: 2000, img: '/asets/png/gift5.png' },
  { id: 6, name: 'Saranghae', price: 5000, img: '/asets/png/gift6.png' },
  { id: 7, name: 'Kiyowo', price: 10000, img: '/asets/png/gift7.png' },
  { id: 8, name: 'Gomawo', price: 25000, img: '/asets/png/gift8.png' },
  { id: 9, name: 'Daesang', price: 50000, img: '/asets/png/gift9.png' },
  { id: 10, name: 'Sultan', price: 100000, img: '/asets/png/gift10.png' },
];

export default function GiftDrawerroom() {
  const { t } = useTranslation();
  
  // State untuk nyimpen kado yang lagi dipilih (Default pilih yang pertama)
  const [selectedGift, setSelectedGift] = useState<any>(GIFTS[0]);
  const [isSpamming, setIsSpamming] = useState(false);

  // Animasi klik/spam
  const triggerSendAnim = () => {
    setIsSpamming(true);
    setTimeout(() => setIsSpamming(false), 150);
  };

  // 🔥 LOGIKA KLIK KADO 🔥
  const handleGiftClick = (gift: any) => {
    if (selectedGift?.id === gift.id) {
      // Jika kado udah dipilih & diklik lagi -> MODE SPAM (Langsung Kirim)
      triggerSendAnim();
      window.sendGift && window.sendGift(gift.name, gift.price, gift.id);
    } else {
      // Jika kado beda -> MODE PILIH
      setSelectedGift(gift);
    }
  };

  // 🔥 LOGIKA TOMBOL KIRIM 🔥
  const handleSendBtnClick = () => {
    if (selectedGift) {
      triggerSendAnim();
      window.sendGift && window.sendGift(selectedGift.name, selectedGift.price, selectedGift.id);
    }
  };

  return (
    <>
      {/* 🔥 INJEKSI CSS KHUSUS 3D & FOOTER 🔥 */}
      <style>{`
        #room-gift-drawer {
          display: flex;
          flex-direction: column;
          padding-bottom: 0 !important; /* Reset padding biar footer nempel bawah */
        }
        
        .gift-list-3d-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 10px 15px 20px 15px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }

        .gift-item-3d {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 5px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        /* EFEK KETIKA DIPILIH (GLOW & FLOAT) */
        .gift-item-3d.active {
          background: rgba(31, 60, 255, 0.1);
          border: 2px solid #1f3cff;
          box-shadow: 0 10px 25px rgba(31, 60, 255, 0.2);
          transform: translateY(-4px);
        }

        /* EFEK 3D PADA GAMBAR (DROP SHADOW) */
        .gift-img-3d {
          width: 55px;
          height: 55px;
          object-fit: contain;
          filter: drop-shadow(0 10px 8px rgba(0,0,0,0.5));
          transition: transform 0.2s, filter 0.3s;
          margin-bottom: 8px;
        }

        /* Kalo lagi dipilih, gambarnya ngambang (floating) */
        .gift-item-3d.active .gift-img-3d {
          animation: float3D 2s ease-in-out infinite;
          filter: drop-shadow(0 15px 10px rgba(0,0,0,0.6));
        }

        @keyframes float3D {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .gift-item-3d:active {
          transform: scale(0.9);
        }

        /* FOOTER KIRIM */
        .gift-footer-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          padding-bottom: calc(15px + env(safe-area-inset-bottom));
          background: var(--bg-card, #1a1a1a);
          border-top: 1px solid var(--border-color, rgba(255,255,255,0.05));
          z-index: 10;
        }

        .send-gift-btn {
          background: linear-gradient(135deg, #1f3cff, #bc13fe);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-weight: 800;
          font-size: 15px;
          box-shadow: 0 4px 15px rgba(31, 60, 255, 0.4);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .send-gift-btn:active, .send-gift-btn.spamming {
          transform: scale(0.92);
        }
      `}</style>

      {/* OVERLAY */}
      <div 
        id="room-drawer-overlay" 
        className="drawer-overlay" 
        onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)}
      ></div>

      {/* LACI KADO */}
      <div id="room-gift-drawer" className="gift-drawer">
        <div className="handle"></div> 
        
        {/* HEADER */}
        <div className="drawer-header">
          <span className="drawer-title">{t('send_gift_title', 'KIRIM HADIAH')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="coin-panel">
              <span id="user-coins">0</span>
            </div>
            <span 
              className="material-icons" 
              onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)} 
              style={{ color: '#94a3b8', fontSize: '26px', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              cancel
            </span>
          </div>
        </div>

        {/* CONTAINER TARGET (Diisi dinamis dari Vanilla JS) */}
        <div id="level-progress-container" style={{ margin: '15px 20px 5px 20px' }}></div>
        <div className="target-selection-container">
          <span className="target-label">{t('send_to_label', 'KIRIM KE:')}</span>
          <div id="gift-targets" className="target-list"></div>
        </div>

        {/* DAFTAR KADO (3D GRID) */}
        <div className="gift-list-3d-wrapper">
          {GIFTS.map((gift) => (
            <div 
              key={gift.id}
              className={`gift-item-3d ${selectedGift?.id === gift.id ? 'active' : ''}`} 
              onClick={() => handleGiftClick(gift)}
            >
              <img src={gift.img} className="gift-img-3d" alt={gift.name} />
              <span className="gift-label" style={{ fontSize: '10px', fontWeight: 'bold' }}>{gift.name.toUpperCase()}</span>
              <span className="gift-price" style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '800', marginTop: '2px' }}>
                <span className="material-icons" style={{ fontSize: '10px', verticalAlign: 'middle', marginRight: '2px' }}>toll</span>
                {gift.price.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>

        {/* 🔥 FOOTER ACTION (TOMBOL KIRIM) 🔥 */}
        <div className="gift-footer-action">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pilih Kado:</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              {selectedGift?.name || '-'}
            </span>
          </div>
          
          <button 
            className={`send-gift-btn ${isSpamming ? 'spamming' : ''}`}
            onClick={handleSendBtnClick}
          >
            {t('send', 'KIRIM')}
          </button>
        </div>

      </div>
    </>
  );
}
