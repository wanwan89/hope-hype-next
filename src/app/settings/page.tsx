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
  const { theme, setTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
    setLoading(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showNotif(newTheme === 'dark' ? "Mode gelap aktif" : "Mode terang aktif", "info");
  };

  // Cegah Hydration Mismatch
  if (!mounted || loading) return <div className="st-page-wrapper"></div>;

  const isDarkMode = theme === 'dark';

  return (
    <div className="st-page-wrapper">
      {/* --- HEADER --- */}
      <header className="st-header">
        <button className="st-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('settings')}</h2>
      </header>

      <main className="st-container">
        
        {/* --- GRUP 1: TAMPILAN --- */}
        <div className="st-section">
          <div className="st-section-title">{t('appearance')}</div>
          <div className="st-card">
            
            {/* 🔥 FIX: onClick dicabut dari sini, cursor dibikin default 🔥 */}
            <div className="st-item" style={{ cursor: 'default' }}>
              <div className="st-item-left">
                <div className="st-icon-box">
                   <span className="material-icons">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('dark_mode')}</span>
                  <span className="st-hint">{t('dark_mode_desc')}</span>
                </div>
              </div>
              {/* 🔥 FIX: Fungsi toggle dipindah murni ke switch ini 🔥 */}
              <label className="st-switch" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
                <span className="st-slider"></span>
              </label>
            </div>
            
            <div className="st-item" onClick={() => router.push('/settings/language')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">language</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('language')}</span>
                  <span className="st-hint">{t('lang_desc')}</span>
                </div>
              </div>
              <span className="material-icons st-arrow">chevron_right</span>
            </div>

          </div>
        </div>

        {/* --- GRUP 2: AKUN --- */}
        <div className="st-section">
          <div className="st-section-title">{t('account_security')}</div>
          <div className="st-card">
            
            <div className="st-item" onClick={() => router.push('/settings/info')}>
              <div className="st-item-left">
                <div className="st-icon-box">
                  <span className="material-icons">info</span>
                </div>
                <div className="st-info">
                  <span className="st-label">{t('personal_info')}</span>
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
              <span className="st-badge st-badge-success">Sangat Baik</span>
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
                  <span className="st-label">{t('contact_us')}</span>
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
                  <span className="st-label" style={{ color: '#ef4444' }}>{t('logout')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
