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
    <div className="settings-page">
      <header className="settings-header">
        <span className="material-icons" onClick={() => router.back()} style={{cursor: 'pointer'}}>arrow_back</span>
        <h2>Informasi Pribadi</h2>
      </header>

      <main className="settings-content">
        <div className="settings-group">
          <div className="group-title">Email Saat Ini</div>
          <div className="settings-card" style={{ padding: '16px' }}>
            <div style={{ color: 'var(--text-sub)', fontSize: '14px' }}>{email || 'Memuat...'}</div>
          </div>
        </div>

        <div className="settings-group">
          <div className="group-title">Ubah Email Baru</div>
          <div className="settings-card" style={{ padding: '16px' }}>
            <input 
              type="email" 
              placeholder="Masukkan email baru..." 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', 
                border: '1px solid var(--border-settings)', background: 'var(--bg-settings)', 
                color: 'var(--text-main)', outline: 'none', marginBottom: '16px', boxSizing: 'border-box'
              }}
            />
            <button 
              onClick={handleUpdateEmail}
              disabled={isLoading || !newEmail}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                background: '#1DA1F2', color: '#fff', fontWeight: 'bold', cursor: 'pointer',
                opacity: (isLoading || !newEmail) ? 0.6 : 1
              }}
            >
              {isLoading ? 'Memproses...' : 'Kirim Link Konfirmasi'}
            </button>
          </div>
          <p style={{fontSize: '11px', color: 'var(--text-sub)', marginTop: '10px'}}>
            *Catatan: Supabase akan mengirimkan link verifikasi ke email lama dan email baru kamu demi keamanan.
          </p>
        </div>
      </main>
    </div>
  );
}
