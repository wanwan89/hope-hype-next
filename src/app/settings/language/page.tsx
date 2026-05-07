'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import '../Settings.css'; 

export default function LanguagePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(); 
  const [mounted, setMounted] = useState(false);

  // Mencegah hydration error antara server & client
  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = [
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'en', name: 'English (US)' },
    { code: 'zh', name: '中文 (Chinese)' },
    { code: 'ko', name: '한국어 (Korean)' }
  ];

  const handleSelect = async (code: string) => {
    // 🔥 FIX 1: Ganti bahasa secara global
    await i18n.changeLanguage(code); 
    
    // 🔥 FIX 2: Notif otomatis ikut bahasa yang baru dipilih
    showNotif(t('lang_updated'), "success");
    
    // Balik ke halaman sebelumnya setelah user liat ceklisnya pindah
    setTimeout(() => router.back(), 500);
  };

  if (!mounted) return <div className="settings-page"></div>;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <span 
          className="material-icons" 
          onClick={() => router.back()} 
          style={{ cursor: 'pointer' }}
        >
          arrow_back
        </span>
        {/* 🔥 FIX 3: Judul header ditarik dari i18n.ts */}
        <h2>{t('language')}</h2>
      </header>

      <main className="settings-content">
        <div className="settings-card">
          {languages.map((lang) => (
            <div 
              key={lang.code} 
              className="settings-item" 
              onClick={() => handleSelect(lang.code)}
            >
              <div className="item-left">
                <span className="item-label">{lang.name}</span>
              </div>
              
              {/* 🔥 FIX 4: Logika ceklis yang presisi */}
              {i18n.language.startsWith(lang.code) && (
                <span className="material-icons" style={{ color: '#1DA1F2' }}>
                  check_circle
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* 🔥 FIX 5: Deskripsi ditarik dari i18n.ts (Bisa Bahasa China & Korea juga) */}
        <p style={{ 
          fontSize: '12px', 
          color: 'var(--st-text-sub)', 
          marginTop: '20px', 
          textAlign: 'center',
          lineHeight: '1.6',
          padding: '0 24px',
          opacity: 0.8
        }}>
          {t('lang_desc')}
        </p>
      </main>
    </div>
  );
}
