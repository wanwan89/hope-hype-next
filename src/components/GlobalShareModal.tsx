'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils';
import './GlobalShareModal.css';

// Daftarin fungsi global biar bisa dipanggil dari mana aja
declare global {
  interface Window {
    openGlobalShare?: (url?: string, title?: string, text?: string) => void;
  }
}

export default function GlobalShareModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '', text: '' });

  useEffect(() => {
    // Fungsi ini nempel di window, jadi dari halaman manapun bisa manggil
    window.openGlobalShare = (
      url = window.location.href, 
      title = 'HypeTalk', 
      text = 'Ayo gabung dan seru-seruan bareng di HypeTalk!'
    ) => {
      setShareData({ url, title, text });
      setIsOpen(true);
    };

    return () => {
      delete window.openGlobalShare;
    };
  }, []);

  const closeModal = () => setIsOpen(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      showNotif(t('link_copied', 'Tautan berhasil disalin!'), 'success');
      closeModal();
    } catch (err) {
      showNotif('Gagal menyalin tautan', 'error');
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${shareData.text} Klik link ini: ${shareData.url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    closeModal();
  };

  const shareToTelegram = () => {
    const url = encodeURIComponent(shareData.url);
    const text = encodeURIComponent(shareData.text);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    closeModal();
  };

  return (
    <div 
      className={`global-share-overlay ${isOpen ? 'show' : ''}`} 
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className={`global-share-sheet ${isOpen ? 'slide-up' : ''}`}>
        <div className="sheet-handle"></div>
        
        <div className="share-header">
          <h3>{t('share_title', 'Ajak Teman Gabung')}</h3>
          <button className="close-share" onClick={closeModal}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="share-body">
          <p className="share-desc">{shareData.text}</p>
          
          <div className="share-options-grid">
            <button className="share-opt-btn copy-btn" onClick={copyLink}>
              <div className="share-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </div>
              <span>{t('copy_link', 'Salin Tautan')}</span>
            </button>
            
            <button className="share-opt-btn wa-btn" onClick={shareToWhatsApp}>
              <div className="share-icon-wrapper">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" />
              </div>
              <span>WhatsApp</span>
            </button>
            
            <button className="share-opt-btn tg-btn" onClick={shareToTelegram}>
              <div className="share-icon-wrapper">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="TG" />
              </div>
              <span>Telegram</span>
            </button>
          </div>
          
          <div className="share-url-box">
            <input type="text" readOnly value={shareData.url} />
            <button onClick={copyLink}>{t('copy', 'Copy')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
