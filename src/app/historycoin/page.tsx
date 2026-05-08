'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
// 🔥 FIX 1: Import multi-bahasa
import { useTranslation } from 'react-i18next';
import './HistoryCoin.css';

export default function HistoryWithdrawPage() {
  const router = useRouter();
  
  // 🔥 FIX 2: Inisialisasi i18n
  const { t } = useTranslation();
  
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Rate konversi sesuai kesepakatan baru
  const IDR_RATE = 70; 

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // 🔥 AMBIL DATA DARI TABEL withdraw_requests 🔥
      const { data, error } = await supabase
        .from('withdraw_requests') 
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWithdrawals(data || []);

    } catch (err: any) {
      console.error("Gagal load history withdraw:", err.message);
      showNotif(t('failed_load_history', 'Gagal memuat riwayat'), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderStatus = (status: string) => {
    const st = (status || 'pending').toLowerCase();
    let statusLabel = status;
    let statusClass = 'pending';

    if (st === 'success' || st === 'approved') {
        statusClass = 'success';
    } else if (st === 'rejected' || st === 'failed') {
        statusClass = 'rejected';
    }

    return <span className={`history-status status-${statusClass}`}>{statusLabel}</span>;
  };

  // 🔥 FIX 3: SISTEM DOWNLOAD EXCEL (CSV) 🔥
  const handleDownloadExcel = () => {
    if (withdrawals.length === 0) {
      return showNotif(t('no_data_export', 'Tidak ada data untuk diunduh'), 'warning');
    }

    // Buat Header Tabel
    const headers = ['Tanggal', 'Metode Penarikan', 'Status', 'Jumlah Koin', 'Total Rupiah (Rp)'];
    const csvRows = [headers.join(',')];

    // Isi Baris Data
    withdrawals.forEach(wd => {
      const date = formatDate(wd.created_at).replace(/,/g, ''); // Hapus koma biar format CSV aman
      const koin = wd.amount || 0;
      const rp = koin * IDR_RATE;
      
      csvRows.push(`${date},${wd.method},${wd.status},${koin},${rp}`);
    });

    // Bikin File dan Trigger Download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Riwayat_Penarikan_HypeTalk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotif(t('download_success', 'File Excel berhasil diunduh!'), 'success');
  };

  // 🔥 SISTEM MOCKUP GOOGLE DRIVE 🔥
  const handleSaveToDrive = () => {
    // Note: Integrasi asli butuh Google Picker API & OAuth 2.0 Client ID di Google Cloud Console lu
    showNotif("Fitur Simpan ke Google Drive sedang dalam tahap integrasi API. Segera Hadir!", "info");
  };

  return (
    <div className="history-wrapper">
      
      {/* HEADER */}
      <header className="history-header">
        <button className="history-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('withdraw_history_title', 'Riwayat Penarikan')}</h2>
      </header>

      {/* TOMBOL EKSPOR DATA */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 16px', marginBottom: '16px', marginTop: '10px' }}>
        <button 
          onClick={handleDownloadExcel} 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: '18px', color: '#10b981' }}>description</span>
          {t('download_excel', 'Unduh Excel')}
        </button>

        <button 
          onClick={handleSaveToDrive} 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#ebf8ff', color: '#0f172a', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '12px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: '18px', color: '#3b82f6' }}>add_to_drive</span>
          {t('save_to_drive', 'Simpan ke Drive')}
        </button>
      </div>

      {/* LIST PENARIKAN */}
      <main className="history-list-container">
        {isLoading ? (
          // SKELETON LOADING
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="history-card" style={{ pointerEvents: 'none' }}>
              <div className="history-info-wrapper">
                <div className="history-icon history-skeleton"></div>
                <div>
                  <div className="history-skeleton" style={{ width: '120px', height: '14px', marginBottom: '6px' }}></div>
                  <div className="history-skeleton" style={{ width: '80px', height: '10px' }}></div>
                </div>
              </div>
              <div className="history-skeleton" style={{ width: '60px', height: '24px' }}></div>
            </div>
          ))
        ) : withdrawals.length === 0 ? (
          // EMPTY STATE
          <div className="history-empty">
            <span className="material-icons">account_balance_wallet</span>
            <p>{t('no_withdraw_history', 'Belum ada riwayat penarikan.')}</p>
          </div>
        ) : (
          // DATA PENARIKAN
          withdrawals.map((wd) => {
            const koinAmount = wd.amount || 0;
            const rupiahAmount = koinAmount * IDR_RATE;

            return (
              <div key={wd.id} className="history-card">
                <div className="history-info-wrapper">
                  <div className="history-icon">
                    <span className="material-icons">account_balance</span>
                  </div>
                  <div className="history-text">
                    {/* Format: METHOD • Rp Jumlah */}
                    <h4>{wd.method} • Rp {rupiahAmount.toLocaleString('id-ID')}</h4>
                    <p>{formatDate(wd.created_at)}</p>
                    {renderStatus(wd.status)}
                  </div>
                </div>
                
                <div className="history-amount-wrapper">
                  <div className="history-amount">
                    {koinAmount.toLocaleString('id-ID')}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {t('coins', 'Koin')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </main>

    </div>
  );
}
