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
    <div className="st-page-wrapper">
      <header className="st-header">
        {/* 🔥 FIX 1: Pake tombol back yang konsisten 🔥 */}
        <button className="st-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Ubah Kata Sandi</h2>
      </header>

      <main className="st-container">
        {/* 🔥 FIX 2: Bungkus dengan st-section & st-card 🔥 */}
        <div className="st-section">
          <div className="st-card" style={{ padding: '20px' }}>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--st-text-sub)', marginBottom: '8px', fontWeight: 'bold' }}>Kata Sandi Baru</label>
              <input 
                type="password" 
                placeholder="Minimal 6 karakter" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--st-border)', 
                  background: 'var(--st-bg-main)', /* 🔥 FIX 3: Variabel background sesuai tema 🔥 */
                  color: 'var(--st-text-main)', 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--st-text-sub)', marginBottom: '8px', fontWeight: 'bold' }}>Konfirmasi Kata Sandi Baru</label>
              <input 
                type="password" 
                placeholder="Ulangi kata sandi baru" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--st-border)', 
                  background: 'var(--st-bg-main)', 
                  color: 'var(--st-text-main)', 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <button 
              onClick={handleUpdatePassword}
              disabled={isLoading || !password || !confirmPassword}
              style={{
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none',
                background: 'var(--st-primary)', /* 🔥 FIX 4: Warna tombol ditarik dari root CSS 🔥 */
                color: '#fff', 
                fontWeight: '600', 
                cursor: 'pointer',
                opacity: (isLoading || !password || !confirmPassword) ? 0.6 : 1,
                transition: '0.2s ease',
                fontSize: '14px'
              }}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
