'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './Saldo.css';

export default function SaldoPage() {
  const router = useRouter();
  
  const [coins, setCoins] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rate konversi: 1 Koin = Rp 70
  const IDR_RATE = 70;

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setCoins(profile.coins || 0);

    } catch (err: any) {
      console.error("Gagal load saldo:", err.message);
      showNotif("Gagal memuat saldo", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = () => {
    router.push('/voice'); 
  };

  const handleWithdraw = () => {
    router.push('/saldo/withdraw'); 
  };

  // 🔥 Fungsi Riwayat Penarikan (Withdraw)
  const handleWithdrawHistory = () => {
    router.push('/historycoin');
  };

  // 🔥 Fungsi Riwayat Mutasi Koin (Buku Tabungan)
  const handleCoinHistory = () => {
    router.push('/saldo/history');
  };

  return (
    <div className="saldo-wrapper">
      {/* HEADER */}
      <header className="saldo-header">
        <button className="saldo-btn-icon" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Saldo & Aset</h2>
        {/* 🔥 ICON ATAS: Ke Riwayat Mutasi Koin 🔥 */}
        <button className="saldo-btn-icon" onClick={handleCoinHistory}>
          <span className="material-icons">receipt_long</span>
        </button>
      </header>

      {/* BALANCE SECTION */}
      <section className="saldo-balance-section">
        <div className="saldo-card">
          <div className="saldo-label">Total Koin HopeHype</div>
          
          <div className="saldo-amount-coin">
            <span className="material-icons" style={{ color: '#f59e0b', fontSize: '32px' }}>toll</span>
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '120px', height: '36px' }}></div>
            ) : (
              (coins || 0).toLocaleString('id-ID')
            )}
          </div>
          
          <div className="saldo-amount-idr">
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '80px', height: '14px' }}></div>
            ) : (
              `Setara Rp ${((coins || 0) * IDR_RATE).toLocaleString('id-ID')}`
            )}
          </div>
        </div>
      </section>

      {/* ACTION MENU */}
      <div className="saldo-menu-row">
        <button className="saldo-action-btn" onClick={handleTopUp}>
          <span className="material-icons">add_card</span>
          <span>Top Up</span>
        </button>
        <button className="saldo-action-btn" onClick={handleWithdraw}>
          <span className="material-icons">account_balance_wallet</span>
          <span>Tarik Tunai</span>
        </button>
        {/* 🔥 TOMBOL TENGAH: Ke Riwayat Penarikan (WD) 🔥 */}
        <button className="saldo-action-btn" onClick={handleWithdrawHistory}>
          <span className="material-icons">history</span>
          <span>Riwayat WD</span>
        </button>
      </div>

      {/* ASSETS GRID */}
      <h3 className="saldo-section-title">Aset Lainnya</h3>
      <div className="saldo-assets-list">
        
        {/* 🔥 Klik item koin juga bisa lari ke riwayat koin 🔥 */}
        <div className="saldo-asset-item" onClick={handleCoinHistory} style={{ cursor: 'pointer' }}>
          <div className="saldo-asset-info">
            <div className="saldo-asset-icon">
              <span className="material-icons" style={{ color: '#f59e0b' }}>toll</span>
            </div>
            <div className="saldo-asset-text">
              <h4>Koin Hope</h4>
              <p>Klik untuk lihat riwayat mutasi</p>
            </div>
          </div>
          <div className="saldo-asset-value">
            {isLoading ? <div className="saldo-skeleton" style={{ width: '40px', height: '20px' }}></div> : (coins || 0).toLocaleString('id-ID')}
          </div>
        </div>

        <div className="saldo-asset-item">
          <div className="saldo-asset-info">
            <div className="saldo-asset-icon" style={{ background: '#f0fdf4' }}>
              <span className="material-icons" style={{ color: '#10b981' }}>confirmation_number</span>
            </div>
            <div className="saldo-asset-text">
              <h4>Tiket Undian</h4>
              <p>Digunakan di Pusat Misi</p>
            </div>
          </div>
          <div className="saldo-asset-value">0</div>
        </div>

      </div>

    </div>
  );
}
