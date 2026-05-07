'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';
import '../Settings.css'; // Pakai CSS yang sama

export default function LanguagePage() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('id');

  const languages = [
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'en', name: 'English (US)' },
    { code: 'ms', name: 'Bahasa Melayu' }
  ];

  const handleSelect = (code: string) => {
    setSelectedLang(code);
    showNotif("Bahasa berhasil diubah", "success");
    setTimeout(() => router.back(), 800);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <span className="material-icons" onClick={() => router.back()} style={{cursor: 'pointer'}}>arrow_back</span>
        <h2>Bahasa Aplikasi</h2>
      </header>

      <main className="settings-content">
        <div className="settings-card">
          {languages.map((lang) => (
            <div key={lang.code} className="settings-item" onClick={() => handleSelect(lang.code)}>
              <div className="item-left">
                <span className="item-label">{lang.name}</span>
              </div>
              {selectedLang === lang.code && (
                <span className="material-icons" style={{color: '#1DA1F2'}}>check_circle</span>
              )}
            </div>
          ))}
        </div>
        <p style={{fontSize: '12px', color: 'var(--text-sub)', marginTop: '16px', textAlign: 'center'}}>
          Memilih bahasa akan mengubah seluruh teks pada antarmuka aplikasi.
        </p>
      </main>
    </div>
  );
}
