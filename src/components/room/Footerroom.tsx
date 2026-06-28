'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import './Footerroom.css';

declare global {
  interface Window {
    toggleActionMenu?: () => void;
    toggleRoomGiftDrawer?: (e?: any) => void;
    kirimKomentar?: () => void;
    toast?: (title: string, msg: string, type: string) => void;
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void;
  }
}

export default function Footerroom() {
  const { t } = useTranslation();

  const handleGiftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openRoomGift'));
  };

  return (
    <div
      className="footer-floating-wrapper"
      style={{
        position: 'fixed',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '480px',
        zIndex: 90000,
        pointerEvents: 'auto',
        backgroundColor: 'transparent', /* FIX: Memastikan wrapper transparan mutlak */
      }}
    >
      <footer
        style={{
          display: 'flex',
          gap: '10px',
          padding: '8px',
          alignItems: 'center',
          backgroundColor: 'transparent', /* FIX: Menimpa background hitam bawaan jika ada */
          border: 'none',
          boxShadow: 'none',
        }}
      >
        {/* INPUT CHAT - Bentuk Kapsul Glass */}
        <div
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.12)', /* Efek kaca transparan */
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <input
            type="text"
            id="chat-input"
            placeholder={t('type_comment', 'Ketik sesuatu...')}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.kirimKomentar === 'function') window.kirimKomentar();
              }
            }}
            style={{
              width: '100%',
              backgroundColor: 'transparent', /* FIX: Memastikan input 100% transparan */
              border: 'none',
              color: '#fff',
              padding: '12px 0',
              outline: 'none',
              fontSize: '13.5px',
            }}
          />
        </div>

        {/* TOMBOL GIFT - Bulat Glass */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          onClick={handleGiftClick}
          className="footer-action-btn"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#facc15"
          >
            <path d="M9.06 1.93C7.17 1.92 5.33 3.74 6.17 6H3a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h9V8h2v3h9a1 1 0 0 0 1-1V8a2 2 0 0 0-2-2h-3.17C19 2.73 14.6.42 12.57 3.24L12 4l-.57-.78c-.63-.89-1.5-1.28-2.37-1.29M9 4c.89 0 1.34 1.08.71 1.71S8 5.89 8 5a1 1 0 0 1 1-1m6 0c.89 0 1.34 1.08.71 1.71S14 5.89 14 5a1 1 0 0 1 1-1M2 12v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8h-9v8h-2v-8z" />
          </svg>
        </motion.button>

        {/* TOMBOL MENU USER - Bulat Glass */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            window.toggleActionMenu?.();
          }}
          className="footer-action-btn"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24"
          >
            <path 
              fill="white" 
              d="M13.07 10.41a5 5 0 0 0 0-5.82A3.4 3.4 0 0 1 15 4a3.5 3.5 0 0 1 0 7a3.4 3.4 0 0 1-1.93-.59M5.5 7.5A3.5 3.5 0 1 1 9 11a3.5 3.5 0 0 1-3.5-3.5m2 0A1.5 1.5 0 1 0 9 6a1.5 1.5 0 0 0-1.5 1.5M16 17v2H2v-2s0-4 7-4s7 4 7 4m-2 0c-.14-.78-1.33-2-5-2s-4.93 1.31-5 2m11.95-4A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4Z"
            />
          </svg>
        </motion.button>

        {/* TOMBOL SHARE - Bulat Glass */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.openGlobalShare === 'function') {
              window.openGlobalShare(
                window.location.href,
                'Voice Room HypeTalk',
                'Gabung panggung suara yuk!'
              );
            } else {
              navigator.clipboard.writeText(window.location.href);
              if (window.toast) window.toast('Sukses', 'Link disalin!', 'success');
              else alert('Link disalin!');
            }
          }}
          className="footer-action-btn"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m20 12l-6.4-7v3.5C10.4 8.5 4 10.6 4 19c0-1.167 1.92-3.5 9.6-3.5V19z" />
          </svg>
        </motion.button>
      </footer>
    </div>
  );
}
