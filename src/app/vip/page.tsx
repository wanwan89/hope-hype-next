'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './Vip.css';

// DATA MANFAAT VIP HTML (Dari Astro)
const VIP_BENEFITS: Record<string, string> = {
  'verified': `<div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg></div><div class="b-text"><b>Centang Biru Eksklusif:</b> Tanda resmi akun terverifikasi.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></div><div class="b-text"><b>Prioritas Pencarian:</b> Akun lebih mudah ditemukan.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg></div><div class="b-text"><b>Profil Terpercaya:</b> Tampil profesional.</div></div>`,
  'crown1': `<div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div><div class="b-text"><b>Badge Perunggu:</b> Tampil beda dengan badge VIP.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div><div class="b-text"><b>Highlight Komentar:</b> Warna khusus di komentar.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></div><div class="b-text"><b>Stiker VIP:</b> Akses stiker eksklusif.</div></div>`,
  'crown2': `<div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div><div class="b-text"><b>Badge Perak:</b> Badge lebih elegan.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div><div class="b-text"><b>Efek Masuk:</b> Notifikasi khusus saat masuk room.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div><div class="b-text"><b>Limit Ekstra:</b> Batas pesan lebih banyak.</div></div><div class="b-item b-highlight"><div class="b-icon" style="color: #4ade80;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><div class="b-text"><b>Plus:</b> Dapat SEMUA keuntungan Bronze.</div></div>`,
  'crown3': `<div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg></div><div class="b-text"><b>Badge Emas:</b> Kasta tertinggi.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div><div class="b-text"><b>Animasi Mewah:</b> Efek visual super mencolok.</div></div><div class="b-item"><div class="b-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg></div><div class="b-text"><b>Bebas Iklan 100%:</b> Aplikasi tanpa iklan.</div></div><div class="b-item b-highlight b-gold"><div class="b-icon" style="color: #ffd700;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div><div class="b-text"><b>Super Plus:</b> Dapat keuntungan Bronze & Silver.</div></div>`
};

