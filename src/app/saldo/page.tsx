'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Saldo.css';

// --- SVG Coin Icon ---
const CoinIcon = ({ size = 24, color = '#f59e0b', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 256 256"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    <path
      fill={color}
      d="M207.58 63.84C186.85 53.48 159.33 48 128 48s-58.85 5.48-79.58 15.84S16 88.78 16 104v48c0 15.22 11.82 29.85 32.42 40.16S96.67 208 128 208s58.85-5.48 79.58-15.84S240 167.22 240 152v-48c0-15.22-11.82-29.85-32.42-40.16m-87.58 96v32c-19-.62-35-3.42-48-7.49v-31.3a203.4 203.4 0 0 0 48 6.81Zm16 0a203.4 203.4 0 0 0 48-6.81v31.31c-13 4.07-29 6.87-48 7.49ZM32 152v-18.47a83 83 0 0 0 16.42 10.63c2.43 1.21 5 2.35 7.58 3.43V178c-15.83-7.84-24-17.71-24-26m168 26v-30.41c2.61-1.08 5.15-2.22 7.58-3.43A83 83 0 0 0 224 133.53V152c0 8.29-8.17 18.16-24 26"
    />
  </svg>
);

export default function SaldoPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [coins, setCoins] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  const IDR_RATE = 70;

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

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
      console.error('Gagal load saldo:', err.message);
      showNotif(t('failed_load_balance', 'Gagal memuat saldo'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = () => router.push('/withdraw');
  const handleWithdrawHistory = () => router.push('/historycoin');
  const handleCoinHistory = () => router.push('/saldo/history');
  const toggleBalance = () => setShowBalance(!showBalance);

  return (
    <div className="saldo-wrapper">
      {/* HEADER */}
      <header className="saldo-header">
        <button className="saldo-btn-icon" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('wallet_assets', 'Saldo & Aset')}</h2>
        <button className="saldo-btn-icon" onClick={handleCoinHistory}>
          <span className="material-icons">receipt_long</span>
        </button>
      </header>

      {/* BALANCE SECTION */}
      <section className="saldo-balance-section">
        <div className="saldo-card">
          <div className="saldo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('total_hypecoin', 'Total Koin HopeHype')}
            <span
              className="material-icons"
              onClick={toggleBalance}
              style={{ fontSize: '18px', cursor: 'pointer', opacity: 0.8 }}
            >
              {showBalance ? 'visibility' : 'visibility_off'}
            </span>
          </div>

          <div className="saldo-amount-coin">
            <CoinIcon size={32} color="white" />
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '120px', height: '36px' }}></div>
            ) : showBalance ? (
              (coins || 0).toLocaleString('id-ID')
            ) : (
              '••••••'
            )}
          </div>

          <div className="saldo-amount-idr">
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '80px', height: '14px' }}></div>
            ) : (
              `${t('equivalent_to', 'Setara Rp')} ${
                showBalance ? ((coins || 0) * IDR_RATE).toLocaleString('id-ID') : '••••••'
              }`
            )}
          </div>
        </div>
      </section>

      {/* ACTION MENU */}
      <div className="saldo-menu-row">
        <button className="saldo-action-btn" onClick={handleWithdraw}>
          <span className="material-icons">account_balance_wallet</span>
          <span>{t('withdraw_cash', 'Tarik Tunai')}</span>
        </button>
        <button className="saldo-action-btn" onClick={handleWithdrawHistory}>
          <span className="material-icons">history</span>
          <span>{t('withdraw_history', 'Riwayat WD')}</span>
        </button>
      </div>

      {/* ASSETS GRID */}
      <h3 className="saldo-section-title">{t('other_assets', 'Aset Lainnya')}</h3>
      <div className="saldo-assets-list">
        <div className="saldo-asset-item" onClick={handleCoinHistory} style={{ cursor: 'pointer' }}>
          <div className="saldo-asset-info">
            <div className="saldo-asset-icon">
              <CoinIcon size={24} />
            </div>
            <div className="saldo-asset-text">
              <h4>{t('hope_coin', 'Koin Hope')}</h4>
              <p>{t('click_to_view_history', 'Klik untuk lihat riwayat mutasi')}</p>
            </div>
          </div>
          <div className="saldo-asset-value">
            {isLoading ? (
              <div className="saldo-skeleton" style={{ width: '40px', height: '20px' }}></div>
            ) : showBalance ? (
              (coins || 0).toLocaleString('id-ID')
            ) : (
              '••••'
            )}
          </div>
        </div>

        <div className="saldo-asset-item">
          <div className="saldo-asset-info">
            <div className="saldo-asset-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <span className="material-icons" style={{ color: '#10b981' }}>confirmation_number</span>
            </div>
            <div className="saldo-asset-text">
              <h4>{t('raffle_ticket', 'Tiket Undian')}</h4>
              <p>{t('used_in_mission_center', 'Digunakan di Pusat Misi')}</p>
            </div>
          </div>
          <div className="saldo-asset-value">0</div>
        </div>
      </div>
    </div>
  );
}