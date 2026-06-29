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

// --- SVG Withdraw (baru) ---
const WithdrawIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <g>
      <path strokeLinecap="round" strokeWidth="1.5" d="m18.935 13.945l-.67-3.648c-.29-1.576-.435-2.364-1.008-2.83S15.86 7 14.213 7H9.787c-1.647 0-2.47 0-3.044.467c-.573.466-.718 1.254-1.008 2.83l-.67 3.648c-.6 3.271-.901 4.907.024 5.98C6.014 21 7.724 21 11.142 21h1.716c3.418 0 5.128 0 6.053-1.074s.625-2.71.024-5.98Z"/>
      <path strokeWidth="1.5" d="M12 14a2 2 0 1 1 0-4a2 2 0 0 1 0 4Z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 17.492v.009"/>
      <path strokeLinecap="round" strokeWidth="1.5" d="M21 11a1.5 1.5 0 0 0 .414-.305C22 10.089 22 9.11 22 7.152s0-2.936-.586-3.544S19.886 3 18 3H6c-1.886 0-2.828 0-3.414.608S2 5.195 2 7.152s0 2.936.586 3.543q.18.188.414.305"/>
    </g>
  </svg>
);

// --- SVG Riwayat Withdraw (baru) ---
const WithdrawHistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 22q-3.875 0-6.725-2.575T2.05 13h2.025q.375 3.025 2.638 5.013T12 20q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4Q9.85 4 8.012 5.062T5.1 8H8v2H2.2q.725-3.5 3.475-5.75T12 2q2.075 0 3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m2.8-5.8L11 12.4V7h2v4.6l3.2 3.2z"/>
  </svg>
);

// --- SVG Riwayat Transaksi (di header) ---
const RiwayatIcon = ({ size = 24, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" style={style}>
    <path d="M16.755 2h-9.51c-1.159 0-1.738 0-2.206.163a3.05 3.05 0 0 0-1.881 1.936C3 4.581 3 5.177 3 6.37v14.004c0 .858.985 1.314 1.608.744a.946.946 0 0 1 1.284 0l.483.442a1.657 1.657 0 0 0 2.25 0a1.657 1.657 0 0 1 2.25 0a1.657 1.657 0 0 0 2.25 0a1.657 1.657 0 0 1 2.25 0a1.657 1.657 0 0 0 2.25 0l.483-.442a.946.946 0 0 1 1.284 0c.623.57 1.608.114 1.608-.744V6.37c0-1.193 0-1.79-.158-2.27a3.05 3.05 0 0 0-1.881-1.937C18.493 2 17.914 2 16.755 2Z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 10.4l1.429 1.6L14.5 8"/>
    <path strokeLinecap="round" d="M7.5 15.5h9"/>
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
          <RiwayatIcon size={20} color="var(--text-main)" />
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
          <WithdrawIcon />
          <span>{t('withdraw_cash', 'Tarik Tunai')}</span>
        </button>
        <button className="saldo-action-btn" onClick={handleWithdrawHistory}>
          <WithdrawHistoryIcon />
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