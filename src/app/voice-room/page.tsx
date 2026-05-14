'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './VoiceLobby.css';

const KATEGORI_MAP = [
  { id: 'Populer', label: 'category_popular' },
  { id: 'Nyanyi', label: 'category_singing' },
  { id: 'Ngobrol', label: 'category_chatting' },
  { id: 'Mabar', label: 'category_gaming' }
];

export default function VoiceLobbyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('Populer');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    desc: '',
    category: 'Nyanyi'
  });

  const [isCoinSheetOpen, setIsCoinSheetOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customCoinAmount, setCustomCoinAmount] = useState('');
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);

  const fetchUser = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser({ id: user.id, email: user.email, username: 'Bree', coins: 0 });
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchUser(); }, [router]);

  useEffect(() => {
    const loadRooms = async () => {
      setIsLoadingRooms(true);
      try {
        let query = supabase.from('rooms').select('id, name, description').eq('is_active', true);
        if (activeCategory !== 'Populer') {
          query = query.eq('category', activeCategory);
        } else {
          query = query.order('created_at', { ascending: false });
        }
        const { data: fetchedRooms, error } = await query;
        if (error) throw error;
        if (!fetchedRooms || fetchedRooms.length === 0) {
          setRooms([]); return;
        }
        const roomIds = fetchedRooms.map(r => r.id);
        const { data: occupiedSlots } = await supabase.from('room_slots').select('room_id').in('room_id', roomIds).not('profile_id', 'is', null);
        const onlineCounts: Record<string, number> = {};
        if (occupiedSlots) {
          occupiedSlots.forEach(slot => { onlineCounts[slot.room_id] = (onlineCounts[slot.room_id] || 0) + 1; });
        }
        setRooms(fetchedRooms.map(room => ({ ...room, onlineCount: onlineCounts[room.id] || 0 })));
      } catch (err) { console.error(err); } finally { setIsLoadingRooms(false); }
    };
    loadRooms();
  }, [activeCategory]);

  const handleStartSinging = async () => {
    if (!currentUser) return showNotif(t('login_warning'), "warning");
    try {
      const { data: existingRoom } = await supabase.from('rooms').select('id, name').eq('owner_id', currentUser.id).eq('is_active', true).maybeSingle();
      if (existingRoom) {
        router.push(`/voice?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`);
      } else {
        setIsModalOpen(true);
      }
    } catch (err) { console.error(err); }
  };

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;
    if (!name.trim()) return showNotif(t('modal_room_placeholder'), "warning");
    if (!currentUser) return showNotif(t('session_expired'), "error");
    setIsCreating(true);
    try {
      const { data: oldRooms } = await supabase.from('rooms').select('id').eq('owner_id', currentUser.id);
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.id);
        await supabase.from('room_slots').delete().in('room_id', oldRoomIds);
        await supabase.from('rooms').delete().in('id', oldRoomIds);
      }
      const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{
        name: name.trim(),
        description: desc.trim() || 'Ayo nyanyi bareng!',
        category: category,
        owner_id: currentUser.id,
        is_active: true
      }]).select().single();
      if (roomError) throw roomError;
      const slots = Array.from({ length: 6 }, (_, i) => ({ room_id: newRoom.id, slot_index: i, profile_id: null }));
      await supabase.from('room_slots').insert(slots);
      showNotif(t('profile_updated'), "success");
      setIsModalOpen(false);
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);
    } catch (e) { showNotif(t('create_room_error'), "error"); } finally { setIsCreating(false); }
  };

  const loadMidtransForce = () => {
    return new Promise((resolve) => {
      if ((window as any).snap) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", "SB-Mid-client-0T6dD0H1HkQvBf8G");
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleBuyCoin = async (price: number, coinsAmount: number, itemName: string) => {
    if (!currentUser) return showNotif(t('loading_data'), "error");
    setLoadingPackage(coinsAmount);
    setIsProcessingPayment(true);
    try {
      showNotif(t('preparing_pay'), "info");
      await loadMidtransForce();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: currentUser.id, amount: price, coins: coinsAmount, item_name: itemName }),
      });
      if (!response.ok) throw new Error(t('payment_service_error'));
      const result = await response.json();
      (window as any).snap.pay(result.token, {
        onSuccess: () => {
          showNotif(t('pay_success'), "success");
          setIsCoinSheetOpen(false); fetchUser();
        },
        onPending: async () => {
          showNotif(t('pay_pending'), "warning");
          await supabase.from("notifications").insert({
            user_id: currentUser.id, type: "payment_pending",
            message: `Transaksi ${itemName} tertunda. Klik untuk bayar.`,
            is_read: false, token: result.token
          });
        },
        onError: () => showNotif(t('pay_failed'), "error"),
        onClose: async () => {
          showNotif(t('pay_closed'), "info");
        }
      });
    } catch (err: any) { showNotif(err.message, "error"); } finally { setIsProcessingPayment(false); setLoadingPackage(null); }
  };

  const handleCustomCoinBuy = () => {
    const coins = parseInt(customCoinAmount);
    if (!coins || coins <= 0) return showNotif(t('invalid_coin_amount'), "warning");
    if (coins < 100) return showNotif(t('min_topup_warning'), "warning");
    if (coins > 10000) return showNotif(t('max_topup_warning'), "warning");
    handleBuyCoin(coins * 100, coins, `${coins} Koin Custom`);
  };

  const handleLiveStreamClick = () => {
    showNotif("Live Video & Screen Share Coming Soon! 🚀", "info");
  };

  return (
    <div className="voice-lobby-container">
      <header className="lobby-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-profile">
          <img src={currentUser?.avatar_url || '/asets/png/profile.webp'} alt="Av" />
          <div className="header-info">
            <h3>{currentUser?.username || t('hi_bree')}</h3>
            <div className="coin-badge" style={{ cursor: 'pointer' }} onClick={() => setIsCoinSheetOpen(true)}>
              {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
              <span className="material-icons" style={{fontSize: '14px', marginLeft: '4px'}}>add_circle</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLiveStreamClick}
          style={{
            background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
            color: 'white', border: 'none', borderRadius: '12px',
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px',
            fontWeight: 800, fontSize: '12px', cursor: 'pointer',
            boxShadow: 'none'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>videocam</span>
          LIVE
        </button>
      </header>

      <section className="hero-banner">
        <h2>{t('hero_title')}</h2>
        <p>{t('hero_desc')}</p>
        <button className="btn-start-singing" onClick={handleStartSinging}>
          <span className="material-icons">mic</span>
          {t('hero_btn')}
        </button>
      </section>

      <div className="tabs-container">
        {KATEGORI_MAP.map(kat => (
          <span
            key={kat.id}
            className={`voice-tab-item ${activeCategory === kat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(kat.id)}
          >
            {t(kat.label)}
          </span>
        ))}
      </div>

      <main className="room-list">
        {isLoadingRooms ? (
          [1,2,3].map(i => <div key={i} className="skeleton-card" style={{height:'60px', borderRadius:'18px', background:'var(--bg-card)', marginBottom:'10px'}} />)
        ) : rooms.length === 0 ? (
          <div className="no-rooms-info" style={{textAlign:'center', color:'var(--text-muted)', marginTop:'40px'}}>
            {t('no_rooms')}
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="room-card" onClick={() => router.push(`/voice?id=${room.id}&name=${encodeURIComponent(room.name)}`)}>
              <div className="room-thumb"><span className="material-icons">graphic_eq</span></div>
              <div className="room-info">
                <h4>{room.name.toUpperCase()}</h4>
                <p>{room.description}</p>
              </div>
              <div className="room-status">
                <div className="online-pill">
                   <div className="dot-green" style={{width:'6px', height:'6px', borderRadius:'50%', background:'currentColor'}}></div>
                   {room.onlineCount} Online
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {isModalOpen && (
        <div className="voice-modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="voice-modal-content" onClick={e => e.stopPropagation()}>
            <div className="voice-modal-header">
               <h3>{t('modal_room_title')}</h3>
               <button className="voice-close-modal-btn" onClick={() => setIsModalOpen(false)}>
                 <span className="material-icons">close</span>
               </button>
            </div>
            <div className="voice-modal-body">
              <label>{t('modal_room_name_label')}</label>
              <input
                type="text" placeholder={t('modal_room_placeholder')}
                maxLength={25} value={newRoomForm.name}
                onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})}
              />
              <label>{t('modal_room_cat_label')}</label>
              <select
                className="voice-select-custom"
                value={newRoomForm.category}
                onChange={e => setNewRoomForm({...newRoomForm, category: e.target.value})}
                style={{width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-card)', marginBottom: '20px'}}
              >
                <option value="Nyanyi">{t('category_singing')}</option>
                <option value="Ngobrol">{t('category_chatting')}</option>
                <option value="Mabar">{t('category_gaming')}</option>
              </select>
            </div>
            <div className="voice-modal-actions">
              <button className="voice-btn-cancel" onClick={() => setIsModalOpen(false)}>{t('btn_cancel')}</button>
              <button className="voice-btn-confirm" onClick={confirmCreateRoom} disabled={isCreating}>
                {isCreating ? t('btn_building') : t('btn_create')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`voice-bottom-sheet ${isCoinSheetOpen ? 'active' : ''}`}>
        <div className="voice-sheet-overlay" onClick={() => setIsCoinSheetOpen(false)}></div>
        <div className="voice-sheet-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="drag-handle"></div>
          <h3>{t('topup_title')}</h3>

          {[100, 300, 700].map(amt => (
            <div key={amt} className="coin-product-card" onClick={() => handleBuyCoin(amt * 100, amt, `${amt} Koin`)}>
              <div className="product-info-wrapper">
                <div className="product-icon">
                  <img src="/asets/svg/koin.webp" alt="Koin" style={{width: '24px'}} />
                </div>
                <div className="product-text">
                  <span className="p-name">{amt} Koin</span>
                  <span className="p-price">Rp {(amt * 100).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button className={`buy-coin-btn ${loadingPackage === amt ? 'btn-loading' : ''}`} disabled={isProcessingPayment}>{t('buy')}</button>
            </div>
          ))}

          <div style={{
            width: '100%',
            height: '90px',
            borderRadius: '16px',
            margin: '16px 0',
            backgroundImage: 'url("/asets/png/topup.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: 'none'
          }}></div>

          <div className="custom-topup">
            <h4>{t('custom_topup_title')}</h4>
            <input
              type="number" placeholder={t('custom_placeholder')}
              value={customCoinAmount} onChange={(e) => setCustomCoinAmount(e.target.value)}
            />
            {customCoinAmount && (
              <span style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'-5px', display:'block'}}>
                {t('price_label')}: <b style={{color: 'var(--primary)'}}>Rp {(parseInt(customCoinAmount) * 100).toLocaleString('id-ID')}</b>
              </span>
            )}
            <button
              id="buy-custom-coin-btn"
              className={loadingPackage === parseInt(customCoinAmount) ? 'btn-loading' : ''}
              onClick={handleCustomCoinBuy} disabled={isProcessingPayment}
              style={{marginTop: '10px'}}
            >
              {t('buy_custom')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
