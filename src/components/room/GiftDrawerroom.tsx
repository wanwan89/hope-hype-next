'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; 
import Lottie from 'lottie-react';

// 🔥 IMPORT RUMUS SAKTI 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

// 🔥 IMPORT CSS 🔥
import './GiftDrawerroom.css';

// 🔥 IMPORT FILE LOTTIE (JSON) 🔥
import tigerJson from '@/assets/gifts/tiger.json';
import dogJson from '@/assets/gifts/dog.json';

const GIFT_DATA = [
  { id: 1, name: 'Tiger', amount: 1, animation: tigerJson },
  { id: 2, name: 'Dog', amount: 5, animation: dogJson },
];

// 🔥 KOMPONEN SVG KOIN OPTIMASI 🔥
const CoinIcon = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" className={className}>
    <path fill="#eab308" d="M207.58 63.84C186.85 53.48 159.33 48 128 48s-58.85 5.48-79.58 15.84S16 88.78 16 104v48c0 15.22 11.82 29.85 32.42 40.16S96.67 208 128 208s58.85-5.48 79.58-15.84S240 167.22 240 152v-48c0-15.22-11.82-29.85-32.42-40.16m-87.58 96v32c-19-.62-35-3.42-48-7.49v-31.3a203.4 203.4 0 0 0 48 6.81Zm16 0a203.4 203.4 0 0 0 48-6.81v31.31c-13 4.07-29 6.87-48 7.49ZM32 152v-18.47a83 83 0 0 0 16.42 10.63c2.43 1.21 5 2.35 7.58 3.43V178c-15.83-7.84-24-17.71-24-26m168 26v-30.41c2.61-1.08 5.15-2.22 7.58-3.43A83 83 0 0 0 224 133.53V152c0 8.29-8.17 18.16-24 26"/>
  </svg>
);

