'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Sidebarroom.css'; // 🔥 FIX: Import CSS khusus Sidebar

// 👇 Kasih tau TypeScript fungsi sidebar apa aja yang nempel di window 👇
declare global {
  interface Window {
    toggleSidebar?: () => void;
    toggleMicSidebar?: (event?: any) => void;
    openRoomSetting?: () => void;
    keluarRoom?: () => void;
  }
}

export default function Sidebarroom() {
  const { t } = useTranslation();

  return (
    <>
      {/* OVERLAY: Area transparan di luar menu. Kalo di-tap, nutup menu */}
      <div 
        id="sidebar-overlay" 
        className="sidebar-overlay" 
        onClick={() => window.toggleSidebar && window.toggleSidebar()}
      ></div>

      <div id="sidebar" className="sidebar">
        
        {/* Daftar Menu Sidebar */}
        <div className="sidebar-menu">
          
          <a 
            href="#" 
            id="menu-mic" 
            onClick={(e) => {
              e.preventDefault(); // 🔥 FIX: Biar layar ga loncat ke atas
              window.toggleMicSidebar && window.toggleMicSidebar(e);
            }}
          >
            <div className="menu-icon-box"><span className="material-icons" id="mic-icon">mic</span></div>
            {/* ID mic-text jangan dihapus, karena JS di page.tsx butuh ini buat ganti teks Nyalakan/Matikan */}
            <span id="mic-text">{t('turn_off_mic', 'Matikan Mic')}</span>
          </a>
          
          <a 
            href="#" 
            id="menu-setting" 
            style={{ display: 'none' }} 
            onClick={(e) => {
              e.preventDefault();
              window.openRoomSetting && window.openRoomSetting();
            }}
          >
            <div className="menu-icon-box"><span className="material-icons">settings</span></div>
            <span>{t('room_settings', 'Room Settings')}</span>
          </a>
          
          <div className="menu-divider"></div>

          <a 
            href="#" 
            className="logout-item"
            onClick={(e) => {
              e.preventDefault();
              window.keluarRoom && window.keluarRoom();
            }} 
          >
            <div className="menu-icon-box logout-box"><span className="material-icons">logout</span></div>
            <span>{t('leave_room', 'Keluar Ruangan')}</span>
          </a>
          
        </div>
      </div> 
    </>
  );
}
