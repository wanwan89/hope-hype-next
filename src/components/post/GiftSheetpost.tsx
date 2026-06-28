'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

// 🔥 IMPORT RUMUS SAKTI 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

// 🔥 IMPORT FILE LOTTIE (JSON) 🔥
import tigerJson from '@/assets/gifts/tiger.json';
import dogJson from '@/assets/gifts/dog.json';

const GIFT_DATA = [
  { id: 1, name: 'Tiger', amount: 1, animation: tigerJson },
  { id: 2, name: 'Dog', amount: 5, animation: dogJson },
];

// 1. KOMPONEN SVG KOIN
const CoinIcon = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" className={className}>
    <path fill="#eab308" d="M207.58 63.84C186.85 53.48 159.33 48 128 48s-58.85 5.48-79.58 15.84S16 88.78 16 104v48c0 15.22 11.82 29.85 32.42 40.16S96.67 208 128 208s58.85-5.48 79.58-15.84S240 167.22 240 152v-48c0-15.22-11.82-29.85-32.42-40.16m-87.58 96v32c-19-.62-35-3.42-48-7.49v-31.3a203.4 203.4 0 0 0 48 6.81Zm16 0a203.4 203.4 0 0 0 48-6.81v31.31c-13 4.07-29 6.87-48 7.49ZM32 152v-18.47a83 83 0 0 0 16.42 10.63c2.43 1.21 5 2.35 7.58 3.43V178c-15.83-7.84-24-17.71-24-26m168 26v-30.41c2.61-1.08 5.15-2.22 7.58-3.43A83 83 0 0 0 224 133.53V152c0 8.29-8.17 18.16-24 26"/>
  </svg>
);

