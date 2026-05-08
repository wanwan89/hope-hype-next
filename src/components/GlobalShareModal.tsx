'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils';
import { Copy, X, Share2, Send } from 'lucide-react';
import './GlobalShareModal.css';

declare global {
  interface Window {
    // 🔥 FIX: Tambahkan params untuk kirim nama user secara dinamis
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void;
  }
}

export default function GlobalShareModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shareData, setShareData] = useState({ url: '', title: '', text: '' });

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  useEffect(() => {
    // 🔥 FIX LOGIC: Default text sekarang pake key yang aman (tanpa placeholder)
    // Tapi kalau ada argumen 'name' atau 'text' dari luar, itu yang dipake.
    window.openGlobalShare = (url, title, text, name) => {
      const finalUrl = url || window.location.href;
      const finalTitle = title || 'HypeTalk';
      
      // Jika ada 'name', kita masukkan ke dalam translasi
      // Jika tidak ada 'text' dari luar, pake default i18n
      let finalText = text;
      if (!finalText) {
        finalText = name 
          ? t('share_profile_text', { name: name }) // Ini kuncinya Bree!
          : t('share_room_text', 'Ayo gabung di HypeTalk!'); // Fallback kalau gak ada nama
      }

      setShareData({ url: finalUrl, title: finalTitle, text: finalText });
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
        console.log('User cancelled');
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
          <button className="close-share" onClick={closeModal}>
            <X size={20} />
          </button>
        </div>
        
        <div className="share-body">
          {/* 🔥 Text sekarang munculin nama asli, bukan {{name}} lagi */}
          <p className="share-desc">{shareData.text}</p>
          
          <div className="share-options-grid">
            <button className="share-opt-btn copy-btn" onClick={copyLink}>
              <div className="share-icon-wrapper">
                <Copy size={22} />
              </div>
              <span>{t('copy', 'Salin')}</span>
            </button>
            
            <button className="share-opt-btn wa-btn" onClick={shareToWhatsApp}>
              <div className="share-icon-wrapper">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" />
              </div>
              <span>WHATSAPP</span>
            </button>

            <button className="share-opt-btn tg-btn" onClick={shareToTelegram}>
              <div className="share-icon-wrapper">
                <Send size={22} color="#0088cc" />
              </div>
              <span>TELEGRAM</span>
            </button>
            
            <button className="share-opt-btn native-btn" onClick={handleNativeShare}>
              <div className="share-icon-wrapper">
                <Share2 size={22} />
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
