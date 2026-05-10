'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Headerroom.css';

declare global {
  interface Window {
    openTopGiftersModal?: () => void;
    toggleSidebar?: () => void;
  }
}

export default function Headerroom() {
  const { t } = useTranslation();

  return (
    <header className="room-header-container">
      
      {/* KIRI: Judul Room & Status Online */}
      <div className="room-header-left">
        <h1 className="room-title">VOICE ROOM</h1>
        
        <div className="room-online-badge">
          <div className="online-indicator-dot"></div>
          <span className="material-icons online-icon">people</span>
          <span className="online-text">
            <b id="online-count">1</b> {t('people_in_room', 'Orang')}
          </span>
        </div>
      </div>
      
      {/* KANAN: Top Gifter & Menu */}
      <div className="room-header-right">
        
        <div 
          id="top-gifters-container" 
          className="top-gifters-wrapper" 
          onClick={() => window.openTopGiftersModal?.()}
          role="button"
          aria-label="Lihat Top Gifters"
        >
          {/* Gambar Top Gifter bakal di-inject otomatis dari page.tsx */}
        </div>
        
        <button 
          className="room-menu-btn" 
          onClick={() => window.toggleSidebar?.()}
          aria-label="Buka Menu"
        >
          <span className="material-icons">menu</span>
        </button>
        
      </div>
    </header>
  );
}
