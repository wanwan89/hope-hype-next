'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './Settings.css';

export default function SettingsPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.removeAttribute('data-theme');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    }
    setLoading(false);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      localStorage.setItem('theme', 'dark');
      document.documentElement.removeAttribute('data-theme');
      showNotif("Mode gelap aktif", "info");
    } else {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      showNotif("Mode terang aktif", "info");
    }
  };

  if (loading) return <div className="settings-page"></div>;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <span className="material-icons" onClick={() => router.back()} style={{cursor: 'pointer'}}>arrow_back</span>
        <h2>Pengaturan</h2>
      </header>

      <main className="settings-content">
        
        {/* --- GRUP 1: TAMPILAN --- */}
        <div className="settings-group">
          <div className="group-title">Tampilan</div>
          <div className="settings-card">
            <div className="settings-item" onClick={toggleTheme}>
              <div className="item-left">
                <span className="material-icons">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                <div className="item-info">
                  <span className="item-label">Mode Gelap</span>
                  <span className="item-sub">Kurangi silau pada mata</span>
                </div>
              </div>
              <label className="switch" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
                <span className="slider"></span>
              </label>
            </div>
            
            {/* 🔥 UPDATE: Link ke halaman ganti bahasa 🔥 */}
            <div className="settings-item" onClick={() => router.push('/settings/language')}>
              <div className="item-left">
                <span className="material-icons">language</span>
                <div className="item-info">
                  <span className="item-label">Bahasa</span>
                  <span className="item-sub">Bahasa Indonesia</span>
                </div>
              </div>
              <span className="material-icons" style={{fontSize:'18px'}}>chevron_right</span>
            </div>
          </div>
        </div>

        {/* --- GRUP 2: AKUN --- */}
        <div className="settings-group">
          <div className="group-title">Akun & Keamanan</div>
          <div className="settings-card">
            <div className="settings-item" onClick={() => router.push('/settings/info')}>
              <div className="item-left">
                <span className="material-icons">info</span>
                <div className="item-info">
                  <span className="item-label">Informasi Pribadi</span>
                  <span className="item-sub">{user?.email}</span>
                </div>
              </div>
              <span className="material-icons" style={{fontSize:'18px'}}>chevron_right</span>
            </div>

            <div className="settings-item">
              <div className="item-left">
                <span className="material-icons">verified_user</span>
                <div className="item-info">
                  <span className="item-label">Kesehatan Akun</span>
                  <span className="item-sub">Status keamanan akun kamu</span>
                </div>
              </div>
              <span className="health-badge health-good">SANGAT BAIK</span>
            </div>

            {/* 🔥 UPDATE: Link ke halaman ganti sandi 🔥 */}
            <div className="settings-item" onClick={() => router.push('/settings/password')}>
              <div className="item-left">
                <span className="material-icons">lock</span>
                <div className="item-info">
                  <span className="item-label">Kata Sandi</span>
                  <span className="item-sub">Ubah kata sandi akun</span>
                </div>
              </div>
              <span className="material-icons" style={{fontSize:'18px'}}>chevron_right</span>
            </div>
          </div>
        </div>

        {/* --- GRUP 3: LAINNYA --- */}
        <div className="settings-group">
          <div className="group-title">Lainnya</div>
          <div className="settings-card">
            <div className="settings-item" onClick={() => router.push('/contact')}>
              <div className="item-left">
                <span className="material-icons">help_outline</span>
                <div className="item-info">
                  <span className="item-label">Pusat Bantuan</span>
                </div>
              </div>
            </div>
            <div className="settings-item" onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}>
              <div className="item-left">
                <span className="material-icons" style={{color: '#ef4444'}}>logout</span>
                <div className="item-info">
                  <span className="item-label" style={{color: '#ef4444'}}>Keluar Akun</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
