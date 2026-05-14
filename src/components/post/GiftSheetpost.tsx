'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

// 🔥 IMPORT RUMUS SAKTI 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

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
  
  const [targetPost, setTargetPost] = useState({ id: '', creatorId: '', creatorName: '' });

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from("profiles").select("id, username, avatar_url, coins, total_gift_sent, level").eq("id", session.user.id).single();
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
    const handleOpenFromComment = async (e: any) => {
      const { creatorId, postId, creatorName } = e.detail; 
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      
      if (session.user.id === creatorId) {
        if ((window as any).showNotif) (window as any).showNotif("Tidak bisa mengirim kado ke postingan sendiri!", "warning");
        return;
      }

      setTargetPost({
        id: postId,
        creatorId: creatorId,
        creatorName: creatorName || t('creator_label')
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
    setSelectedGift(null);
  };

  const handleSendGift = async (gift?: any, e?: any) => {
    if (e) e.stopPropagation();
    
    const giftToSend = gift || selectedGift;
    if (!giftToSend || isSending) return;

    if (giftToSend.amount > userCoins) {
      if ((window as any).showNotif) (window as any).showNotif("Koin tidak cukup!", "error");
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan login kembali.");

      // 1. Potong Koin
      const { error: rpcErr } = await supabase.rpc("transfer_coins", { 
        sender_id: session.user.id, 
        receiver_id: targetPost.creatorId, 
        amount: giftToSend.amount 
      });
      if (rpcErr) throw rpcErr;

      // 2. 🔥 FIX: Hitung Level Baru & Update Profil di Database 🔥
      const newTotalGiftSent = coinsGiven + giftToSend.amount;
      const newLevel = calculateLevel(newTotalGiftSent);
      
      await supabase.from("profiles").update({ 
          total_gift_sent: newTotalGiftSent,
          level: newLevel
      }).eq('id', session.user.id);

      // 3. Catat di transaksi, history, dan notifikasi
      await Promise.all([
        supabase.from("gift_transactions").insert({ 
          sender_id: session.user.id, 
          receiver_id: targetPost.creatorId, 
          post_id: parseInt(targetPost.id) || null, 
          amount: giftToSend.amount 
        }).then(({error}) => { if (error) console.warn("RLS Gift Transaction diabaikan"); }),
  
        supabase.from("coin_history").insert([
          { user_id: session.user.id, type: "keluar", transaction_type: "keluar", amount: giftToSend.amount, description: `Kirim kado ke ${targetPost.creatorName}` },
          { user_id: targetPost.creatorId, type: "masuk", transaction_type: "masuk", amount: giftToSend.amount, description: `Terima kado` }
        ]),
  
        supabase.from("notifications").insert({ 
          user_id: targetPost.creatorId, actor_id: session.user.id, post_id: parseInt(targetPost.id) || null, type: "gift", 
          message: `mengirimkan hadiah senilai ${giftToSend.amount} koin` 
        })
      ]);

      // 4. Trigger komentar otomatis
      window.dispatchEvent(new CustomEvent('insertGiftComment', {
        detail: {
          postId: targetPost.id,
          giftName: giftToSend.name,
          giftImg: giftToSend.img,
          creatorId: targetPost.creatorId
        }
      }));

      // 5. Update State Lokal biar bar naik
      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(newTotalGiftSent);
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100002 });
      
      if ((window as any).showBigImage) (window as any).showBigImage(giftToSend.img);
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

  // 🔥 LOGIKA KALKULASI LEVEL UNTUK TAMPILAN BAR 🔥
  const currentLevel = calculateLevel(coinsGiven); 
  let targetKoin = currentLevel * 500;
  let prevTarget = (currentLevel - 1) * 500;
  let needed = targetKoin - coinsGiven;
  let progressPercent = ((coinsGiven - prevTarget) / (targetKoin - prevTarget)) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <>
      <style>{`
        .gift-sheet-content-framer {
          /* 🔥 FIX 2: SINKRON TEMA DARK/LIGHT MODE 🔥 */
          background: var(--bg-card, #ffffff);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding-top: 15px;
          display: flex;
          flex-direction: column;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 95vh;
          z-index: 100000;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
          overflow: visible; 
        }
        
        .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin-bottom: 15px; }
        
        .drawer-top-level { display: flex; align-items: center; gap: 12px; background: transparent; padding: 12px 0px; margin: 0 20px 15px 20px; border-bottom: 1px solid var(--border-card); }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; z-index: 10; }
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: var(--text-main); }
        .progress-track { width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #1f3cff; transition: width 0.5s ease; }

        .target-selection-container { padding: 0 20px; margin-bottom: 10px; }
        .target-box { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-secondary); padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(31, 60, 255, 0.3); }

        .gift-list-3d-wrapper {
          padding: 80px 15px 40px 15px; 
          display: flex; gap: 15px; 
          overflow-x: auto; 
          overflow-y: hidden; 
          scrollbar-width: none;
        }
        .gift-list-3d-wrapper::-webkit-scrollbar { display: none; }
        .gift-column { display: flex; flex-direction: column; gap: 40px; flex-shrink: 0; width: calc(33.333% - 10px); } 
        
        .drawer-footer { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); 
          background: var(--bg-card, #ffffff); border-top: 1px solid var(--border-card); 
          position: sticky; bottom: 0; z-index: 50; 
        }
      `}</style>

      <AnimatePresence>
        {isActive && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="gift-sheet-overlay" 
              onClick={closeSheet} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999 }}
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="gift-sheet-content-framer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-handle" style={{ width: '40px', height: '4px', background: 'var(--border-card)', borderRadius: '4px', margin: '0 auto 15px auto' }} />

              <div className="drawer-header">
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
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
                    <span style={{ marginLeft: '6px', color: 'var(--text-main)' }}>{myProfile?.username || 'User'}</span>
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

              <div className="target-selection-container">
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  {t('send_to_label', 'KIRIM KE:')}
                </span>
                <div className="target-box">
                  <span className="material-icons" style={{ fontSize: '16px', color: '#1f3cff' }}>account_circle</span>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>{targetPost.creatorName}</span>
                </div>
              </div>

              <div className="gift-list-3d-wrapper">
                {Array.from({ length: Math.ceil(GIFT_DATA.length / 2) }).map((_, colIndex) => (
                  <div key={colIndex} className="gift-column">
                    {GIFT_DATA.slice(colIndex * 2, colIndex * 2 + 2).map((gift) => {
                      const isActiveGift = selectedGift?.id === gift.id;

                      return (
                        <div 
                          key={gift.id}
                          onClick={() => setSelectedGift(gift)}
                          style={{ 
                            position: 'relative', height: '120px', width: '100%', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', 
                            justifyContent: 'flex-end', cursor: 'pointer', zIndex: isActiveGift ? 50 : 1 
                          }}
                        >
                          <motion.div
                            animate={{
                              y: isActiveGift ? -40 : 0, 
                              scale: isActiveGift ? 1.3 : 1, 
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            style={{ position: 'absolute', zIndex: 2, bottom: '30px', pointerEvents: 'none' }}
                          >
                            <motion.img 
                              src={gift.img} 
                              alt={gift.name} 
                              style={{ width: '90px', height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.4))' }}
                              animate={isActiveGift ? { y: [-5, 5, -5] } : { y: 0 }}
                              transition={isActiveGift ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                            />
                          </motion.div>

                          <AnimatePresence>
                            {isActiveGift && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
                                  border: '1.5px solid #1f3cff', borderRadius: '12px', background: 'rgba(0,0,0,0.3)',
                                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', 
                                  alignItems: 'center', paddingBottom: '6px'
                                }}
                              >
                                <span style={{ fontSize: '11px', color: '#1f3cff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                                  <span className="material-icons" style={{ fontSize: '11px' }}>toll</span>
                                  {gift.amount.toLocaleString('id-ID')}
                                </span>
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => handleSendGift(gift, e)}
                                  style={{ background: '#1f3cff', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 22px', fontWeight: 800, fontSize: '11px' }}
                                >
                                  {isSending ? '...' : 'KIRIM'}
                                </motion.button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <motion.div 
                            animate={{ opacity: isActiveGift ? 0 : 1, y: isActiveGift ? 10 : 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '5px' }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>{gift.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span className="material-icons" style={{ fontSize: '10px' }}>toll</span>{gift.amount}
                            </span>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div className="drawer-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '14px', background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '12px', color: 'var(--text-main)' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '20px' }}>toll</span>
                  <span>{userCoins.toLocaleString('id-ID')}</span>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSendGift()}
                  disabled={!selectedGift || isSending}
                  style={{
                    background: 'linear-gradient(135deg, #1f3cff, #bc13fe)', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '20px', fontWeight: 800, fontSize: '14px',
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
