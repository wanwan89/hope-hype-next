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
    // Ganti bahasa secara global
    await i18n.changeLanguage(code); 
    
    // Notif otomatis ikut bahasa yang baru dipilih
    showNotif(t('lang_updated'), "success");
    
    // Balik ke halaman sebelumnya setelah user liat ceklisnya pindah
    setTimeout(() => router.back(), 500);
  };

  // Pake class st-page-wrapper biar loadingnya ga kedap-kedip putih
  if (!mounted) return <div className="st-page-wrapper"></div>;

  return (
    <div className="st-page-wrapper">
      <header className="st-header">
        <button className="st-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('language')}</h2>
      </header>

      <main className="st-container">
        <div className="st-section">
          <div className="st-card">
            {languages.map((lang) => (
              <div 
                key={lang.code} 
                className="st-item" 
                onClick={() => handleSelect(lang.code)}
              >
                <div className="st-item-left">
                  <span className="st-label">{lang.name}</span>
                </div>
                
                {/* Logika ceklis yang presisi */}
                {i18n.language.startsWith(lang.code) && (
                  <span className="material-icons" style={{ color: 'var(--st-primary)' }}>
                    check_circle
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Deskripsi ditarik dari i18n.ts */}
        <p style={{ 
          fontSize: '12px', 
          color: 'var(--st-text-sub)', 
          marginTop: '10px', 
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
