'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './GiftDrawerroom.css';

declare global {
  interface Window {
    toggleRoomGiftDrawer?: (e?: any) => void;
    sendGift?: (giftName: string, harga: number | string, giftId: number | string, jumlah?: number) => void;
  }
}

// 🔥 LIST KADO LENGKAP 10 ITEM (Siap Di-Scroll) 🔥
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
  const [coinsGiven, setCoinsGiven] = useState(0);
  
  // 🔥 STATE LACI TOP UP 🔥
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('username, avatar_url, coins').eq('id', session.user.id).single();
        if (prof) setMyProfile(prof);

        const { data: giftData } = await supabase.from('gift_transactions').select('amount').eq('sender_id', session.user.id);
        const totalGiven = giftData?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
        setCoinsGiven(totalGiven);
      }
    };
    fetchUser();
  }, []);

  const triggerSendAnim = (id: number) => {
    setSpamAnimId(id);
    setTimeout(() => setSpamAnimId(null), 150); 
  };

  const handleTopUpClick = () => {
    setIsTopUpOpen(true); // Buka laci topup langsung di atas laci kado
  };

  const handleGiftAction = (gift: any, e: any) => {
    e.stopPropagation();
    if (selectedGift?.id === gift.id) {
      
      // CEK KOIN: Kalau kurang, otomatis buka Top Up
      if (myProfile && myProfile.coins < gift.price) {
        showNotif("Koin tidak cukup! Silakan Top Up", "warning");
        handleTopUpClick(); 
        return;
      }

      triggerSendAnim(gift.id);
      if (window.sendGift) window.sendGift(gift.name, gift.price, gift.id);
      
      if (myProfile) setMyProfile({ ...myProfile, coins: Math.max(0, myProfile.coins - gift.price) });
      setCoinsGiven(prev => prev + gift.price);

      setTimeout(() => {
        if (window.toggleRoomGiftDrawer) window.toggleRoomGiftDrawer();
        setSelectedGift(null);
      }, 250);

    } else {
      setSelectedGift(gift);
    }
  };

  let level = 1;
  let expNeeded = 200; 
  let remainingExp = coinsGiven;

  while (remainingExp >= expNeeded) {
    remainingExp -= expNeeded;
    level++;
    expNeeded = level * 200; 
  }

  const currentLevel = level;
  const currentExp = remainingExp;
  const maxExp = expNeeded;
  const progressPercent = Math.min(100, (currentExp / maxExp) * 100);

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <>
      <style>{`
        #room-gift-drawer {
          display: flex; flex-direction: column;
          padding-bottom: 0 !important; max-height: 90vh;
        }
        
        .drawer-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 20px; margin-bottom: 15px;
        }

        /* HEADER LEVEL BAR */
        .drawer-top-level {
          display: flex; align-items: center; gap: 12px; background: transparent;
          padding: 12px 0px; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));
          margin: 0 20px 15px 20px;
        }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; }
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; background: var(--bg-secondary); }
        .level-badge-mini {
          position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
          background: #1f3cff; color: white; font-size: 9px; font-weight: 800;
          padding: 2px 6px; border-radius: 8px; border: 1.5px solid var(--bg-base);
        }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; color: var(--text-main); }
        .progress-track { width: 100%; height: 8px; background: rgba(150,150,150,0.2); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; background: #1f3cff; transition: width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        .target-selection-container { padding: 0 20px; margin-bottom: 0; }
        #gift-targets { padding-top: 8px !important; padding-bottom: 8px !important; }
        #gift-targets .target-avatar { width: 44px !important; height: 44px !important; }

        /* 🔥 GRID KADO (SCROLL HORIZONTAL 10 KADO) 🔥 */
        .gift-list-3d-wrapper {
          padding: 15px 15px 25px 15px;
          display: flex; gap: 15px; overflow-x: auto; overflow-y: visible;
          scroll-snap-type: x mandatory; scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }

        .gift-column {
          display: flex; flex-direction: column; gap: 25px; flex-shrink: 0;
          width: calc(33.333% - 10px); /* 3 Kolom per frame, sisanya scroll */
          scroll-snap-align: start;
        }

        .gift-item-3d {
          position: relative; height: 100px; width: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          cursor: pointer; -webkit-tap-highlight-color: transparent; z-index: 1;
        }
        .gift-item-3d.active { z-index: 10; }

        /* GAMBAR KADO DEFAULT (MEMBESAR) */
        .gift-img-3d {
          width: 85px; height: 85px; object-fit: contain; filter: none;
          position: absolute; top: -10px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 2;
        }

        .gift-default-info {
          display: flex; flex-direction: column; align-items: center;
          margin-bottom: 5px; opacity: 1; transition: opacity 0.2s;
        }
        .gift-label { font-size: 11px; font-weight: 800; color: var(--text-main); text-transform: uppercase; }
        .gift-price-mini { font-size: 11px; color: var(--text-muted); font-weight: 700; display: flex; align-items: center; gap: 2px; }

        /* 🔥 BOX AKTIF (KECIL) 🔥 */
        .gift-active-bg {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 55px; /* SANGAT PENDEK BIAR GAMBAR KELUAR */
          background: transparent; border: 1.5px solid #1f3cff; border-radius: 12px; box-shadow: none; 
          animation: popBox 0.2s ease forwards;
          display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
          padding-bottom: 6px;
        }
        @keyframes popBox {
          from { transform: scale(0.8) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* 🔥 GAMBAR POP OUT SUPER EKSTRIM 🔥 */
        .gift-item-3d.active .gift-img-3d {
          width: 145px; height: 145px; /* GILA BESARNYA */
          top: -90px; /* TEMBUS KE ATAS JAUH */
          filter: none; animation: floatActive 2s ease-in-out infinite;
        }
        @keyframes floatActive {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .gift-item-3d.active .gift-default-info { opacity: 0; pointer-events: none; }
        .gift-active-details { display: flex; flex-direction: column; align-items: center; gap: 4px; animation: fadeInDetails 0.3s ease forwards; z-index: 2; }
        @keyframes fadeInDetails { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        .gift-price-active { font-size: 11px; color: #1f3cff; font-weight: 800; display: flex; align-items: center; gap: 2px; }
        .gift-send-btn {
          background: #1f3cff; color: white; border: none; border-radius: 8px;
          padding: 6px 22px; font-weight: 800; font-size: 11px; cursor: pointer; pointer-events: auto;
        }

        .gift-item-3d.spam-anim .gift-active-bg { transform: scale(0.95); transition: 0.1s; background: rgba(31,60,255,0.1); }
        .gift-item-3d.spam-anim .gift-img-3d { transform: scale(0.9) translateY(5px); transition: 0.1s; }

        /* 🔥 FOOTER BAWAH SOLID 🔥 */
        .drawer-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom));
          background: var(--bg-base); border-top: 1px solid var(--border-color, rgba(255,255,255,0.05));
        }
        .footer-coin-box {
          display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 14px; color: var(--text-main);
          background: var(--bg-secondary, rgba(0,0,0,0.05)); padding: 8px 14px; border-radius: 12px;
        }
        .topup-btn {
          display: flex; align-items: center; gap: 4px;
          background: #1f3cff; color: white; border: none; border-radius: 20px;
          padding: 10px 18px; font-weight: 800; font-size: 12px; cursor: pointer; transition: 0.2s;
        }
        .topup-btn:active { transform: scale(0.9); }

        /* 🔥 SLIDE UP TOP UP DI DALAM REACT 🔥 */
        .react-topup-sheet {
          position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; z-index: 100005;
          pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
        }
        .react-topup-sheet.active { pointer-events: auto; opacity: 1; }
        .react-topup-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        .react-topup-content {
          position: relative; background: #1b1b1f; padding: 20px; border-top-left-radius: 24px; border-top-right-radius: 24px;
          transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .react-topup-sheet.active .react-topup-content { transform: translateY(0); }
        .drag-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 10px; margin: 0 auto 15px; }
      `}</style>

      <div id="room-drawer-overlay" className="drawer-overlay" onClick={(e) => { setSelectedGift(null); window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e); }}></div>

      <div id="room-gift-drawer" className="gift-drawer" onClick={() => setSelectedGift(null)}>
        <div className="handle"></div> 
        
        <div className="drawer-header">
          <span className="drawer-title" style={{ fontSize: '16px' }}>{t('send_gift_title', 'KIRIM HADIAH')}</span>
          <span className="material-icons" onClick={(e) => window.toggleRoomGiftDrawer && window.toggleRoomGiftDrawer(e)} style={{ color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
        </div>

        <div className="drawer-top-level" onClick={(e) => e.stopPropagation()}>
          <div className="level-avatar-box">
            <img src={myProfile?.avatar_url || fallbackAvatar} className="level-avatar" alt="Avatar" />
            <span className="level-badge-mini">Lv.{currentLevel}</span>
          </div>
          <div className="level-progress-info">
            <div className="level-text-row">
              <span>{myProfile?.username || 'User'}</span>
              <span style={{ color: '#1f3cff' }}>{currentExp} / {maxExp}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="target-selection-container">
          <span className="target-label">{t('send_to_label', 'KIRIM KE:')}</span>
          <div id="gift-targets" className="target-list" onClick={(e) => e.stopPropagation()}></div>
        </div>

        {/* 🔥 DAFTAR KADO SCROLL HORIZONTAL (10 KADO, 5 KOLOM) 🔥 */}
        <div className="gift-list-3d-wrapper">
          {Array.from({ length: Math.ceil(GIFTS.length / 2) }).map((_, colIndex) => (
            <div key={colIndex} className="gift-column">
              {GIFTS.slice(colIndex * 2, colIndex * 2 + 2).map((gift) => {
                const isActive = selectedGift?.id === gift.id;
                const isSpam = spamAnimId === gift.id;

                return (
                  <div 
                    key={gift.id}
                    className={`gift-item-3d ${isActive ? 'active' : ''} ${isSpam ? 'spam-anim' : ''}`} 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      handleGiftAction(gift, e);
                    }}
                  >
                    <img src={gift.img} className="gift-img-3d" alt={gift.name} />
                    
                    {!isActive && (
                      <div className="gift-default-info">
                        <span className="gift-label">{gift.name}</span>
                        <span className="gift-price-mini"><span className="material-icons" style={{ fontSize: '10px' }}>toll</span>{gift.price}</span>
                      </div>
                    )}

                    {isActive && (
                      <div className="gift-active-bg">
                        <div className="gift-active-details">
                          <span className="gift-price-active">
                            <span className="material-icons" style={{ fontSize: '11px' }}>toll</span>
                            {gift.price.toLocaleString('id-ID')}
                          </span>
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
          ))}
        </div>

        <div className="drawer-footer" onClick={(e) => e.stopPropagation()}>
          <div className="footer-coin-box">
            <span className="material-icons" style={{ color: '#f59e0b', fontSize: '20px' }}>toll</span>
            <span>{myProfile?.coins?.toLocaleString('id-ID') || 0}</span>
          </div>
          <button className="topup-btn" onClick={handleTopUpClick}>
            <span className="material-icons" style={{ fontSize: '16px', fontWeight: 'bold' }}>add</span>
            TOP UP
          </button>
        </div>
      </div>

      {/* 🔥 SLIDE UP TOP UP DI DALAM COMPONENT (INTEGRASI ASTRO LOGIC) 🔥 */}
      <div className={`react-topup-sheet ${isTopUpOpen ? 'active' : ''}`}>
        <div className="react-topup-overlay" onClick={() => setIsTopUpOpen(false)}></div>
        <div className="react-topup-content">
          <div className="drag-handle"></div>
          <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Top Up Koin</h3>
          
          <div className="product-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="product-card coin-product-card" data-price="10000" data-coins="100" style={{ background: '#242429', padding: '12px 16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#2d2d33', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '22px' }}>toll</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="p-name" style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>100 Koin</span>
                  <span className="p-price" style={{ color: '#bdbdbd', fontSize: '12px' }}>Rp 10.000</span>
                </div>
              </div>
              <button className="buy-coin-btn" style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Beli</button>
            </div>

            <div className="product-card coin-product-card" data-price="25000" data-coins="300" style={{ background: '#242429', padding: '12px 16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#2d2d33', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '22px' }}>toll</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="p-name" style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>300 Koin</span>
                  <span className="p-price" style={{ color: '#bdbdbd', fontSize: '12px' }}>Rp 25.000</span>
                </div>
              </div>
              <button className="buy-coin-btn" style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Beli</button>
            </div>

            <div className="product-card coin-product-card" data-price="50000" data-coins="700" style={{ background: '#242429', padding: '12px 16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#2d2d33', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '22px' }}>toll</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="p-name" style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>700 Koin</span>
                  <span className="p-price" style={{ color: '#bdbdbd', fontSize: '12px' }}>Rp 50.000</span>
                </div>
              </div>
              <button className="buy-coin-btn" style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Beli</button>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ color: 'white', fontSize: '14px', margin: 0 }}>Custom Top Up</h4>
            <input type="number" id="custom-coins" placeholder="Masukkan jumlah koin" min="1" style={{ padding: '12px', borderRadius: '12px', background: '#2d2d33', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '14px' }} />
            <button id="buy-custom-coin-btn" style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', alignSelf: 'flex-start', cursor: 'pointer' }}>Beli</button>
          </div>
        </div>
      </div>
    </>
  );
}
