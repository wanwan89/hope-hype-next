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
  // 🔥 STATE BARU: Untuk kontrol sembunyi saldo
  const [showBalance, setShowBalance] = useState(true);

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

  const handleWithdraw = () => {
    router.push('/withdraw'); 
  };

  const handleWithdrawHistory = () => {
    router.push('/historycoin');
  };

  const handleCoinHistory = () => {
    router.push('/saldo/history');
  };

  // 🔥 FUNGSI TOGGLE MATA
  const toggleBalance = () => setShowBalance(!showBalance);

  return (
    <div className="saldo-wrapper">
      {/* HEADER */}
      <header className="saldo-header">
        <button className="saldo-btn-icon" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Saldo & Aset</h2>
        <button className="saldo-btn-icon" onClick={handleCoinHistory}>
          <span className="material-icons">receipt_long</span>
        </button>
      </header>

      {/* BALANCE SECTION */}
      <section className="saldo-balance-section">
        <div className="saldo-card">
          {/* 🔥 MODIFIKASI LABEL: Tambah Tombol Mata 🔥 */}
          <div className="saldo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Total Koin HopeHype
            <span 
              className="material-icons" 
              onClick={toggleBalance} 
              style={{ fontSize: '18px', cursor: 'pointer', opacity: 0.8 }}
            >
              {showBalance ? 'visibility' : 'visibility_off'}
            </span>
          </div>
          
          <div className="saldo-amount-coin">
            <span className="material-icons" style={{ color: '#f59e0b', fontSize: '32px' }}>toll</span>
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '120px', height: '36px' }}></div>
            ) : (
              // 🔥 LOGIKA SEMBUNYIKAN SALDO
              showBalance ? (coins || 0).toLocaleString('id-ID') : '••••••'
            )}
          </div>
          
          <div className="saldo-amount-idr">
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '80px', height: '14px' }}></div>
            ) : (
              // 🔥 LOGIKA SEMBUNYIKAN ESTIMASI IDR
              `Setara Rp ${showBalance ? ((coins || 0) * IDR_RATE).toLocaleString('id-ID') : '••••••'}`
            )}
          </div>
        </div>
      </section>

      {/* ACTION MENU */}
      <div className="saldo-menu-row">
        <button className="saldo-action-btn" onClick={handleWithdraw}>
          <span className="material-icons">account_balance_wallet</span>
          <span>Tarik Tunai</span>
        </button>
        <button className="saldo-action-btn" onClick={handleWithdrawHistory}>
          <span className="material-icons">history</span>
          <span>Riwayat WD</span>
        </button>
      </div>

      {/* ASSETS GRID */}
      <h3 className="saldo-section-title">Aset Lainnya</h3>
      <div className="saldo-assets-list">
        
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
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '40px', height: '20px' }}></div>
            ) : (
              // 🔥 KONSISTEN: Sembunyikan juga di daftar aset
              showBalance ? (coins || 0).toLocaleString('id-ID') : '••••'
            )}
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
