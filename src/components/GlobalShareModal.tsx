'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils';
// 🔥 Pake Lucide biar iconnya konsisten sama yang lain
import { Copy, X, Share2 } from 'lucide-react';
import './GlobalShareModal.css';

declare global {
  interface Window {
    openGlobalShare?: (url?: string, title?: string, text?: string) => void;
  }
}

export default function GlobalShareModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '', text: '' });

  // Fungsi tutup dengan animasi halus
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Sesuaikan dengan durasi transisi CSS
  }, []);

  useEffect(() => {
    window.openGlobalShare = (
      url = window.location.href, 
      title = 'HypeTalk', 
      text = t('share_profile_text', 'Ayo gabung dan seru-seruan bareng di HypeTalk!')
    ) => {
      setShareData({ url, title, text });
      setIsOpen(true);
    };

    return () => {
      delete window.openGlobalShare;
    };
  }, [t]);

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
    const text = encodeURIComponent(`${shareData.text}\n\nLink: ${shareData.url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    closeModal();
  };

  const shareToTelegram = () => {
    const url = encodeURIComponent(shareData.url);
    const text = encodeURIComponent(shareData.text);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    closeModal();
  };

  // Fitur Bonus: Panggil Native Share bawaan HP kalau ada
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
        closeModal();
      } catch (err) {
        console.log('User cancelled native share');
      }
    } else {
      copyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`global-share-overlay ${!isClosing ? 'show' : ''}`} 
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className={`global-share-sheet ${!isClosing ? 'slide-up' : ''}`}>
        <div className="sheet-handle" onClick={closeModal}></div>
        
        <div className="share-header">
          <h3>{t('share_title', 'Bagikan')}</h3>
          <button className="close-share" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="share-body">
          <p className="share-desc">{shareData.text}</p>
          
          <div className="share-options-grid">
            {/* Salin Tautan */}
            <button className="share-opt-btn copy-btn" onClick={copyLink}>
              <div className="share-icon-wrapper">
                <Copy size={24} />
              </div>
              <span>{t('copy', 'Salin')}</span>
            </button>
            
            {/* WhatsApp */}
            <button className="share-opt-btn wa-btn" onClick={shareToWhatsApp}>
              <div className="share-icon-wrapper">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" />
              </div>
              <span>WhatsApp</span>
            </button>
            
            {/* Native / Lainnya */}
            <button className="share-opt-btn native-btn" onClick={handleNativeShare}>
              <div className="share-icon-wrapper">
                <Share2 size={24} />
              </div>
              <span>{t('cat_other', 'Lainnya')}</span>
            </button>
          </div>
          
          <div className="share-url-box">
            <input type="text" readOnly value={shareData.url} />
            <button onClick={copyLink}>{t('copy', 'Salin')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
