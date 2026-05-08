'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import '../Settings.css';

export default function PersonalInfoPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '');
      }
    });
  }, []);

  const handleUpdateEmail = async () => {
    if (!newEmail.includes('@')) return showNotif("Format email tidak valid", "warning");
    if (newEmail === email) return showNotif("Ini sudah email kamu saat ini", "info");

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;
      
      showNotif("Link konfirmasi telah dikirim ke email BARU dan LAMA kamu", "success");
      setNewEmail('');
    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="st-page-wrapper">
      <header className="st-header">
        <button className="st-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Informasi Pribadi</h2>
      </header>

      <main className="st-container">
        
        {/* 🔥 FIX 1: Pake st-section dan st-section-title 🔥 */}
        <div className="st-section">
          <div className="st-section-title">Email Saat Ini</div>
          <div className="st-card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--st-text-main)', fontSize: '14px', fontWeight: '500' }}>
              {email || 'Memuat...'}
            </div>
          </div>
        </div>

        {/* 🔥 FIX 2: Area Ubah Email 🔥 */}
        <div className="st-section">
          <div className="st-section-title">Ubah Email Baru</div>
          <div className="st-card" style={{ padding: '20px' }}>
            <input 
              type="email" 
              placeholder="Masukkan email baru..." 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                width: '100%', 
                padding: '14px 16px', 
                borderRadius: '12px', 
                border: '1px solid var(--st-border)', 
                background: 'var(--st-bg-main)', /* Ambil dari variabel CSS baru */
                color: 'var(--st-text-main)', 
                outline: 'none', 
                marginBottom: '16px', 
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '14px',
                transition: 'border-color 0.2s'
              }}
            />
            <button 
              onClick={handleUpdateEmail}
              disabled={isLoading || !newEmail}
              style={{
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none',
                background: 'var(--st-primary)', /* Warna biru utama dari var CSS */
                color: '#fff', 
                fontWeight: '600', 
                cursor: 'pointer',
                opacity: (isLoading || !newEmail) ? 0.6 : 1,
                transition: '0.2s ease',
                fontSize: '14px'
              }}
            >
              {isLoading ? 'Memproses...' : 'Kirim Link Konfirmasi'}
            </button>
          </div>
          
          {/* 🔥 FIX 3: Teks Catatan dirapihin 🔥 */}
          <p style={{
            fontSize: '11px', 
            color: 'var(--st-text-sub)', 
            marginTop: '12px', 
            lineHeight: '1.5',
            padding: '0 8px'
          }}>
            *Catatan: kami akan mengirimkan link verifikasi ke email lama dan email baru kamu demi keamanan.
          </p>
        </div>
      </main>
    </div>
  );
}
