'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import '../Settings.css';

export default function PasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (password.length < 6) return showNotif("Kata sandi minimal 6 karakter", "warning");
    if (password !== confirmPassword) return showNotif("Kata sandi tidak cocok!", "error");

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      
      showNotif("Kata sandi berhasil diubah!", "success");
      setTimeout(() => router.back(), 1000);
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
        <h2>Ubah Kata Sandi</h2>
      </header>

      <main className="settings-content">
        <div className="settings-card" style={{ padding: '20px' }}>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 'bold' }}>Kata Sandi Baru</label>
            <input 
              type="password" 
              placeholder="Minimal 6 karakter" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px', 
                border: '1px solid var(--border-settings)', background: 'var(--bg-settings)', 
                color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 'bold' }}>Konfirmasi Kata Sandi Baru</label>
            <input 
              type="password" 
              placeholder="Ulangi kata sandi baru" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px', 
                border: '1px solid var(--border-settings)', background: 'var(--bg-settings)', 
                color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            onClick={handleUpdatePassword}
            disabled={isLoading || !password || !confirmPassword}
            style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: '#1DA1F2', color: '#fff', fontWeight: 'bold', cursor: 'pointer',
              opacity: (isLoading || !password || !confirmPassword) ? 0.6 : 1
            }}
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
          </button>
        </div>
      </main>
    </div>
  );
}
