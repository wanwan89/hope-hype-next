'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; // 🔥 IMPORT FRAMER MOTION

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

export default function GiftDrawerroom() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [coinsGiven, setCoinsGiven] = useState(0);
  
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
    const handleOpenFromFooter = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      
      // Karena ini untuk Voice Room, targetnya mungkin pemilik room atau open
      // Sesuaikan creatorId dengan logika room lu. Untuk sekarang, kita anggap targetnya ada di context
      setTargetPost({
        id: 'room-target', // Placeholder
        creatorId: 'room-host-id', // Placeholder
        creatorName: 'Host Room'
      });

      await fetchUser();
      setIsActive(true);
      document.body.style.overflow = "hidden";
    };

    // 🔥 NANGKEP SINYAL DARI FOOTER 🔥
    window.addEventListener('openRoomGift', handleOpenFromFooter);
    return () => window.removeEventListener('openRoomGift', handleOpenFromFooter);
  }, []);

  const closeSheet = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setSelectedGift(null);
  };

  const handleSendGift = async (gift?: any, e?: any) => {
    // 🔥 PENTING BIAR KLIK TOMBOL GAK BIKIN KADO KETUTUP/KE-SELECT ULANG 🔥
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const giftToSend = gift || selectedGift;
    if (!giftToSend || isSending) return;

    if (giftToSend.amount > userCoins) {
      if ((window as any).showNotif) (window as any).showNotif("Koin tidak cukup! Silakan Top Up", "error");
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan login kembali.");

      if (session.user.id === targetPost.creatorId) {
          throw new Error("Tidak bisa mengirim kado ke diri sendiri.");
      }

      const { error: rpcErr } = await supabase.rpc("transfer_coins", { 
        sender_id: session.user.id, 
        receiver_id: targetPost.creatorId, 
        amount: giftToSend.amount 
      });
      
      if (rpcErr) throw rpcErr;

      await Promise.all([
        supabase.from("gift_transactions").insert({ 
          sender_id: session.user.id, 
          receiver_id: targetPost.creatorId, 
          post_id: parseInt(targetPost.id) || 0, // Handler kalau bukan post
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

      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(prev => prev + giftToSend.amount);
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100005 });
      
      if ((window as any).showNotif) (window as any).showNotif("Kado berhasil dikirim!", "success");

      setTimeout(() => {
        closeSheet();
      }, 300);

    } catch (err: any) {
      if ((window as any).showNotif) (window as any).showNotif(err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

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
        /* 🔥 CSS Reset & Fix buat Framer Motion 🔥 */
        .gift-sheet-content-framer {
          background: var(--bg-base, #121212);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding-top: 15px;
          display: flex;
          flex-direction: column;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 90vh;
          z-index: 100001; /* Pastikan tinggi */
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          overflow: visible; 
        }
        
        .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin-bottom: 15px; }
        
        .drawer-top-level { display: flex; align-items: center; gap: 12px; background: transparent; padding: 12px 0px; margin: 0 20px 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; z-index: 10; }
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: var(--text-main); }
        .progress-track { width: 100%; height: 8px; background: rgba(150,150,150,0.2); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #1f3cff; transition: width 0.5s ease; }

        .gift-list-3d-wrapper {
          padding: 20px 15px 40px 15px;
          display: flex; gap: 15px; overflow-x: auto; overflow-y: visible; 
          scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }
        .gift-column { display: flex; flex-direction: column; gap: 30px; flex-shrink: 0; width: calc(33.333% - 10px); }
        
        .drawer-footer { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); 
          background: var(--bg-base, #121212); border-top: 1px solid rgba(255,255,255,0.05); 
          position: sticky; bottom: 0; z-index: 50; 
        }

        /* 🔥 FIX KLIK TOMBOL 🔥 */
        .gift-active-bg-box {
          position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
          border: 1.5px solid #1f3cff; border-radius: 12px; background: rgba(0,0,0,0.5);
          display: flex; flex-direction: column; justify-content: flex-end; 
          alignItems: center; padding-bottom: 6px;
          z-index: 30; /* Angkat kotak di atas gambar agar tombol terbaca jelas */
          pointer-events: none; /* Kotaknya tembus klik... */
        }

        .gift-send-btn-mini {
          background: #1f3cff; color: white; border: none; border-radius: 8px; 
          padding: 6px 22px; font-weight: 800; font-size: 11px; 
          cursor: pointer; 
          pointer-events: auto; /* ...tapi tombolnya BISA diklik! */
          position: relative;
          z-index: 40; /* Paling atas dari segala hal di dalam grid */
        }
      `}</style>

      <AnimatePresence>
        {isActive && (
          <>
            {/* OVERLAY */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="gift-sheet-overlay" 
              onClick={closeSheet} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000 }}
            />

            {/* MODAL KONTEN */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="gift-sheet-content-framer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-handle" style={{ width: '40px', height: '4px', background: '#555', borderRadius: '4px', margin: '0 auto 15px auto' }} />

              <div className="drawer-header">
                <span style={{ fontWeight: 800, fontSize: '16px' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
                <span className="material-icons" onClick={closeSheet} style={{ color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
              </div>

              <div className="drawer-top-level">
                <div className="level-avatar-box">
                  <img src={myProfile?.avatar_url || fallbackAvatar} className="level-avatar" alt="Avatar" />
                  <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
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

              {/* BUNGKUSAN LIST KADO DENGAN 3D FRAMER MOTION */}
              <div className="gift-list-3d-wrapper">
                {Array.from({ length: Math.ceil(GIFT_DATA.length / 2) }).map((_, colIndex) => (
                  <div key={colIndex} className="gift-column">
                    {GIFT_DATA.slice(colIndex * 2, colIndex * 2 + 2).map((gift) => {
                      const isActiveGift = selectedGift?.id === gift.id;

                      return (
                        <div 
                          key={gift.id}
                          // 🔥 Klik di seluruh item untuk memilih kado 🔥
                          onClick={() => setSelectedGift(gift)}
                          style={{ 
                            position: 'relative', height: '100px', width: '100%', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', 
                            justifyContent: 'flex-end', cursor: 'pointer', zIndex: isActiveGift ? 50 : 1 
                          }}
                        >
                          {/* Gambar Kado */}
                          <motion.img 
                            src={gift.img} 
                            alt={gift.name} 
                            animate={{
                              width: isActiveGift ? 130 : 85,
                              height: isActiveGift ? 130 : 85,
                              y: isActiveGift ? -60 : -10, 
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            style={{ position: 'absolute', zIndex: isActiveGift ? 20 : 2, objectFit: 'contain' }}
                            {...(isActiveGift && {
                              animate: { width: 130, height: 130, y: [-60, -70, -60] },
                              transition: { y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
                            })}
                          />

                          {/* Info Default (Nama & Harga) - Menghilang saat aktif */}
                          <motion.div 
                            animate={{ opacity: isActiveGift ? 0 : 1, y: isActiveGift ? 10 : 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '5px' }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>{gift.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span className="material-icons" style={{ fontSize: '10px' }}>toll</span>{gift.amount}
                            </span>
                          </motion.div>

                          {/* Kotak & Tombol saat Kado Dipilih */}
                          <AnimatePresence>
                            {isActiveGift && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="gift-active-bg-box"
                                style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '6px'
                                }}
                              >
                                <span style={{ fontSize: '11px', color: '#1f3cff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                                  <span className="material-icons" style={{ fontSize: '11px' }}>toll</span>
                                  {gift.amount.toLocaleString('id-ID')}
                                </span>
                                {/* 🔥 TOMBOL KIRIM - INI YANG KEMARIN GAK BISA DIKLIK 🔥 */}
                                <motion.button 
                                  className="gift-send-btn-mini"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => handleSendGift(gift, e)}
                                >
                                  {isSending ? '...' : 'KIRIM'}
                                </motion.button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Footer Modal */}
              <div className="drawer-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '12px' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '20px' }}>toll</span>
                  <span>{userCoins.toLocaleString('id-ID')}</span>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSendGift()}
                  disabled={!selectedGift || isSending}
                  className="btn-send-gift-footer"
                  style={{
                    opacity: (!selectedGift || isSending) ? 0.5 : 1
                  }}
                >
                  {isSending ? t('sending', 'MENGIRIM...') : selectedGift ? t('btn_send_amount', `KIRIM (${selectedGift.amount})`) : t('btn_send', 'KIRIM')}
                </motion.button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
