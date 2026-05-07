'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
// 🔥 FIX 1: Import i18n
import { useTranslation } from 'react-i18next';
import './GiftSheet.css';

const GIFT_DATA = [
  { id: 1, name: 'Troi', amount: 10, img: '/asets/png/gift1.png' },
  { id: 2, name: 'Fox', amount: 20, img: '/asets/png/gift2.png' },
  { id: 3, name: 'Panda', amount: 20, img: '/asets/png/gift3.png' },
  { id: 4, name: 'Rabbit', amount: 25, img: '/asets/png/gift4.png' },
  { id: 5, name: 'Catglow', amount: 100, img: '/asets/png/gift5.png' },
];

export default function GiftSheetpost() {
  // 🔥 FIX 2: Inisialisasi Translate
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  
  const [targetPost, setTargetPost] = useState({ id: '', creatorId: '', creatorName: '' });

  useEffect(() => {
    const handleGiftOpen = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".gift-btn") as HTMLElement;
      
      if (btn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
        
        if (session.user.id === btn.dataset.creator) {
          if ((window as any).showNotif) (window as any).showNotif(t('gift_self_error'), "warning");
          return;
        }

        setTargetPost({
          id: btn.dataset.post || '',
          creatorId: btn.dataset.creator || '',
          creatorName: btn.dataset.name || t('creator_label')
        });

        const { data: prof } = await supabase.from("profiles").select("coins").eq("id", session.user.id).single();
        setUserCoins(prof?.coins || 0);
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
      
      if (session.user.id === creatorId) {
        if ((window as any).showNotif) (window as any).showNotif(t('gift_self_error'), "warning");
        return;
      }

      setTargetPost({
        id: postId,
        creatorId: creatorId,
        creatorName: t('creator_label')
      });

      const { data: prof } = await supabase.from("profiles").select("coins").eq("id", session.user.id).single();
      setUserCoins(prof?.coins || 0);
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

  const handleSendGift = async () => {
    if (!selectedGift || isSending) return;
    
    if (selectedGift.amount > userCoins) {
      if ((window as any).showNotif) (window as any).showNotif(t('insufficient_coins'), "error");
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. RPC Transfer
      const { error: rpcErr } = await supabase.rpc("transfer_coins", { 
        sender_id: session.user.id, 
        receiver_id: targetPost.creatorId, 
        amount: selectedGift.amount 
      });
      if (rpcErr) throw rpcErr;

      // 2. Insert Transactions & History (Diterjemahkan deskripsinya)
      await Promise.all([
        supabase.from("gift_transactions").insert({ 
          sender_id: session.user.id, 
          receiver_id: targetPost.creatorId, 
          post_id: parseInt(targetPost.id), 
          amount: selectedGift.amount 
        }),
        supabase.from("coin_history").insert([
          { 
            user_id: session.user.id, 
            type: "keluar", 
            transaction_type: "keluar", 
            amount: selectedGift.amount, 
            description: t('history_send_desc', { name: targetPost.creatorName }) 
          },
          { 
            user_id: targetPost.creatorId, 
            type: "masuk", 
            transaction_type: "masuk", 
            amount: selectedGift.amount, 
            description: t('history_receive_desc') 
          }
        ])
      ]);

      // 3. Notifikasi (i18n)
      const { data: sProf } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
      await supabase.from("notifications").insert({ 
        user_id: targetPost.creatorId, 
        actor_id: session.user.id, 
        post_id: parseInt(targetPost.id), 
        type: "gift", 
        message: t('gift_notif_msg', { username: sProf?.username, amount: selectedGift.amount }) 
      });

      // 4. TRIGGER INSERT KOMENTAR GIFT
      window.dispatchEvent(new CustomEvent('insertGiftComment', {
        detail: {
          postId: targetPost.id,
          giftName: selectedGift.name,
          giftImg: selectedGift.img,
          creatorId: targetPost.creatorId
        }
      }));

      // 5. Success UI
      setUserCoins(prev => prev - selectedGift.amount);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100002 });
      
      if ((window as any).showBigImage) (window as any).showBigImage(selectedGift.img);
      if ((window as any).showNotif) (window as any).showNotif(t('gift_sent_success'), "success");

      closeSheet();
    } catch (err: any) {
      if ((window as any).showNotif) (window as any).showNotif("Gagal: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`gift-sheet ${isActive ? 'active' : ''}`}>
      <div className="gift-sheet-overlay" onClick={closeSheet} />
      
      <div className="gift-sheet-content">
        <div className="sheet-handle" />

        <div className="gift-header">
          <span>{t('gift_sheet_header')}</span>
          <span className="gift-close-x" onClick={closeSheet}>&times;</span>
        </div>

        <div className="gift-grid">
          {GIFT_DATA.map((gift) => (
            <div 
              key={gift.id} 
              className={`gift-item ${selectedGift?.id === gift.id ? 'selected-gift' : ''}`}
              onClick={() => setSelectedGift(gift)}
            >
              <div className="gift-img-container">
                <img src={gift.img} className="img-gift" alt={gift.name} />
              </div>
              <span className="gift-name">{gift.name}</span>
              <span className="gift-price">
                <img src="/asets/svg/koin.webp" className="img-coin-inline" alt="coin" /> {gift.amount}
              </span>
            </div>
          ))}
        </div>
        
        <div className="gift-footer">
          <div className="user-coins-info" onClick={() => window.location.href='/topup'}>
            <img src="/asets/svg/koin.webp" className="img-coin-footer" alt="user coin" />
            <span>{userCoins}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '5px' }}>&rsaquo;</span>
          </div>
          <button 
            className="btn-send-gift" 
            disabled={!selectedGift || isSending}
            onClick={handleSendGift}
          >
            {isSending ? t('sending') : selectedGift ? t('btn_send_amount', { amount: selectedGift.amount }) : t('btn_send')}
          </button>
        </div>
      </div>
    </div>
  );
}