export default function GiftDrawerroom() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [isLottieReady, setIsLottieReady] = useState(false); 
  const [userCoins, setUserCoins] = useState(0);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [coinsGiven, setCoinsGiven] = useState(0);
  
  const [targetPost, setTargetPost] = useState({ id: '', creatorId: '', creatorName: '' });
  const [roomMembers, setRoomMembers] = useState<any[]>([]);

  const chunkedGifts = [];
  for (let i = 0; i < GIFT_DATA.length; i += 2) {
    chunkedGifts.push(GIFT_DATA.slice(i, i + 2));
  }

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from("profiles")
        .select("id, username, avatar_url, coins, total_gift_sent, level")
        .eq("id", session.user.id)
        .single();
        
      if (prof) {
        setMyProfile(prof);
        setUserCoins(prof.coins || 0);
        setCoinsGiven(prof.total_gift_sent || 0);
      }
    }
  };

  useEffect(() => {
    const handleOpenRoomGift = async (e: any) => {
      const members = e.detail?.roomMembers || [];
      const defaultTarget = e.detail?.targetId || null;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if ((window as any).dispatchEvent) {
          window.dispatchEvent(new CustomEvent('openLogin'));
        }
        return;
      }

      setRoomMembers(members);

      if (defaultTarget) {
        const target = members.find((m: any) => m.id === defaultTarget);
        if (target) setTargetPost({ id: '', creatorId: target.id, creatorName: target.name });
      } else if (members.length > 0) {
        setTargetPost({ id: '', creatorId: members[0].id, creatorName: members[0].name });
      }

      setIsActive(true);
      document.body.style.overflow = "hidden";
      fetchUser(); 
    };

    window.addEventListener("openRoomGift", handleOpenRoomGift);
    return () => window.removeEventListener("openRoomGift", handleOpenRoomGift);
  }, [t]);

  const closeSheet = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setIsLottieReady(false); 
    setTimeout(() => setSelectedGift(null), 300);
  };

  const handleSendGift = async (gift?: any, e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const giftToSend = gift || selectedGift;
    if (!giftToSend || isSending) return;

    if (!targetPost.creatorId) {
      if ((window as any).showNotif) (window as any).showNotif("Pilih penerima dulu!", "warning");
      return;
    }

    if (targetPost.creatorId === myProfile?.id) {
       if ((window as any).showNotif) (window as any).showNotif("Tidak bisa mengirim kado ke diri sendiri!", "warning");
       return;
    }

    if (giftToSend.amount > userCoins) {
      if ((window as any).showNotif) (window as any).showNotif("Koin tidak cukup! Silakan Top Up", "error");
      return;
    }

    setIsSending(true);

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
      
      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(newTotalGiftSent);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 1000000 });
      if ((window as any).showNotif) (window as any).showNotif("Kado berhasil dikirim!", "success");

      setTimeout(() => { closeSheet(); }, 300);
    } catch (err: any) {
      if ((window as any).showNotif) (window as any).showNotif(err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const currentLevel = calculateLevel(coinsGiven); 
  let prevTarget = (currentLevel - 1) * 500;
  let targetKoin = currentLevel * 500;
  let progressPercent = ((coinsGiven - prevTarget) / (targetKoin - prevTarget)) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <div className="in-voice-room">
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="drawer-overlay" 
              onClick={closeSheet} 
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="gift-drawer"
              onClick={(e) => e.stopPropagation()}
              onAnimationComplete={() => {
                if (isActive) setIsLottieReady(true);
              }}
            >
              <div className="handle" />

              <div className="drawer-header">
                <span className="drawer-title">{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
                <span className="material-icons" onClick={closeSheet} style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
              </div>

              <div className="drawer-top-level">
                <div className="level-avatar-box">
                  <img src={myProfile?.avatar_url || fallbackAvatar} className="level-avatar" alt="Avatar" />
                  <div style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                     <span dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(currentLevel) }} />
                  </div>
                </div>
                <div className="level-progress-info">
                  <div className="level-text-row">
                    <span style={{ marginLeft: '6px' }}>{myProfile?.username || 'User'}</span>
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
                <span className="target-label">PILIH PENERIMA:</span>
                <div className="target-list">
                  {roomMembers.map(member => (
                    <div 
                      key={member.id} 
                      className={`target-user ${targetPost.creatorId === member.id ? 'selected' : ''}`}
                      onClick={() => setTargetPost({ id: '', creatorId: member.id, creatorName: member.name })}
                    >
                      <img className="target-avatar" src={member.avatar || '/asets/png/profile.webp'} alt="Target" />
                      <span className="target-name">{member.name.substring(0, 10)}</span>
                    </div>
                  ))}
                  {roomMembers.length === 0 && (
                     <div style={{ fontSize: '12px', color: 'var(--text-muted, #a1a1aa)', fontStyle: 'italic', padding: '10px 0' }}>Tidak ada member di room...</div>
                  )}
                </div>
              </div>

              <div className="gift-list-scroll-wrapper">
                {chunkedGifts.map((column, colIdx) => (
                  <div className="gift-column" key={colIdx}>
                    {column.map((gift) => {
                      const isActiveGift = selectedGift?.id === gift.id;

                      return (
                        <div 
                          key={gift.id}
                          className={`gift-item-3d ${isActiveGift ? 'active' : ''}`}
                          onClick={() => setSelectedGift(gift)}
                        >
                          {/* 🔥 WADAH LOTTIE YANG SUDAH DIBENAHI 🔥 */}
                          <div className="gift-lottie-wrapper">
                            {isLottieReady ? (
                              <Lottie animationData={gift.animation} loop={true} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <div style={{ width: '60%', height: '60%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} /> 
                            )}
                          </div>

                          <div className="gift-default-info">
                            <span className="gift-label">{gift.name}</span>
                            <span className="gift-price-mini">
                              <CoinIcon size={10} />{gift.amount}
                            </span>
                          </div>

                          <AnimatePresence>
                            {isActiveGift && (
                              <motion.div 
                                className="gift-active-bg"
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                <div className="gift-active-details">
                                  <span className="gift-price-active">
                                    <CoinIcon size={12} />
                                    {gift.amount.toLocaleString('id-ID')}
                                  </span>
                                  <button 
                                    className="gift-send-btn"
                                    onClick={(e) => handleSendGift(gift, e)}
                                  >
                                    {isSending ? '...' : 'KIRIM'}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div className="drawer-footer">
                <div className="footer-coin-box">
                  <CoinIcon size={20} />
                  <span>{userCoins.toLocaleString('id-ID')}</span>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleSendGift(selectedGift, e)}
                  disabled={!selectedGift || isSending}
                  className="main-send-btn"
                >
                  {isSending ? t('sending', 'MENGIRIM...') : selectedGift ? `Kirim ${selectedGift.amount} Koin` : t('btn_send', 'KIRIM')}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
