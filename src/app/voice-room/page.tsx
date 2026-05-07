'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import './VoiceLobby.css';

const KATEGORI_LIST = ['Populer', 'Nyanyi', 'Ngobrol', 'Mabar'];

export default function VoiceLobbyPage() {
  const router = useRouter();

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('Populer');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // States Modal Buat Room
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    desc: '',
    category: 'Nyanyi'
  });

  // 🔥 STATES MODAL TOP UP KOIN 🔥
  const [isCoinSheetOpen, setIsCoinSheetOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customCoinAmount, setCustomCoinAmount] = useState('');
  
  // 🔥 STATE BARU: Deteksi paket koin mana yang lagi loading 🔥
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);

  // --- 🔥 INIT USER (DIJAMIN FRESH) 🔥 ---
  const fetchUser = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      
      if (authErr || !user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profErr) {
        console.error("Gagal load profil:", profErr);
        setCurrentUser({ id: user.id, email: user.email, username: 'Bree', coins: 0 });
      } else if (profile) {
        setCurrentUser(profile);
      }
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  // --- LOAD ROOMS ---
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
          setRooms([]);
          return;
        }

        const roomIds = fetchedRooms.map(r => r.id);
        const { data: occupiedSlots } = await supabase.from('room_slots')
          .select('room_id')
          .in('room_id', roomIds)
          .not('profile_id', 'is', null);

        const onlineCounts: Record<string, number> = {};
        if (occupiedSlots) {
          occupiedSlots.forEach(slot => {
            onlineCounts[slot.room_id] = (onlineCounts[slot.room_id] || 0) + 1;
          });
        }

        const finalRooms = fetchedRooms.map(room => ({
          ...room,
          onlineCount: onlineCounts[room.id] || 0
        }));

        setRooms(finalRooms);
      } catch (err) {
        console.error("Gagal memuat room:", err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    loadRooms();
  }, [activeCategory]);

  // --- LOGIKA BUKA ROOM ---
  const handleStartSinging = async () => {
    if (!currentUser) return showNotif("Login dulu Bree!", "warning");

    try {
      const { data: existingRoom } = await supabase.from('rooms')
        .select('id, name')
        .eq('owner_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle(); 

      if (existingRoom) {
        router.push(`/voice?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`);
      } else {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;
    if (!name.trim()) return showNotif("Kasih nama panggung dulu dong!", "warning");
    if (!currentUser) return showNotif("Sesi hilang, login ulang ya.", "error");

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

      const slots = Array.from({ length: 6 }, (_, i) => ({
        room_id: newRoom.id,
        slot_index: i,
        profile_id: null
      }));
      
      await supabase.from('room_slots').insert(slots);
      showNotif("Panggung siap!", "success");
      setIsModalOpen(false);
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);
    } catch (e) {
      showNotif("Gagal buat panggung.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // --- 🔥 LOGIKA PEMBAYARAN MIDTRANS KOIN 🔥 ---
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
    if (!currentUser) return showNotif("Data profil belum termuat, tunggu sebentar", "error");
    
    setLoadingPackage(coinsAmount);
    setIsProcessingPayment(true);
    
    try {
      showNotif("Menyiapkan pembayaran...", "info");
      await loadMidtransForce();

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          userId: currentUser.id, 
          amount: price, 
          coins: coinsAmount, 
          item_name: itemName
        }),
      });

      if (!response.ok) throw new Error("Gagal memanggil layanan pembayaran.");
      
      const result = await response.json();
      const token = result.token;

      (window as any).snap.pay(token, {
        onSuccess: () => { 
          showNotif("Pembayaran Sukses!", "success"); 
          setIsCoinSheetOpen(false);
          fetchUser(); 
        },
        onPending: async () => {
          showNotif("Selesaikan transaksi dulu", "warning");
          await supabase.from("notifications").insert({
            user_id: currentUser.id, type: "payment_pending",
            message: `Transaksi ${itemName} tertunda. Klik untuk bayar.`,
            is_read: false, token: token 
          });
        },
        onError: () => showNotif("Pembayaran gagal", "error"),
        onClose: async () => {
          showNotif("Kamu menutup popup sebelum bayar", "info");
          await supabase.from("notifications").insert({
            user_id: currentUser.id, type: "payment_pending",
            message: `Transaksi ${itemName} belum dibayar. Klik untuk lanjut.`,
            is_read: false, token: token 
          });
        }
      });
    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsProcessingPayment(false);
      setLoadingPackage(null);
    }
  };

  const handleCustomCoinBuy = () => {
    const coins = parseInt(customCoinAmount);
    if (!coins || coins <= 0) return showNotif("Masukkan jumlah koin dengan benar", "warning");
    if (coins < 100) return showNotif("Minimal top up 100 koin", "warning");
    if (coins > 10000) return showNotif("Maksimal top up 10000 koin", "warning");
    
    handleBuyCoin(coins * 100, coins, `${coins} Koin Custom`);
  };

  return (
    <div className="voice-lobby-container">
      {/* HEADER */}
      <header className="lobby-header">
        <div className="header-profile">
          <img src={currentUser?.avatar_url || '/asets/png/profile.webp'} alt="Av" />
          <div className="header-info">
            <h3>{currentUser?.username || 'Hi, Bree!'}</h3>
            
            <div className="coin-badge" style={{ cursor: 'pointer' }} onClick={() => setIsCoinSheetOpen(true)}>
              {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
              <span className="material-icons" style={{fontSize: '14px', marginLeft: '4px'}}>add_circle</span>
            </div>
            
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="hero-banner">
        <h2>Panggung Lo, Aturan Lo!</h2>
        <p>Bikin panggung suara lo sendiri, nyanyi bareng, atau sekadar ngobrol santai.</p>
        <button className="btn-start-singing" onClick={handleStartSinging}>
          <span className="material-icons">mic</span>
          Mulai Bikin Panggung
        </button>
      </section>

      {/* TABS KATEGORI */}
      <div className="tabs-container">
        {KATEGORI_LIST.map(kategori => (
          <span 
            key={kategori}
            className={`voice-tab-item ${activeCategory === kategori ? 'active' : ''}`}
            onClick={() => setActiveCategory(kategori)}
          >
            {kategori}
          </span>
        ))}
      </div>

      {/* ROOM LIST */}
      <main className="room-list">
        {isLoadingRooms ? (
          [1,2,3].map(i => (
            <div key={i} className="skeleton-card" style={{display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-card)', borderRadius: '18px', marginBottom: '10px'}}>
              <div className="skeleton" style={{width: '42px', height: '42px', borderRadius: '12px', background: '#e2e8f0'}}></div>
              <div style={{flex: 1}}>
                <div className="skeleton" style={{height:'15px', width:'60%', marginBottom:'8px', background: '#e2e8f0', borderRadius: '4px'}}></div>
                <div className="skeleton" style={{height:'10px', width:'80%', background: '#e2e8f0', borderRadius: '4px'}}></div>
              </div>
            </div>
          ))
        ) : rooms.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px'}}>
            Belum ada panggung di kategori ini.
          </div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id} 
              className="room-card" 
              onClick={() => router.push(`/voice?id=${room.id}&name=${encodeURIComponent(room.name)}`)}
            >
              <div className="room-thumb">
                <span className="material-icons">graphic_eq</span>
              </div>
              <div className="room-info">
                <h4>{room.name.toUpperCase()}</h4>
                <p>{room.description}</p>
              </div>
              <div className="room-status">
                <div className="online-pill">
                   <div style={{width:'6px', height:'6px', background:'#16a34a', borderRadius:'50%'}}></div>
                   {room.onlineCount} Online
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* 🔥 FIX: MODAL BIKIN ROOM PAKE CLASS EKSKLUSIF 🔥 */}
      {isModalOpen && (
        <div className="voice-modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="voice-modal-content" onClick={e => e.stopPropagation()}>
            <div className="voice-modal-header">
               <h3>Siapin Panggung Lo</h3>
               <button className="voice-close-modal-btn" onClick={() => setIsModalOpen(false)}>
                 <span className="material-icons">close</span>
               </button>
            </div>
            
            <div className="voice-modal-body">
              <label>Nama Panggung</label>
              <input 
                type="text" 
                placeholder="Cth: Nongkrong Santai" 
                maxLength={25} 
                value={newRoomForm.name} 
                onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})} 
              />
              
              <label>Kategori</label>
              <select 
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.1)', background: '#f6f9ff',
                  fontSize: '14px', fontWeight: '600', color: '#0f172a',
                  marginBottom: '24px', outline: 'none'
                }}
                value={newRoomForm.category} 
                onChange={e => setNewRoomForm({...newRoomForm, category: e.target.value})}
              >
                <option value="Nyanyi">Nyanyi</option>
                <option value="Ngobrol">Ngobrol</option>
                <option value="Mabar">Mabar</option>
              </select>
            </div>

            <div className="voice-modal-actions">
              <button className="voice-btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
              <button className="voice-btn-confirm" onClick={confirmCreateRoom} disabled={isCreating}>
                {isCreating ? 'Membangun...' : 'Buat Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 FIX: MODAL TOP UP KOIN PAKE CLASS EKSKLUSIF 🔥 */}
      <div className={`voice-bottom-sheet ${isCoinSheetOpen ? 'active' : ''}`}>
        <div className="voice-sheet-overlay" onClick={() => setIsCoinSheetOpen(false)}></div>
        <div className="voice-sheet-content">
          <div className="drag-handle"></div>
          <h3>Top Up Koin Hope</h3>
          
          <div className="coin-product-card" onClick={() => handleBuyCoin(10000, 100, "100 Koin")}>
            <div className="product-info-wrapper">
              <div className="product-icon">
                <img src="/asets/svg/koin.webp" alt="Koin" style={{width: '24px', height: '24px', objectFit: 'contain'}} />
              </div>
              <div className="product-text">
                <span className="p-name">100 Koin</span>
                <span className="p-price">Rp 10.000</span>
              </div>
            </div>
            <button className={`buy-coin-btn ${loadingPackage === 100 ? 'btn-loading' : ''}`} disabled={isProcessingPayment}>Beli</button>
          </div>

          <div className="coin-product-card" onClick={() => handleBuyCoin(25000, 300, "300 Koin")}>
            <div className="product-info-wrapper">
              <div className="product-icon">
                <img src="/asets/svg/koin.webp" alt="Koin" style={{width: '24px', height: '24px', objectFit: 'contain'}} />
              </div>
              <div className="product-text">
                <span className="p-name">300 Koin</span>
                <span className="p-price">Rp 25.000</span>
              </div>
            </div>
            <button className={`buy-coin-btn ${loadingPackage === 300 ? 'btn-loading' : ''}`} disabled={isProcessingPayment}>Beli</button>
          </div>

          <div className="coin-product-card" onClick={() => handleBuyCoin(50000, 700, "700 Koin")}>
            <div className="product-info-wrapper">
              <div className="product-icon">
                <img src="/asets/svg/koin.webp" alt="Koin" style={{width: '24px', height: '24px', objectFit: 'contain'}} />
              </div>
              <div className="product-text">
                <span className="p-name">700 Koin</span>
                <span className="p-price">Rp 50.000</span>
              </div>
            </div>
            <button className={`buy-coin-btn ${loadingPackage === 700 ? 'btn-loading' : ''}`} disabled={isProcessingPayment}>Beli</button>
          </div>

          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <img src="/asets/png/topup.webp" alt="Promo Top Up" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover' }} />
          </div>

          <div className="custom-topup">
            <h4>Atau, Custom Top Up</h4>
            <input 
              type="number" 
              placeholder="Minimal 100 Koin" 
              value={customCoinAmount}
              onChange={(e) => setCustomCoinAmount(e.target.value)}
            />
            {customCoinAmount && parseInt(customCoinAmount) > 0 && (
              <span style={{color: '#94a3b8', fontSize: '12px'}}>
                Harga: Rp {(parseInt(customCoinAmount) * 100).toLocaleString('id-ID')}
              </span>
            )}
            <button 
              id="buy-custom-coin-btn" 
              className={loadingPackage === parseInt(customCoinAmount) ? 'btn-loading' : ''} 
              onClick={handleCustomCoinBuy} 
              disabled={isProcessingPayment}
            >
              Beli Custom
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
