'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; 
import Lottie from 'lottie-react';

// 🔥 IMPORT RUMUS SAKTI 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

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
  const [isLottieReady, setIsLottieReady] = useState(false); // 🔥 Trik Anti-Lag Lottie
  const [userCoins, setUserCoins] = useState(0);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [coinsGiven, setCoinsGiven] = useState(0);
  
  const [targetPost, setTargetPost] = useState({ id: '', creatorId: '', creatorName: '' });
  const [roomMembers, setRoomMembers] = useState<any[]>([]);

  const fetchRoomDataAndUser = async (roomId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: prof } = await supabase.from("profiles").select("id, username, avatar_url, coins, total_gift_sent, level").eq("id", session.user.id).single();
    if (prof) {
      setMyProfile(prof);
      setUserCoins(prof.coins || 0);
      setCoinsGiven(prof.total_gift_sent || 0);
    }

    if (!roomId) return;

    let membersArr: any[] = [];
    
    const { data: roomData } = await supabase.from('rooms').select('owner_id, profiles:owner_id(username, avatar_url)').eq('id', roomId).single();
    if (roomData && roomData.owner_id) {
      const owner = { 
        id: roomData.owner_id, 
        name: roomData.profiles?.username || 'Host', 
        avatar: roomData.profiles?.avatar_url 
      };
      membersArr.push(owner);
      setTargetPost({ id: roomId, creatorId: owner.id, creatorName: owner.name });
    }

    const { data: recentMsgs } = await supabase.from('room_messages')
      .select('user_id, profiles(username, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (recentMsgs) {
      const uniqueUsers = new Map();
      recentMsgs.forEach(msg => {
        if (msg.user_id !== roomData?.owner_id && msg.user_id !== session.user.id && !uniqueUsers.has(msg.user_id)) {
          uniqueUsers.set(msg.user_id, {
            id: msg.user_id,
            name: msg.profiles?.username || 'User',
            avatar: msg.profiles?.avatar_url
          });
        }
      });
      membersArr = [...membersArr, ...Array.from(uniqueUsers.values())];
    }
    
    setRoomMembers(membersArr);
  };

  // 🔥 Mengatur delay Lottie agar bottom sheet mulus duluan
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
    const handleOpenFromFooter = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('id');

      if(!roomId) return;

      setIsActive(true);
      document.body.style.overflow = "hidden";
      
      fetchRoomDataAndUser(roomId);
    };

    window.addEventListener('openRoomGift', handleOpenFromFooter);
    return () => window.removeEventListener('openRoomGift', handleOpenFromFooter);
  }, []);

  const closeSheet = () => {
    setIsActive(false);
    document.body.style.overflow = "";
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
          post_id: null, 
          amount: giftToSend.amount 
        }).then(({error}) => { if(error) console.warn("Gift Transaction RLS warning"); }),
        
        supabase.from("coin_history").insert([
          { 
            user_id: session.user.id, 
            type: "keluar", 
            transaction_type: "keluar", 
            amount: giftToSend.amount, 
            description: `Kirim kado ${giftToSend.name} ke ${targetPost.creatorName}` 
          },
          { 
            user_id: targetPost.creatorId, 
            type: "masuk", 
            transaction_type: "masuk", 
            amount: giftToSend.amount, 
            description: `Menerima kado ${giftToSend.name} dari ${myProfile?.username || 'Seseorang'}` 
          }
        ])
      ]);

      setUserCoins(prev => prev - giftToSend.amount);
      setCoinsGiven(newTotalGiftSent);
      
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100005 });
      if ((window as any).showNotif) (window as any).showNotif("Kado berhasil dikirim!", "success");

      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('id');
      if (roomId) {
          await supabase.from('room_messages').insert([{ 
              room_id: roomId, 
              username: "SISTEM_GIFT", 
              text: `${myProfile?.username || 'User'} mengirim ${giftToSend.name} x1 ke ${targetPost.creatorName}`, 
              role: giftToSend.id.toString(), 
              level: newLevel, 
              user_id: session.user.id 
          }]);
      }

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
  let needed = targetKoin - coinsGiven;
  let progressPercent = ((coinsGiven - prevTarget) / (targetKoin - prevTarget)) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const fallbackAvatar = myProfile?.username ? `https://ui-avatars.com/api/?name=${myProfile.username}&background=1f3cff&color=fff&bold=true` : '/asets/png/profile.webp';

  return (
    <>
      <style>{`
        .gift-sheet-content-framer {
          background: var(--bg-base, #121212);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding-top: 15px;
          display: flex;
          flex-direction: column;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-height: 90vh;
          z-index: 100001; 
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          will-change: transform;
        }
        
        .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin-bottom: 15px; }
        
        .drawer-top-level { display: flex; align-items: center; gap: 12px; background: transparent; padding: 12px 0px; margin: 0 20px 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .level-avatar-box { position: relative; width: 42px; height: 42px; flex-shrink: 0; z-index: 10; }
        .level-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; }
        .level-progress-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .level-text-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: var(--text-main, #fff); }
        .progress-track { width: 100%; height: 8px; background: rgba(150,150,150,0.2); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #1f3cff; transition: width 0.5s ease; }

        .target-selector-container { padding: 0 20px; margin-bottom: 5px; }
        .target-scroll-area {
          display: flex; gap: 12px; overflow-x: auto; padding: 10px 0;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .target-scroll-area::-webkit-scrollbar { display: none; }
        .target-avatar-item {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          cursor: pointer; opacity: 0.6; transition: all 0.2s; min-width: 50px;
        }
        .target-avatar-item.active { opacity: 1; transform: scale(1.1); }
        .target-avatar-item img {
          width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
          border: 2px solid transparent; transition: 0.2s;
        }
        .target-avatar-item.active img { border-color: #1f3cff; box-shadow: 0 0 10px rgba(31,60,255,0.5); }
        .target-avatar-name { font-size: 10px; font-weight: 700; color: var(--text-main, #fff); white-space: nowrap; }

        /* 🔥 FIX: GRID UNTUK HORIZONTAL SCROLL 2 BARIS 🔥 */
        .gift-grid-room-wrapper {
          display: grid;
          grid-template-rows: auto auto; /* Fix 2 baris (atas-bawah) */
          grid-auto-flow: column; /* Terus ke samping */
          grid-auto-columns: minmax(105px, 1fr); /* Lebar per kado */
          gap: 25px 15px; 
          overflow-x: auto; 
          padding: 10px 20px 40px 20px;
          scrollbar-width: none; 
          -webkit-overflow-scrolling: touch;
        }
        .gift-grid-room-wrapper::-webkit-scrollbar { display: none; }
        
        .gift-item-room {
          position: relative; height: 100px; width: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          cursor: pointer; z-index: 1; 
        }
        .gift-item-room.active { z-index: 10; }

        @keyframes floatingGiftCSS {
          0%, 100% { transform: translateY(-50px) scale(1.3); }
          50% { transform: translateY(-60px) scale(1.3); }
        }
        
        .gift-lottie-container {
          width: 85px; height: 85px; position: absolute; z-index: 2; bottom: 10px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex; justify-content: center; align-items: center;
          pointer-events: none;
        }
        .gift-item-room.active .gift-lottie-container {
          animation: floatingGiftCSS 2s ease-in-out infinite;
        }
        
        .gift-active-bg-box {
          position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
          border: 1.5px solid #1f3cff; border-radius: 12px; background: rgba(0,0,0,0.5);
          display: flex; flex-direction: column; justify-content: flex-end; 
          align-items: center; padding-bottom: 6px; z-index: 1; 
        }
        .gift-send-btn-mini {
          background: #1f3cff; color: white; border: none; border-radius: 8px; 
          padding: 6px 22px; font-weight: 800; font-size: 11px; 
          cursor: pointer; transition: transform 0.1s;
        }
        .gift-send-btn-mini:active { transform: scale(0.9); }

        .drawer-footer { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 15px 20px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); 
          background: var(--bg-base, #121212); border-top: 1px solid rgba(255,255,255,0.05); 
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
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000 }}
            />

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
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main, #fff)' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
                <span className="material-icons" onClick={closeSheet} style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '24px', cursor: 'pointer' }}>cancel</span>
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

              <div className="target-selector-container">
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted, #a1a1aa)' }}>PILIH PENERIMA:</span>
                <div className="target-scroll-area">
                  {roomMembers.map(member => (
                    <div 
                      key={member.id} 
                      className={`target-avatar-item ${targetPost.creatorId === member.id ? 'active' : ''}`}
                      onClick={() => setTargetPost({ id: targetPost.id, creatorId: member.id, creatorName: member.name })}
                    >
                      <img src={member.avatar || '/asets/png/profile.webp'} alt="Target" />
                      <span className="target-avatar-name">{member.name.substring(0, 8)}</span>
                    </div>
                  ))}
                  {roomMembers.length === 0 && (
                     <div style={{ fontSize: '12px', color: 'var(--text-muted, #a1a1aa)', fontStyle: 'italic', padding: '10px 0' }}>Memuat pengguna room...</div>
                  )}
                </div>
              </div>

              {/* 🔥 MENGGUNAKAN CSS GRID NATIVE PENGGANTI ARRAY MAPPING MANUAL 🔥 */}
              <div className="gift-grid-room-wrapper">
                {GIFT_DATA.map((gift) => {
                  const isActiveGift = selectedGift?.id === gift.id;

                  return (
                    <div 
                      key={gift.id}
                      className={`gift-item-room ${isActiveGift ? 'active' : ''}`}
                      onClick={() => setSelectedGift(gift)}
                    >
                      <div className="gift-lottie-container">
                        {isLottieReady ? (
                          <Lottie animationData={gift.animation} loop={true} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <div style={{ width: '60%', height: '60%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} /> 
                        )}
                      </div>

                      <div style={{ 
                          display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '5px',
                          opacity: isActiveGift ? 0 : 1, transform: isActiveGift ? 'translateY(10px)' : 'translateY(0px)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main, #fff)', textTransform: 'uppercase' }}>{gift.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #a1a1aa)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CoinIcon size={10} />{gift.amount}
                        </span>
                      </div>

                      <AnimatePresence>
                        {isActiveGift && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="gift-active-bg-box"
                          >
                            <span style={{ fontSize: '11px', color: '#1f3cff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                              <CoinIcon size={12} />
                              {gift.amount.toLocaleString('id-ID')}
                            </span>
                            <button 
                              className="gift-send-btn-mini"
                              onClick={(e) => handleSendGift(gift, e)}
                            >
                              {isSending ? '...' : 'KIRIM'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              
              <div className="drawer-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '12px', color: 'var(--text-main, #fff)' }}>
                  <CoinIcon size={20} />
                  <span>{userCoins.toLocaleString('id-ID')}</span>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleSendGift(selectedGift, e)}
                  disabled={!selectedGift || isSending}
                  style={{
                    background: 'linear-gradient(135deg, #1f3cff, #bc13fe)', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '20px', fontWeight: 800, fontSize: '14px',
                    opacity: (!selectedGift || isSending) ? 0.5 : 1, cursor: (!selectedGift || isSending) ? 'not-allowed' : 'pointer'
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
