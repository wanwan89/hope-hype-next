'use client';

import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import '../Settings.css'; 

export default function LanguagePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(); 

  // 🔥 FIX 1: Daftar bahasa disesuaiin sama i18n.ts (Hapus Melayu, Tambah China & Korea)
  const languages = [
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'en', name: 'English (US)' },
    { code: 'zh', name: '中文 (Chinese)' },
    { code: 'ko', name: '한국어 (Korean)' }
  ];

  const handleSelect = (code: string) => {
    // 🔥 FIX 2: Eksekusi ganti bahasa
    i18n.changeLanguage(code); 
    
    // Pesan notif juga bisa lu translate kalau mau: t('lang_changed_success')
    showNotif("Language updated!", "success");
    
    // Kasih delay dikit biar user liat tanda ceklisnya pindah baru balik
    setTimeout(() => router.back(), 500);
  };

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
        {/* 🔥 FIX 3: Judul header pake translate 🔥 */}
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
              
              {/* 🔥 FIX 4: Logika ceklis yang lebih akurat 🔥 */}
              {i18n.language.startsWith(lang.code) && (
                <span className="material-icons" style={{ color: '#1DA1F2' }}>
                  check_circle
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Tips: Lu bisa nambahin key "lang_desc" di i18n.ts buat teks di bawah ini */}
        <p style={{ 
          fontSize: '12px', 
          color: 'var(--text-sub)', 
          marginTop: '16px', 
          textAlign: 'center',
          lineHeight: '1.5',
          padding: '0 20px'
        }}>
          {i18n.language.startsWith('id') 
            ? 'Memilih bahasa akan mengubah seluruh teks pada antarmuka aplikasi.' 
            : 'Choosing a language will change all text on the application interface.'}
        </p>
      </main>
    </div>
  );
}
