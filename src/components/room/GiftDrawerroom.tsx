'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import './GiftDrawerroom.css';

declare global {
  interface Window {
    toggleRoomGiftDrawer?: (e?: any) => void;
    sendGift?: (giftName: string, harga: number | string, giftId: number | string, jumlah?: number) => void;
  }
}

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
  
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [spamAnimId, setSpamAnimId] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  // Ambil data user buat Bar Level
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('username, avatar_url, coins, level, exp').eq('id', session.user.id).single();
        if (data) setMyProfile(data);
      }
    };
    fetchUser();
  }, []);

  const triggerSendAnim = (id: number) => {
    setSpamAnimId(id);
    setTimeout(() => setSpamAnimId(null), 150); // Reset animasi setelah 150ms
  };

  // Logika 2 Mode: Pilih / Kirim (Spam)
  const handleGiftAction = (gift: any, e: any) => {
    e.stopPropagation();
    if (selectedGift?.id === gift.id) {
      // Mode Brutal/Spam: Langsung Kirim
      triggerSendAnim(gift.id);
      window.sendGift && window.sendGift(gift.name, gift.price, gift.id);
      
      // Kurangi koin di UI biar kerasa real-time
      if (myProfile) setMyProfile({ ...myProfile, coins: Math.max(0, myProfile.coins - gift.price) });
    } else {
      // Mode Pilih: Munculin Box
      setSelectedGift(gift);
    }
  };

  // Kalkulasi Level (Maks EXP per level kita asumsikan level * 100)
  const currentLevel = myProfile?.level || 1;
  const currentExp = myProfile?.exp || 0;
  const maxExp = currentLevel * 100;
  const progressPercent = Math.min(100, (currentExp / maxExp) * 100);

  return (
    <>
      <style>{`
        #room-gift-drawer {
          display: flex;
          flex-direction: column;
          padding-bottom: 0 !important;
          max-height: 90vh;
        }
        
        /* 🔥 HEADER LEVEL BAR (BARU) 🔥 */
        .drawer-top-level {
          display: flex; align-items: center; gap: 12px;
          background: var(--bg-card, rgba(255,255,255,0.05));
          padding: 12px 16px; border-radius: 20px;
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
          margin: 0 20px 20px 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .level-avatar-box {
          position: relative; width: 44px; height: 44px; flex-shrink: 0;
        }
        .level-avatar {
          width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
          border: 2px solid #1f3cff;
        }
        .level-badge-mini {
          position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
          background: #1f3cff; color: white; font-size: 9px; font-weight: 800;
          padding: 2px 6px; border-radius: 8px; border: 1.5px solid var(--bg-base);
        }
        .level-progress-info {
          flex: 1; display: flex; flex-direction: column; gap: 6px;
        }
        .level-text-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 11px; font-weight: 800; color: var(--text-main);
        }
        .progress-track {
          width: 100%; height: 8px; background: rgba(255,255,255,0.1);
          border-radius: 10px; overflow: hidden;
        }
        .progress-fill {
          height: 100%; border-radius: 10px;
          background: linear-gradient(90deg, #1f3cff, #bc13fe);
          transition: width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* 🔥 GRID KADO JUMBO (3 KOLOM) 🔥 */
        .gift-list-3d-wrapper {
          flex: 1; overflow-y: auto; padding: 10px 15px 40px 15px;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 12px;
          scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }

        /* ITEM CONTAINER UTAMA */
        .gift-item-3d {
          position: relative;
          height: 140px; /* Tinggi Fix biar layout gak lompat */
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
        }

        /* GAMBAR KADO DEFAULT (JUMBO) */
        .gift-img-3d {
          width: 75px; height: 75px; object-fit: contain;
          filter: drop-shadow(0 6px 8px rgba(0,0,0,0.3));
          position: absolute; top: 15px;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 2;
        }

        /* TEKS KADO (SEBELUM DIPILIH) */
        .gift-default-info {
          display: flex; flex-direction: column; align-items: center;
          margin-bottom: 10px; opacity: 1; transition: opacity 0.2s;
        }
        .gift-label { font-size: 11px; font-weight: 800; color: var(--text-main); text-transform: uppercase; }
        .gift-price-mini { font-size: 11px; color: var(--text-muted); font-weight: 700; display: flex; align-items: center; gap: 2px; }

        /* 🔥 BOX AKTIF (KELUAR DARI BAWAH) 🔥 */
        .gift-active-bg {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 100px; /* Box lebih pendek dari total container */
          background: linear-gradient(180deg, rgba(31,60,255,0.08) 0%, rgba(31,60,255,0.15) 100%);
          border: 1px solid rgba(31,60,255,0.4);
          border-radius: 16px; z-index: 0;
          box-shadow: 0 10px 25px rgba(31,60,255,0.2);
          animation: popBox 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
          padding-bottom: 8px;
        }
        @keyframes popBox {
          from { transform: scale(0.6) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* GAMBAR POP OUT KE ATAS KETIKA DIPILIH */
        .gift-item-3d.active .gift-img-3d {
          width: 90px; height: 90px;
          top: -10px; /* Tembus ke atas box */
          filter: drop-shadow(0 15px 12px rgba(0,0,0,0.5));
          animation: floatActive 2s ease-in-out infinite;
        }
        @keyframes floatActive {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* HILANGKAN TEKS LAMA SAAT DIPILIH */
        .gift-item-3d.active .gift-default-info { opacity: 0; pointer-events: none; }

        /* KONTEN DALAM BOX (HARGA & TOMBOL KIRIM) */
        .gift-active-details {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          z-index: 2; animation: fadeInDetails 0.4s ease forwards;
        }
        @keyframes fadeInDetails {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .gift-price-active {
          font-size: 13px; color: #f59e0b; font-weight: 900;
          display: flex; align-items: center; gap: 2px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .gift-send-btn {
          background: linear-gradient(135deg, #1f3cff, #bc13fe);
          color: white; border: none; border-radius: 12px;
          padding: 6px 20px; font-weight: 800; font-size: 11px;
          box-shadow: 0 4px 10px rgba(31,60,255,0.4);
          cursor: pointer; pointer-events: auto;
        }

        /* 🔥 EFEK 3D KETIKA SPAM/DIKLIK 🔥 */
        .gift-item-3d.spam-anim .gift-active-bg {
          transform: scale(0.9); background: rgba(31,60,255,0.3); border-color: #bc13fe;
          transition: 0.1s;
        }
        .gift-item-3d.spam-anim .gift-img-3d {
          transform: scale(0.8) translateY(10px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
          transition: 0.1s;
        }
        .gift-item-3d.spam-anim .gift-send-btn {
          transform: scale(0.9); box-shadow: 0 0 0 rgba(0,0,0,0);
        }
      `}</style>

      {/* OVERLAY */}
      <div id="room-drawer-overlay" className="drawer-overlay" onClick={(e) => { setSelectedGift(null); window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e); }}></div>

      {/* LACI KADO */}
      <div id="room-gift-drawer" className="gift-drawer" onClick={() => setSelectedGift(null)}>
        <div className="handle"></div> 
        
        {/* HEADER */}
        <div className="drawer-header" style={{ padding: '0 20px', marginBottom: '15px' }}>
          <span className="drawer-title">{t('send_gift_title', 'KIRIM HADIAH')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="coin-panel">
              <span id="user-coins">{myProfile?.coins?.toLocaleString('id-ID') || 0}</span>
            </div>
            <span className="material-icons" onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)} style={{ color: '#94a3b8', fontSize: '26px', cursor: 'pointer' }}>cancel</span>
          </div>
        </div>

        {/* 🔥 HEADER LEVEL BAR (BARU & PREMIUM) 🔥 */}
        <div className="drawer-top-level" onClick={(e) => e.stopPropagation()}>
          <div className="level-avatar-box">
            <img src={myProfile?.avatar_url || '/asets/png/profile.webp'} className="level-avatar" alt="Avatar" />
            <span className="level-badge-mini">Lv.{currentLevel}</span>
          </div>
          <div className="level-progress-info">
            <div className="level-text-row">
              <span>{myProfile?.username || 'User'}</span>
              <span style={{ color: 'var(--primary-blue)' }}>{currentExp} / {maxExp} EXP</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* CONTAINER TARGET (Dari Voice Room) */}
        <div className="target-selection-container" style={{ padding: '0 20px' }}>
          <span className="target-label" style={{ marginBottom: '8px' }}>{t('send_to_label', 'KIRIM KE:')}</span>
          <div id="gift-targets" className="target-list" onClick={(e) => e.stopPropagation()}></div>
        </div>

        {/* 🔥 DAFTAR KADO (3D GRID - NO BOX DEFAULT) 🔥 */}
        <div className="gift-list-3d-wrapper">
          {GIFTS.map((gift) => {
            const isActive = selectedGift?.id === gift.id;
            const isSpam = spamAnimId === gift.id;

            return (
              <div 
                key={gift.id}
                className={`gift-item-3d ${isActive ? 'active' : ''} ${isSpam ? 'spam-anim' : ''}`} 
                onClick={(e) => {
                  e.stopPropagation(); // Biar gak n-trigger onClick parent yang ngebatalin pilihan
                  handleGiftAction(gift, e);
                }}
              >
                {/* Gambar selalu ada, posisinya diubah lewat CSS pas active */}
                <img src={gift.img} className="gift-img-3d" alt={gift.name} />
                
                {/* Tampilan Default (Tanpa Box) */}
                {!isActive && (
                  <div className="gift-default-info">
                    <span className="gift-label">{gift.name}</span>
                    <span className="gift-price-mini"><span className="material-icons" style={{ fontSize: '10px' }}>toll</span>{gift.price}</span>
                  </div>
                )}

                {/* 🔥 Tampilan Active (Box Keluar + Tombol Kirim) 🔥 */}
                {isActive && (
                  <div className="gift-active-bg">
                    <div className="gift-active-details">
                      <span className="gift-price-active">
                        <span className="material-icons" style={{ fontSize: '12px' }}>toll</span>
                        {gift.price.toLocaleString('id-ID')}
                      </span>
                      {/* Tombol Kirim Pindah ke Dalem Box */}
                      <button className="gift-send-btn" onClick={(e) => handleGiftAction(gift, e)}>
                        KIRIM
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
