'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTheme } from 'next-themes'; 
import { useTranslation } from 'react-i18next';
import './Settings.css';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation(); 
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 STATE BARU UNTUK PRIVATE AKUN 🔥
  const [isPrivate, setIsPrivate] = useState(false);
  const [updatingPrivate, setUpdatingPrivate] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      
      // Ambil status is_private dari tabel profiles
      const { data: profile } = await supabase.from('profiles').select('is_private').eq('id', session.user.id).single();
      if (profile) {
        setIsPrivate(profile.is_private || false);
      }
    }
    setLoading(false);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showNotif(nextTheme === 'dark' ? "Mode gelap aktif" : "Mode terang aktif", "info");
  };

  // 🔥 FUNGSI TOGGLE PRIVATE AKUN 🔥
  const togglePrivateAccount = async () => {
    if (!user) return;
    setUpdatingPrivate(true);
    const newValue = !isPrivate;
    
    try {
      const { error } = await supabase.from('profiles').update({ is_private: newValue }).eq('id', user.id);
      if (error) throw error;
      
      setIsPrivate(newValue);
      showNotif(newValue ? "Akun berhasil di-private" : "Akun sekarang publik", "success");
    } catch (err: any) {
      showNotif("Gagal mengubah privasi akun", "error");
    } finally {
      setUpdatingPrivate(false);
    }
  };

  // Cegah Hydration Mismatch
  if (!mounted || loading) return <div className="st-page-wrapper"></div>;

  const isDarkMode = resolvedTheme === 'dark';

  return (
    <div className="st-page-wrapper">
      {/* --- HEADER --- */}
      <header className="st-header">
        <button className="st-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('settings', 'Pengaturan')}</h2>
      </header>

      <main className="st-container">
        
        {/* --- GRUP 1: TAMPILAN --- */}
        <div className="st-section">
          <div className="st-section-title">{t('appearance', 'Tampilan')}</div>
          <div className="st-card">
            
            <div className="st-item" style={{ cursor: 'default' }}>
              <div className="st-item-left">
                <div className="st-icon-box">
                   <span className="material-icons">{resolvedTheme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('dark_mode', 'Mode Gelap')}</span>
                  <span className="st-hint">{t('dark_mode_desc', 'Gunakan tema gelap')}</span>
                </div>
              </div>
              <label className="st-switch" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={resolvedTheme === 'dark'} onChange={toggleTheme} />
                <span className="st-slider"></span>
              </label>
            </div>
            
            <div className="st-item" onClick={() => router.push('/settings/language')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">language</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('language', 'Bahasa')}</span>
                  <span className="st-hint">{t('lang_desc', 'Ubah bahasa aplikasi')}</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

          </div>
        </div>

        {/* --- GRUP 2: AKUN & PRIVASI --- */}
        <div className="st-section">
          <div className="st-section-title">{t('account_security', 'Keamanan & Privasi')}</div>
          <div className="st-card">
            
            <div className="st-item" onClick={() => router.push('/settings/info')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">info</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('personal_info', 'Informasi Pribadi')}</span>
                  <span className="st-hint">{user?.email || 'Memuat...'}</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

            <div className="st-item" onClick={() => router.push('/settings/password')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">lock</span>
                </div>
                <div className="st-info">
                  <span className="st-label">Kata Sandi</span>
                  <span className="st-hint">Perbarui kata sandi akun</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

            {/* 🔥 TOGGLE PRIVATE AKUN 🔥 */}
            <div className="st-item" style={{ cursor: 'default' }}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">lock_person</span>
                </div>
                <div className="st-info">
                  <span className="st-label">Akun Private</span>
                  <span className="st-hint">Sembunyikan karya dari non-pengikut</span>
                </div>
              </div>
              <label className="st-switch" style={{ cursor: updatingPrivate ? 'not-allowed' : 'pointer', opacity: updatingPrivate ? 0.5 : 1 }}>
                <input type="checkbox" checked={isPrivate} onChange={togglePrivateAccount} disabled={updatingPrivate} />
                <span className="st-slider"></span>
              </label>
            </div>

            {/* 🔥 DAFTAR PENGGUNA DIBLOKIR 🔥 */}
            <div className="st-item" onClick={() => router.push('/settings/blocked')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">block</span>
                </div>
                <div className="st-info">
                  <span className="st-label">Pengguna Diblokir</span>
                  <span className="st-hint">Kelola daftar blokir Anda</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

            <div className="st-item" style={{ cursor: 'default' }}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">verified_user</span>
                </div>
                <div className="st-info">
                  <span className="st-label">Kesehatan Akun</span>
                  <span className="st-hint">Status keamanan aktif</span>
                </div>
              </div>
              <span className="st-badge st-badge-success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>Sangat Baik</span>
            </div>

          </div>
        </div>

        {/* --- GRUP 3: LAINNYA --- */}
        <div className="st-section">
          <div className="st-section-title">Lainnya</div>
          <div className="st-card">
            
            <div className="st-item" onClick={() => router.push('/contact')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">help_outline</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('contact_us', 'Hubungi Kami')}</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

            <div className="st-item" onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}>
              <div className="st-item-left">
                <div className="st-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                  <span className="material-icons" style={{ color: '#ef4444' }}>logout</span>
                </div>
                <div className="st-info">
                  <span className="st-label" style={{ color: '#ef4444' }}>{t('logout', 'Keluar')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}