'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';

// 🔥 IMPORT RUMUS SAKTI DARI FILE BARU 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

import './GiftDrawerroom.css';


// 🔥 DAFTAR 10 GIFT 🔥
const GIFT_DATA = [
  { id: 1, name: 'Love', amount: 1, img: '/asets/png/gift1.png' },
  { id: 2, name: 'Daebak', amount: 10, img: '/asets/png/gift2.png' },
  { id: 3, name: 'Omoomo', amount: 50, img: '/asets/png/gift3.png' },
  { id: 4, name: 'Oppa', amount: 100, img: '/asets/png/gift4.png' },
  { id: 5, name: 'Fighting', amount: 2000, img: '/asets/png/gift5.png' },
  { id: 6, name: 'Saranghae', amount: 5000, img: '/asets/png/gift6.png' },
  { id: 7, name: 'Kiyowo', amount: 10000, img: '/asets/png/gift7.png' },
  { id: 8, name: 'Gomawo', amount: 25000, img: '/asets/png/gift8.png' },
  { id: 9, name: 'Daesang', amount: 50000, img: '/asets/png/gift9.png' },
  { id: 10, name: 'Sultan', amount: 100000, img: '/asets/png/gift10.png' },
];

export default function GiftSheetpost() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [coinsGiven, setCoinsGiven] = useState(0);
  const [spamAnimId, setSpamAnimId] = useState<number | null>(null);
  
  const [targetPost, setTargetPost] = useState({ id: '', creatorId: '', creatorName: '' });

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from("profiles").select("username, avatar_url, coins, total_gift_sent, level").eq("id", session.user.id).single();
      if (prof) {
        setMyProfile(prof);
        setUserCoins(prof.coins || 0);
        setCoinsGiven(prof.total_gift_sent || 0);
      }
    }
  };

  useEffect(() => {
    const handleGiftOpen = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".gift-btn") as HTMLElement;
      
      if (btn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
        
        // 🔥 PROTEKSI 1: CEK DIRI SENDIRI 🔥
        if (session.user.id === btn.dataset.creator) {
          if ((window as any).showNotif) (window as any).showNotif("Tidak bisa mengirim kado ke postingan sendiri!", "warning");
          return;
        }

        setTargetPost({
          id: btn.dataset.post || '',
          creatorId: btn.dataset.creator || '',
          creatorName: btn.dataset.name || t('creator_label')
        });

        await fetchUser();
        setIsActive(true);
        document.body.style.overflow = "hidden";
      }
    };

    document.body.addEventListener("click", handleGiftOpen);
    return () => document.body.removeEventListener("click", handleGiftOpen);
  }, [t]);

  useEffect(() => {
    const handleOpenFromComment = async (e: any) => {
      const { creatorId, postId } = e.detail;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      
      // 🔥 PROTEKSI 2: CEK DIRI SENDIRI DARI KOMENTAR 🔥
      if (session.user.id === creatorId) {
        if ((window as any).showNotif) (window as any).showNotif("Tidak bisa mengirim kado ke postingan sendiri!", "warning");
        return;
      }

      setTargetPost({
        id: postId,
        creatorId: creatorId,
        creatorName: t('creator_label')
      });

      await fetchUser();
      setIsActive(true);
      document.body.style.overflow = "hidden";
    };

    window.addEventListener("openGift", handleOpenFromComment);
    return () => window.removeEventListener("openGift", handleOpenFromComment);
  }, [t]);

  const closeSheet = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setSelectedGift(null); // Reset pilihan saat ditutup
  };

  const handleSendGift = async (gift?: any, e?: any) => {
    if (e) e.stopPropagation();
    
    // Support klik di gambar (langsung kirim) ATAU klik tombol kirim
    const giftToSend = gift || selectedGift;
    
    // 🔥 PROTEKSI 3: Kalau gak ada kado yang dipilih, stop! 🔥
    if (!giftToSend) return;
    
    // 🔥 PROTEKSI 4: Mencegah spam klik bertubi-tubi 🔥
    if (isSending) return;

    // 🔥 PROTEKSI 5: Cek Koin 🔥
    if (giftToSend.amount > userCoins) {
      if ((window as any).showNotif) (window as any).showNotif("Koin tidak cukup! Silakan Top Up", "error");
      return;
    }

    // Trigger Animasi (Opsional)
    setSpamAnimId(giftToSend.id);
    setTimeout(() => setSpamAnimId(null), 150); 

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan login kembali.");

      // 🔥 PROTEKSI 6: Cek ulang creator (Backend validation via RPC sebenernya, tapi frontend kita tahan juga) 🔥
      if (session.user.id === targetPost.creatorId) {
          throw new Error("Tidak bisa mengirim kado ke diri sendiri.");
      }

      // 1. RPC Transfer Koin (Ini yang paling aman dari RLS)
      const { error: rpcErr } = await supabase.rpc("transfer_coins", { 
        sender_id: session.user.id, 
        receiver_id: targetPost.creatorId, 
        amount: giftToSend.amount 
      });
      
      if (rpcErr) throw rpcErr;

      // 2. Catat Transaksi & History
      await Promise.all([
        supabase.from("gift_transactions").insert({ 
          sender_id: session.user.id, 
          receiver_id: targetPost.creatorId, 
          post_id: parseInt(targetPost.id), 
          amount: giftToSend.amount 
        }),
        supabase.from("coin_history").insert([
          { 
            user_id: session.user.id, 
            type: "keluar", 
            transaction_type: "keluar", 
            amount: giftToSend.amount, 
            description: `Kirim kado ke ${targetPost.creatorName}` 
          },
          { 
            user_id: targetPost.creatorId, 
            type: "masuk", 
            transaction_type: "masuk", 
            amount: giftToSend.amount, 
            description: `Terima kado` 
          }
        ])
      ]);

      // 3. Notifikasi
      const { data: sProf } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
      await supabase.from("notifications").insert({ 
        user_id: targetPost.creatorId, 
        actor_id: session.user.id, 
        post_id: parseInt(targetPost.id), 
        type: "gift", 
        message: `mengirimkan hadiah senilai ${giftToSend.amount} koin` 
      });

      // 4. Trigger ke Feed
      window.dispatchEvent(new CustomEvent('insertGiftComment', {
        detail: {
          postId: targetPost.id,
          giftName: giftToSend.name,
          giftImg: giftToSend.img,
          creatorId: targetPost.creatorId
        }
      }));

      // 5. Update UI instan (Koin dikurangi)
      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(prev => prev + giftToSend.amount);
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100002 });
      
      if ((window as any).showBigImage) (window as any).showBigImage(giftToSend.img);
      if ((window as any).showNotif) (window as any).showNotif("Kado berhasil dikirim!", "success");

      setTimeout(() => {
        closeSheet();
      }, 250);

    } catch (err: any) {
      if ((window as any).showNotif) (window as any).showNotif(err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  // 🔥 KALKULASI LEVEL BERSAMA DARI DATABASE 🔥
  const currentLevel = myProfile?.level || 1;
  
  let targetKoin = currentLevel * 500;
  let prevTarget = (currentLevel - 1) * 500;
  let needed = targetKoin - coinsGiven;
  let progressPercent = ((coinsGiven - prevTarget) / (targetKoin - prevTarget)) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <>
      <style>{`
        .gift-sheet-content {
          padding-bottom: 0 !important; max-height: 90vh;
          display: flex; flex-direction: column;
        }
        .drawer-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 20px; margin-bottom: 15px;
        }
        .drawer-top-level {
          display: flex; align-items: center; gap: 12px; background: transparent;
          padding: 12px 0px; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));
          margin: 0 20px 15px 20px;
        }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; }
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; background: var(--bg-secondary); }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; color: var(--text-main); }
        .progress-track { width: 100%; height: 8px; background: rgba(150,150,150,0.2); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; background: #1f3cff; transition: width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        .gift-list-3d-wrapper {
          padding: 15px 15px 25px 15px; display: flex; gap: 15px; overflow-x: auto; overflow-y: visible;
          scroll-snap-type: x mandatory; scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }
        .gift-column { display: flex; flex-direction: column; gap: 25px; flex-shrink: 0; width: calc(33.333% - 10px); scroll-snap-align: start; }
        
        .gift-item-3d { position: relative; height: 100px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer; -webkit-tap-highlight-color: transparent; z-index: 1; }
        .gift-item-3d.active { z-index: 10; }
        
        .gift-img-3d { width: 85px; height: 85px; object-fit: contain; filter: none; position: absolute; top: -10px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 2; }
        .gift-default-info { display: flex; flex-direction: column; align-items: center; margin-bottom: 5px; opacity: 1; transition: opacity 0.2s; }
        .gift-label { font-size: 11px; font-weight: 800; color: var(--text-main); text-transform: uppercase; }
        .gift-price-mini { font-size: 11px; color: var(--text-muted); font-weight: 700; display: flex; align-items: center; gap: 2px; }

        .gift-active-bg { position: absolute; bottom: 0; left: 0; right: 0; height: 55px; background: transparent; border: 1.5px solid #1f3cff; border-radius: 12px; box-shadow: none; animation: popBox 0.2s ease forwards; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 6px; }
        @keyframes popBox { from { transform: scale(0.8) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

        .gift-item-3d.active .gift-img-3d { width: 145px; height: 145px; top: -90px; filter: none; animation: floatActive 2s ease-in-out infinite; }
        @keyframes floatActive { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        
        .gift-item-3d.active .gift-default-info { opacity: 0; pointer-events: none; }
        .gift-active-details { display: flex; flex-direction: column; align-items: center; gap: 4px; animation: fadeInDetails 0.3s ease forwards; z-index: 2; }
        @keyframes fadeInDetails { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        .gift-price-active { font-size: 11px; color: #1f3cff; font-weight: 800; display: flex; align-items: center; gap: 2px; }
        
        /* 🔥 TOMBOL KIRIM KADO (KUNCI UTAMA) 🔥 */
        .gift-send-btn { 
          background: #1f3cff; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          padding: 6px 22px; 
          font-weight: 800; 
          font-size: 11px; 
          cursor: pointer; 
          pointer-events: auto;
          transition: background 0.3s;
        }
        
        /* Kalau disabled/mati, tombol jadi abu-abu */
        .btn-send-gift-footer {
          background: linear-gradient(135deg, #1f3cff, #bc13fe);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(31, 60, 255, 0.4);
          transition: 0.2s;
          cursor: pointer;
        }
        .btn-send-gift-footer:disabled {
          background: #333 !important;
          color: #888 !important;
          box-shadow: none !important;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .btn-send-gift-footer:active:not(:disabled) {
          transform: scale(0.9);
        }

        .gift-item-3d.spam-anim .gift-active-bg { transform: scale(0.95); transition: 0.1s; background: rgba(31,60,255,0.1); }
        .gift-item-3d.spam-anim .gift-img-3d { transform: scale(0.9) translateY(5px); transition: 0.1s; }

        .drawer-footer { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); background: var(--bg-base); border-top: 1px solid var(--border-color, rgba(255,255,255,0.05)); }
        .footer-coin-box { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 14px; color: var(--text-main); background: var(--bg-secondary, rgba(0,0,0,0.05)); padding: 8px 14px; border-radius: 12px; }
      `}</style>

      <div className={`gift-sheet ${isActive ? 'active' : ''}`} onClick={closeSheet}>
        <div className="gift-sheet-overlay" />
        
        <div className="gift-sheet-content" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />

          <div className="drawer-header">
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
            <span className="material-icons" onClick={closeSheet} style={{ color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
          </div>

          <div className="drawer-top-level">
            <div className="level-avatar-box">
              <img src={myProfile?.avatar_url || fallbackAvatar} className="level-avatar" alt="Avatar" />
              <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }}>
                 <span dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(currentLevel) }} />
              </div>
            </div>
            <div className="level-progress-info">
              <div className="level-text-row">
                <span style={{ marginLeft: '6px' }}>{myProfile?.username || 'User'}</span>
                {currentLevel >= 50 ? (
                  <span style={{ color: '#ff0844' }}>LEVEL MAX 👑</span>
                ) : (
                  <span style={{ color: '#1f3cff' }}>Butuh {needed} koin</span>
                )}
              </div>
              <div className="progress-track" style={{ marginLeft: '6px' }}>
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="gift-list-3d-wrapper">
            {Array.from({ length: Math.ceil(GIFT_DATA.length / 2) }).map((_, colIndex) => (
              <div key={colIndex} className="gift-column">
                {GIFT_DATA.slice(colIndex * 2, colIndex * 2 + 2).map((gift) => {
                  const isActiveGift = selectedGift?.id === gift.id;
                  const isSpam = spamAnimId === gift.id;

                  return (
                    <div 
                      key={gift.id}
                      className={`gift-item-3d ${isActiveGift ? 'active' : ''} ${isSpam ? 'spam-anim' : ''}`} 
                      onClick={() => setSelectedGift(gift)}
                    >
                      <img src={gift.img} className="gift-img-3d" alt={gift.name} />
                      
                      {!isActiveGift && (
                        <div className="gift-default-info">
                          <span className="gift-label">{gift.name}</span>
                          <span className="gift-price-mini"><span className="material-icons" style={{ fontSize: '10px' }}>toll</span>{gift.amount}</span>
                        </div>
                      )}

                      {isActiveGift && (
                        <div className="gift-active-bg">
                          <div className="gift-active-details">
                            <span className="gift-price-active">
                              <span className="material-icons" style={{ fontSize: '11px' }}>toll</span>
                              {gift.amount.toLocaleString('id-ID')}
                            </span>
                            <button className="gift-send-btn" onClick={(e) => handleSendGift(gift, e)}>
                              {isSending ? '...' : 'KIRIM'}
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
          
          <div className="drawer-footer">
            <div className="footer-coin-box">
              <span className="material-icons" style={{ color: '#f59e0b', fontSize: '20px' }}>toll</span>
              <span>{userCoins.toLocaleString('id-ID')}</span>
            </div>
            {/* 🔥 PROTEKSI: Tombol mati kalau belum milih kado 🔥 */}
            <button 
              className="btn-send-gift-footer" 
              onClick={() => handleSendGift()}
              disabled={!selectedGift || isSending}
            >
              {isSending ? t('sending', 'MENGIRIM...') : selectedGift ? t('btn_send_amount', `KIRIM (${selectedGift.amount})`) : t('btn_send', 'KIRIM')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