export default function GiftSheetpost() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [isLottieReady, setIsLottieReady] = useState(false);
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
    let timer: NodeJS.Timeout;
    if (isActive) {
      timer = setTimeout(() => setIsLottieReady(true), 200); 
    } else {
      setIsLottieReady(false);
    }
    return () => clearTimeout(timer);
  }, [isActive]);

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

        setIsActive(true);
        document.body.style.overflow = "hidden";
        fetchUser(); 
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

      setIsActive(true);
      document.body.style.overflow = "hidden";
      fetchUser(); 
    };

    window.addEventListener("openGift", handleOpenFromComment);
    return () => window.removeEventListener("openGift", handleOpenFromComment);
  }, [t]);

  const closeSheet = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setTimeout(() => setSelectedGift(null), 300); 
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

    const rawPostId = targetPost.id;
    const safePostId = (rawPostId && rawPostId !== 'undefined' && rawPostId !== 'null') 
      ? (isNaN(Number(rawPostId)) ? rawPostId : Number(rawPostId)) 
      : null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan login kembali.");

      const { error: rpcErr } = await supabase.rpc("transfer_coins", { 
        sender_id: session.user.id, 
        receiver_id: targetPost.creatorId, 
        amount: giftToSend.amount 
      });
      if (rpcErr) throw rpcErr;

      const newTotalGiftSent = coinsGiven + giftToSend.amount;
      const newLevel = calculateLevel(newTotalGiftSent);
      
      await supabase.from("profiles").update({ 
          total_gift_sent: newTotalGiftSent,
          level: newLevel
      }).eq('id', session.user.id);

      await Promise.all([
        supabase.from("gift_transactions").insert({ 
          sender_id: session.user.id, 
          receiver_id: targetPost.creatorId, 
          post_id: safePostId, 
          amount: giftToSend.amount 
        }).then(({error}) => { if (error) console.warn("RLS Gift Transaction diabaikan"); }),
  
        supabase.from("coin_history").insert([
          { user_id: session.user.id, type: "keluar", transaction_type: "keluar", amount: giftToSend.amount, description: `Kirim kado ke ${targetPost.creatorName}` },
          { user_id: targetPost.creatorId, type: "masuk", transaction_type: "masuk", amount: giftToSend.amount, description: `Terima kado` }
        ]),
  
        supabase.from("notifications").insert({ 
          user_id: targetPost.creatorId, 
          actor_id: session.user.id, 
          post_id: safePostId, 
          type: "gift", 
          message: `mengirimkan hadiah senilai ${giftToSend.amount} koin` 
        })
      ]);

      window.dispatchEvent(new CustomEvent('insertGiftComment', {
        detail: {
          postId: targetPost.id,
          giftName: giftToSend.name,
          giftAnimation: giftToSend.animation, 
          creatorId: targetPost.creatorId
        }
      }));

      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(newTotalGiftSent);
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100002 });
      
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

  const currentLevel = calculateLevel(coinsGiven); 
  let targetKoin = currentLevel * 500;
  let prevTarget = (currentLevel - 1) * 500;
  let progressPercent = ((coinsGiven - prevTarget) / (targetKoin - prevTarget)) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <>
      <style>{`
        .gift-sheet-content-framer {
          background: var(--bg-card, #121212);
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
          z-index: 100000;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        }
        
        .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin-bottom: 15px; }
        
        .drawer-top-level { 
          display: flex; align-items: center; gap: 12px; 
          padding: 12px 0px; margin: 0 20px 15px 20px; 
          border-bottom: 1px solid var(--border-card, #2a2a2a); 
        }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; }
        /* 🔥 Border profile dihilangkan 🔥 */
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: none; }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: var(--text-main, #fff); }
        .progress-track { width: 100%; height: 8px; background: var(--bg-secondary, #2a2a2a); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #1f3cff; transition: width 0.5s ease; }

        .target-selection-container { padding: 0 20px; margin-bottom: 15px; }
        /* 🔥 Box kreator dirapikan (tanpa border biru, disamakan dengan koin) 🔥 */
        .target-box { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-secondary, #1e1e1e); padding: 8px 16px; border-radius: 12px; border: none; }

        .gift-grid-container {
          padding: 10px 20px 30px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 16px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .gift-item-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 16px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        
        .gift-item-card.selected {
          background: rgba(31, 60, 255, 0.1);
          border-color: #1f3cff;
        }

        .gift-lottie-wrapper {
          width: 80px;
          height: 80px;
          margin-bottom: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.3s ease;
        }
        
        .gift-item-card.selected .gift-lottie-wrapper {
          transform: translateY(-5px) scale(1.1);
        }

        .gift-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .gift-name {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-main, #fff);
          text-transform: uppercase;
        }

        .gift-price {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted, #a1a1aa);
        }
        
        .drawer-footer { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); 
          background: var(--bg-card, #121212); border-top: 1px solid var(--border-card, #2a2a2a); 
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
              transition={{ duration: 0.2 }}
              className="gift-sheet-overlay" 
              onClick={closeSheet} 
              /* 🔥 Efek blur dihilangkan (hanya solid hitam transparan) 🔥 */
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
              <div className="sheet-handle" style={{ width: '40px', height: '4px', background: 'var(--border-card, #333)', borderRadius: '4px', margin: '0 auto 15px auto' }} />

              <div className="drawer-header">
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main, #fff)' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
                <span className="material-icons" onClick={closeSheet} style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
              </div>

              <div className="drawer-top-level">
                <div className="level-avatar-box">
                  <img src={myProfile?.avatar_url || fallbackAvatar} className="level-avatar" alt="Avatar" />
                  {/* 🔥 Jarak badge ke profile dijauhkan (bottom jadi -14px) 🔥 */}
                  <div style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                     <span dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(currentLevel) }} />
                  </div>
                </div>
                <div className="level-progress-info">
                  <div className="level-text-row">
                    <span style={{ marginLeft: '6px', color: 'var(--text-main, #fff)' }}>{myProfile?.username || 'User'}</span>
                    {/* 🔥 Teks butuh koin dihapus (hanya tampil jika max) 🔥 */}
                    {currentLevel >= 50 && (
                      <span style={{ color: '#ff0844' }}>LEVEL MAX 👑</span>
                    )}
                  </div>
                  <div className="progress-track" style={{ marginLeft: '6px' }}>
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="target-selection-container">
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted, #a1a1aa)', display: 'block', marginBottom: '8px' }}>
                  {t('send_to_label', 'KIRIM KE:')}
                </span>
                {/* 🔥 SVG profile dihapus dari box kreator 🔥 */}
                <div className="target-box">
                  <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main, #fff)' }}>{targetPost.creatorName}</span>
                </div>
              </div>

              <div className="gift-grid-container">
                {GIFT_DATA.map((gift) => {
                  const isActiveGift = selectedGift?.id === gift.id;

                  return (
                    <div 
                      key={gift.id}
                      className={`gift-item-card ${isActiveGift ? 'selected' : ''}`}
                      onClick={() => setSelectedGift(gift)}
                    >
                      <div className="gift-lottie-wrapper">
                        {isLottieReady ? (
                           <Lottie 
                             animationData={gift.animation} 
                             loop={true} 
                             style={{ width: '100%', height: '100%' }}
                           />
                        ) : (
                           <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        )}
                      </div>

                      <div className="gift-info">
                        <span className="gift-name">{gift.name}</span>
                        <span className="gift-price">
                          <CoinIcon size={12} />
                          {gift.amount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="drawer-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '14px', background: 'var(--bg-secondary, #1e1e1e)', padding: '8px 14px', borderRadius: '12px', color: 'var(--text-main, #fff)' }}>
                  <CoinIcon size={20} />
                  <span>{userCoins.toLocaleString('id-ID')}</span>
                </div>
                <button 
                  onClick={() => handleSendGift()}
                  disabled={!selectedGift || isSending}
                  style={{
                    /* 🔥 Warna dirubah ke solid biru 🔥 */
                    background: '#1f3cff', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '20px', fontWeight: 800, fontSize: '14px',
                    opacity: (!selectedGift || isSending) ? 0.5 : 1, cursor: (!selectedGift || isSending) ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => { if (selectedGift && !isSending) e.currentTarget.style.transform = 'scale(0.95)'; }}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {/* 🔥 Template literal langsung untuk menghindari bug terjemahan {{amount}} 🔥 */}
                  {isSending ? t('sending', 'MENGIRIM...') : selectedGift ? `Kirim ${selectedGift.amount} Koin` : t('btn_send', 'KIRIM')}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
