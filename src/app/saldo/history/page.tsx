'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './CoinHistory.css';

export default function CoinHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [totalCoins, setTotalCoins] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      const { data: chData, error: chError } = await supabase
        .from('coin_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (chError) throw chError;

      setTotalCoins(profile?.coins || 0);
      setHistory(chData || []);
    } catch (err: any) {
      console.error(err);
      showNotif(t('failed_load_history', 'Gagal ambil riwayat koin'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date
      .toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace('pukul ', '');
  };

  const handleDownloadExcel = () => {
    if (history.length === 0) {
      return showNotif(t('no_data_export', 'Tidak ada data untuk diunduh'), 'warning');
    }

    const headers = ['Tanggal', 'Aktivitas', 'Tipe', 'Jumlah Koin'];
    const csvRows = [headers.join(',')];

    history.forEach((item) => {
      const date = formatDate(item.created_at).replace(/,/g, '');
      const desc = (item.description || t('transaction', 'Transaksi')).replace(/,/g, '');
      const amount = Number(item.amount) || 0;
      const isIncome = item.type === 'masuk' || (item.type !== 'keluar' && amount >= 0);
      const type = isIncome ? 'Masuk' : 'Keluar';
      csvRows.push(`${date},${desc},${type},${Math.abs(amount)}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Riwayat_Koin_HypeTalk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotif(t('download_success', 'File Excel berhasil diunduh!'), 'success');
  };

  const handleSaveToDrive = () => {
    showNotif(
      'Fitur Simpan ke Google Drive sedang dalam tahap integrasi API. Segera Hadir!',
      'info'
    );
  };

  return (
    <div className="coin-hist-wrapper">
      <header className="coin-hist-header">
        <button className="coin-hist-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1>{t('coin_history', 'Riwayat Koin')}</h1>
      </header>

      <main className="coin-hist-container">
        {/* BALANCE CARD */}
        <div className="coin-hist-balance-card">
          <p className="coin-hist-label">{t('current_total_coins', 'Total Koin Saat Ini')}</p>
          <div className="coin-hist-amount-main">
            {loading ? (
              <div className="ch-skeleton" style={{ width: '100px', height: '40px', margin: '0 auto' }}></div>
            ) : (
              totalCoins.toLocaleString('id-ID')
            )}
          </div>
        </div>

        {/* TOMBOL EKSPOR (pakai class baru) */}
        <div className="coin-hist-export-row">
          <button className="coin-hist-export-btn excel" onClick={handleDownloadExcel}>
            <span className="material-icons">description</span>
            {t('download_excel', 'Unduh Excel')}
          </button>

          <button className="coin-hist-export-btn drive" onClick={handleSaveToDrive}>
            <span className="material-icons">add_to_drive</span>
            {t('save_to_drive', 'Simpan ke Drive')}
          </button>
        </div>

        <h3 className="coin-hist-subtitle">{t('recent_activity', 'Aktivitas Terbaru')}</h3>

        <div className="coin-hist-list">
          {loading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="coin-hist-item">
                  <div className="coin-hist-info">
                    <div className="ch-skeleton" style={{ width: '60%', height: '14px', marginBottom: '6px' }}></div>
                    <div className="ch-skeleton" style={{ width: '40%', height: '10px' }}></div>
                  </div>
                  <div className="ch-skeleton" style={{ width: '40px', height: '20px' }}></div>
                </div>
              ))
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: '48px', opacity: 0.2 }}>
                history
              </span>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>
                {t('no_coin_history', 'Belum ada riwayat aktivitas koin.')}
              </p>
            </div>
          ) : (
            history.map((item) => {
              const amount = Number(item.amount) || 0;
              const isIncome = item.type === 'masuk' || (item.type !== 'keluar' && amount >= 0);

              return (
                <div key={item.id} className="coin-hist-item">
                  <div className="coin-hist-info">
                    <span className="coin-hist-desc">
                      {item.description || t('transaction', 'Transaksi')}
                    </span>
                    <span className="coin-hist-date">{formatDate(item.created_at)}</span>
                  </div>
                  <div className={`coin-hist-trx-amount ${isIncome ? 'plus' : 'minus'}`}>
                    {isIncome ? '+' : '-'}
                    {Math.abs(amount).toLocaleString('id-ID')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}