'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Headerroom.css'; // 🔥 FIX: Import CSS khusus Header

// 👇 Kasih tau TypeScript fungsi apa aja yang nempel di window 👇
declare global {
  interface Window {
    openTopGiftersModal?: () => void;
    toggleSidebar?: () => void;
  }
}

export default function Headerroom() {
  const { t } = useTranslation();

  return (
    <header className="main-header">
      <div className="header-left">
        {/* Judul bawaan, nantinya ditimpa dinamis oleh URL params di page.tsx */}
        <h1 className="room-title">VOICE ROOM</h1>
        
        <div className="online-status">
          <div className="online-dot"></div>
          <span className="material-icons" style={{ fontSize: '13px' }}>people</span>
          {/* 🔥 FIX: Support multi-bahasa buat teks "orang di room" 🔥 */}
          <span>
            <b id="online-count">1</b> {t('people_in_room', 'orang di room')}
          </span>
        </div>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Daftar Top Gifter ini bakal di-inject dinamis gambarnya dari page.tsx */}
        <div 
          id="top-gifters-container" 
          className="top-gifters-wrapper" 
          onClick={() => window.openTopGiftersModal && window.openTopGiftersModal()}
        ></div>
        
        <button className="menu-btn" onClick={() => window.toggleSidebar && window.toggleSidebar()}>
          <span className="material-icons" style={{ fontSize: '28px' }}>menu</span>
        </button>
      </div>
    </header>
  );
}
