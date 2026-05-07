'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './HistoryCoin.css';

export default function HistoryWithdrawPage() {
  const router = useRouter();
  
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
      showNotif("Gagal memuat riwayat", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const renderStatus = (status: string) => {
    const st = (status || 'pending').toLowerCase();
    // Sesuaikan class dengan CSS status-pending, status-success, status-rejected
    let statusLabel = status;
    let statusClass = 'pending';

    if (st === 'success' || st === 'approved') {
        statusClass = 'success';
    } else if (st === 'rejected' || st === 'failed') {
        statusClass = 'rejected';
    }

    return <span className={`history-status status-${statusClass}`}>{statusLabel}</span>;
  };

  return (
    <div className="history-wrapper">
      
      {/* HEADER */}
      <header className="history-header">
        <button className="history-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Riwayat Penarikan</h2>
      </header>

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
            <p>Belum ada riwayat penarikan.</p>
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
                    Koin
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
