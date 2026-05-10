'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import './GiftSheet.css';

// 🔥 FIX 1: UPDATE DAFTAR 10 GIFT (Disamain sama Voice Room) 🔥
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

      // 2. Insert Transactions & History
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

      // 3. Notifikasi
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
    <>
      <style>{`
        /* 🔥 INJEKSI CSS UNTUK OVERRIDE WARNA TOMBOL & GRID 🔥 */
        .gift-sheet-content .btn-send-gift {
          background: linear-gradient(135deg, #1f3cff, #bc13fe) !important;
          color: white !important;
          border: none !important;
          padding: 10px 24px !important;
          border-radius: 20px !important;
          font-weight: 800 !important;
          font-size: 14px !important;
          box-shadow: 0 4px 15px rgba(31, 60, 255, 0.4) !important;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .gift-sheet-content .btn-send-gift:active:not(:disabled) {
          transform: scale(0.9) !important;
        }
        .gift-sheet-content .btn-send-gift:disabled {
          background: var(--bg-secondary) !important;
          color: var(--text-muted) !important;
          box-shadow: none !important;
        }

        /* Rapihin List biar bisa nampung 10 kado enak */
        .gift-sheet-content .gift-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 12px !important;
          max-height: 280px !important;
          overflow-y: auto !important;
          padding-bottom: 20px !important;
        }
        .gift-sheet-content .gift-item {
          display: flex; flex-direction: column; align-items: center;
          padding: 10px 4px;
          border-radius: 12px;
          border: 2px solid transparent;
          transition: 0.2s;
        }
        .gift-sheet-content .gift-item.selected-gift {
          background: rgba(31, 60, 255, 0.1);
          border-color: #1f3cff;
        }
        .gift-sheet-content .img-gift {
          width: 50px; height: 50px; object-fit: contain;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          transition: 0.3s;
        }
        .gift-sheet-content .gift-item.selected-gift .img-gift {
          transform: scale(1.1) translateY(-4px);
        }
        .gift-sheet-content .gift-name {
          font-size: 10px; font-weight: bold; margin-top: 6px; text-transform: uppercase;
        }
      `}</style>

      <div className={`gift-sheet ${isActive ? 'active' : ''}`}>
        <div className="gift-sheet-overlay" onClick={closeSheet} />
        
        <div className="gift-sheet-content">
          <div className="sheet-handle" />

          <div className="gift-header">
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{t('gift_sheet_header', 'KIRIM HADIAH')}</span>
            <span className="gift-close-x" onClick={closeSheet} style={{ fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</span>
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
                <span className="gift-price" style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                  <span className="material-icons" style={{ fontSize: '11px' }}>toll</span> 
                  {gift.amount.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
          
          <div className="gift-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
            <div className="user-coins-info" onClick={() => window.location.href='/topup'} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer' }}>
              <span className="material-icons" style={{ color: '#f59e0b', fontSize: '16px' }}>toll</span>
              <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '14px' }}>{userCoins.toLocaleString('id-ID')}</span>
              <span style={{ color: '#f59e0b', opacity: 0.6, fontSize: '18px', marginLeft: '4px', lineHeight: 1 }}>&rsaquo;</span>
            </div>
            
            <button 
              className="btn-send-gift" 
              disabled={!selectedGift || isSending}
              onClick={handleSendGift}
            >
              {isSending ? t('sending', 'MENGIRIM...') : selectedGift ? t('btn_send_amount', `KIRIM (${selectedGift.amount})`) : t('btn_send', 'KIRIM')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