export default function VipPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // State untuk Info Modal
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean, title: string, role: string, iconHtml: string }>({
    isOpen: false, title: '', role: '', iconHtml: ''
  });

  const [customCoinAmount, setCustomCoinAmount] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Script Midtrans Loader
  const loadMidtransForce = () => {
    return new Promise((resolve) => {
      if ((window as any).snap) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js"; // Ganti sandbox ke prod jika live
      script.setAttribute("data-client-key", "SB-Mid-client-0T6dD0H1HkQvBf8G"); // Sesuaikan client key
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  // 🔥 LOGIKA PEMBAYARAN UTAMA (Persis kayak di Astro) 🔥
  const processPayment = async (endpoint: string, payloadBody: any, buttonId: string) => {
    if (!currentUser) {
      showNotif("Login dulu sebelum beli.", "warning");
      router.push('/login');
      return;
    }

    setProcessingId(buttonId);
    try {
      showNotif("Menyiapkan pembayaran...", "info");
      
      const isLoaded = await loadMidtransForce();
      if (!isLoaded || !(window as any).snap) {
        throw new Error("Gagal memuat sistem pembayaran Midtrans.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi habis, silakan login ulang.");

      const response = await fetch(endpoint, {
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
         const errText = await response.text();
         throw new Error(errText || "Gagal menghubungi server pembayaran.");
      }
      
      const result = await response.json(); 
      const token = result?.token;
      if (!token) throw new Error("Sistem gagal menerbitkan token pembayaran.");

      (window as any).snap.pay(token, {
        onSuccess: () => { 
          sessionStorage.removeItem(`hh_profile_${payloadBody.userId}`); 
          showNotif("Pembayaran Sukses! Akun diupgrade.", "success"); 
          setTimeout(() => window.location.href = '/data', 1500); 
        },
        onPending: async () => {
          showNotif("Selesaikan transaksi dulu", "warning");
          // Insert Lonceng Notif (Persis di Astro)
          await supabase.from("notifications").insert({
            user_id: payloadBody.userId,
            type: "payment_pending",
            message: `Transaksi ${payloadBody.item_name} tertunda. Klik untuk bayar.`,
            is_read: false,
            token: token 
          });
        },
        onError: () => showNotif("Pembayaran gagal", "error"),
        onClose: async () => {
          showNotif("Kamu menutup popup sebelum bayar", "info");
          // Insert Lonceng Notif (Persis di Astro)
          await supabase.from("notifications").insert({
            user_id: payloadBody.userId,
            type: "payment_pending",
            message: `Transaksi ${payloadBody.item_name} belum dibayar. Klik untuk lanjut.`,
            is_read: false,
            token: token 
          });
        }
      });

    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuyVip = (role: string, price: number, name: string) => {
    const payload = {
      userId: currentUser?.id, 
      email: currentUser?.email, 
      amount: price, 
      item_name: name, 
      role_target: role
    };
    processPayment("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-premium", payload, `vip-${role}`);
  };

  const handleBuyCoin = (coins: number, price: number, name: string, id: string) => {
    const payload = {
      userId: currentUser?.id, 
      email: currentUser?.email, 
      amount: price, 
      coins: coins, 
      item_name: name
    };
    processPayment("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", payload, `coin-${id}`);
  };

  const handleBuyCustomCoin = () => {
    const coins = parseInt(customCoinAmount);
    if (!coins || coins <= 0) return showNotif("Masukkan jumlah koin dengan benar", "warning");
    
    const price = coins * 100; // Hitungan persis di Astro
    if (price < 10000) return showNotif("Minimal beli Rp 10.000 (100 Koin)", "warning");
    if (coins > 5000) return showNotif("Maksimal beli 5000 koin", "warning");

    const payload = {
      userId: currentUser?.id, 
      email: currentUser?.email, 
      amount: price, 
      coins: coins, 
      item_name: `${coins} Koin (Custom)`
    };
    processPayment("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", payload, "custom-coin");
  };

  const openInfoModal = (title: string, role: string, iconHtml: string) => {
    setInfoModal({ isOpen: true, title, role, iconHtml });
  };

  return (
    <div className="vip-page-container">
      <header className="vip-header">
        <h2>Premium & Aset</h2>
      </header>

      {/* --- SECTION VIP BADGE --- */}
      <section className="section-container">
        <h3 className="section-title">Pilih Paket Badge VIP</h3>
        <div className="product-list">
          
          <div className="product-card">
            <div className="product-info-wrapper">
              <div className="product-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" style={{verticalAlign: 'middle'}}>
                  <circle cx="12" cy="12" r="10" fill="#1DA1F2" />
                  <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="product-text">
                <span className="p-name">
                  Verified Badge
                  <svg className="info-icon" onClick={() => openInfoModal("Verified Badge", "verified", `<svg width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2" /><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>`)} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                <span className="p-price">Rp 30.000/Bulan</span>
              </div>
            </div>
            <button className="buy-now-btn" disabled={processingId === 'vip-verified'} onClick={() => handleBuyVip('verified', 30000, 'Verified Badge')}>
              {processingId === 'vip-verified' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

          <div className="product-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/png/crown1.png" alt="Bronze" className="crown-img" /></div>
              <div className="product-text">
                <span className="p-name">
                  Crown Bronze
                  <svg className="info-icon" onClick={() => openInfoModal("Crown Bronze", "crown1", `<img src="/asets/png/crown1.png" width="40" />`)} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                <span className="p-price">Rp 14.999/Bulan</span>
              </div>
            </div>
            <button className="buy-now-btn" disabled={processingId === 'vip-crown1'} onClick={() => handleBuyVip('crown1', 14999, 'Crown Bronze')}>
              {processingId === 'vip-crown1' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

          <div className="product-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/png/crown2.png" alt="Silver" className="crown-img" /></div>
              <div className="product-text">
                <span className="p-name">
                  Crown Silver
                  <svg className="info-icon" onClick={() => openInfoModal("Crown Silver", "crown2", `<img src="/asets/png/crown2.png" width="40" />`)} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                <span className="p-price">Rp 20.000/Bulan</span>
              </div>
            </div>
            <button className="buy-now-btn" disabled={processingId === 'vip-crown2'} onClick={() => handleBuyVip('crown2', 20000, 'Crown Silver')}>
              {processingId === 'vip-crown2' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

          <div className="product-card gold-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/png/crown3.png" alt="Gold" className="crown-img" /></div>
              <div className="product-text">
                <span className="p-name">
                  Crown Gold
                  <svg className="info-icon" onClick={() => openInfoModal("Crown Gold", "crown3", `<img src="/asets/png/crown3.png" width="40" />`)} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                <span className="p-price">Rp 49.999/Bulan</span>
              </div>
            </div>
            <button className="buy-now-btn" disabled={processingId === 'vip-crown3'} onClick={() => handleBuyVip('crown3', 49999, 'Crown Gold')}>
              {processingId === 'vip-crown3' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

        </div>
      </section>

      {/* --- SECTION TOP UP KOIN --- */}
      <section className="section-container" style={{ paddingTop: '10px' }}>
        <h3 className="section-title">Top Up Koin</h3>
        <div className="product-list">
          
          <div className="product-card coin-product-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/svg/koin.webp" alt="Koin" className="crown-img" /></div>
              <div className="product-text"><span className="p-name">100 Koin</span><span className="p-price" style={{ color: '#bdbdbd' }}>Rp 10.000</span></div>
            </div>
            <button className="buy-coin-btn" disabled={processingId === 'coin-100'} onClick={() => handleBuyCoin(100, 10000, '100 Koin', '100')}>
              {processingId === 'coin-100' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

          <div className="product-card coin-product-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/svg/koin.webp" alt="Koin" className="crown-img" /></div>
              <div className="product-text"><span className="p-name">300 Koin</span><span className="p-price" style={{ color: '#bdbdbd' }}>Rp 25.000</span></div>
            </div>
            <button className="buy-coin-btn" disabled={processingId === 'coin-300'} onClick={() => handleBuyCoin(300, 25000, '300 Koin', '300')}>
              {processingId === 'coin-300' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

          <div className="product-card coin-product-card">
            <div className="product-info-wrapper">
              <div className="product-icon"><img src="/asets/svg/koin.webp" alt="Koin" className="crown-img" /></div>
              <div className="product-text"><span className="p-name">700 Koin</span><span className="p-price" style={{ color: '#bdbdbd' }}>Rp 50.000</span></div>
            </div>
            <button className="buy-coin-btn" disabled={processingId === 'coin-700'} onClick={() => handleBuyCoin(700, 50000, '700 Koin', '700')}>
              {processingId === 'coin-700' ? 'Tunggu...' : 'Beli'}
            </button>
          </div>

        </div>

        <div className="topup-ad-container">
          <img src="/asets/png/topup.webp" alt="Promo Top Up" className="topup-ad-img" />
        </div>

        <div className="custom-topup">
          <h4>Custom Top Up</h4>
          <input 
            type="number" 
            placeholder="Masukkan jumlah koin (Min. 100)" 
            min="100" max="5000"
            value={customCoinAmount}
            onChange={(e) => setCustomCoinAmount(e.target.value)}
          />
          <button id="buy-custom-coin-btn" disabled={processingId === 'custom-coin'} onClick={handleBuyCustomCoin}>
            {processingId === 'custom-coin' ? 'Tunggu...' : 'Beli'}
          </button>
          {customCoinAmount && parseInt(customCoinAmount) > 0 && (
            <p style={{ color: '#bdbdbd', fontSize: '12px', marginTop: '5px' }}>
              Harga: Rp {(parseInt(customCoinAmount) * 100).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </section>

      {/* --- INFO MODAL VIP (POPUP) --- */}
      <div className={`modal-overlay ${infoModal.isOpen ? 'active' : ''}`} onClick={() => setInfoModal({ ...infoModal, isOpen: false })}>
        <div className="info-modal-content" onClick={e => e.stopPropagation()}>
          <span className="close-icon" onClick={() => setInfoModal({ ...infoModal, isOpen: false })}>&times;</span>
          <div className="info-icon-showcase" dangerouslySetInnerHTML={{ __html: infoModal.iconHtml }}></div>
          <h3 className="premium-title">{infoModal.title}</h3>
          
          <div className="premium-benefits-list" dangerouslySetInnerHTML={{ __html: VIP_BENEFITS[infoModal.role] || '' }}></div>
          
          <button className="premium-btn" onClick={() => setInfoModal({ ...infoModal, isOpen: false })}>Mengerti</button>
        </div>
      </div>

    </div>
  );
}
