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
  
  // --- State untuk Akun Bisnis ---
  const [isBusiness, setIsBusiness] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        
        // Ambil status akun bisnis dari tabel profiles
        const { data } = await supabase
          .from('profiles')
          .select('is_business')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setIsBusiness(!!data.is_business);
        }
      }
    };
    
    fetchUserData();
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

  // --- Handler Toggle Akun Bisnis ---
  const handleToggleBusiness = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    
    // Optimistic UI update (ubah tampilan dulu biar responsif)
    setIsBusiness(newValue);
    setIsToggling(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan");

      // Update kolom is_business di tabel profiles
      const { error } = await supabase
        .from('profiles')
        .update({ is_business: newValue })
        .eq('id', user.id);

      if (error) throw error;

      showNotif(newValue ? "Berhasil beralih ke Akun Bisnis" : "Beralih ke Akun Personal", "success");
    } catch (err: any) {
      // Revert jika gagal
      setIsBusiness(!newValue);
      showNotif(err.message || "Gagal mengubah tipe akun", "error");
    } finally {
      setIsToggling(false);
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
                background: 'var(--st-bg-main)', 
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
                background: 'var(--st-primary)', 
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

        {/* 🔥 FITUR BARU: Toggle Akun Bisnis 🔥 */}
        <div className="st-section">
          <div className="st-section-title">Tipe Akun</div>
          <div className="st-card" style={{ 
            padding: '16px 20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div>
              <div style={{ color: 'var(--st-text-main)', fontSize: '15px', fontWeight: '600' }}>
                Akun Bisnis
              </div>
              <div style={{ color: 'var(--st-text-sub)', fontSize: '12px', marginTop: '4px' }}>
                Dapatkan fitur analitik dan alat kreator
              </div>
            </div>
            
            {/* UI Custom Toggle Switch */}
            <label style={{ 
              position: 'relative', 
              display: 'inline-block', 
              width: '44px', 
              height: '24px',
              flexShrink: 0
            }}>
              <input 
                type="checkbox" 
                checked={isBusiness} 
                onChange={handleToggleBusiness}
                disabled={isToggling}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{
                position: 'absolute',
                cursor: isToggling ? 'wait' : 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isBusiness ? 'var(--st-primary)' : 'var(--st-border)',
                transition: '.3s ease',
                borderRadius: '34px',
                opacity: isToggling ? 0.6 : 1
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px',
                  width: '18px',
                  left: isBusiness ? '23px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#ffffff',
                  transition: '.3s ease',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
          </div>
        </div>

      </main>
    </div>
  );
}
