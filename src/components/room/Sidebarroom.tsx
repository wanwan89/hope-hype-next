'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Sidebarroom.css';

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
      {/* OVERLAY: Area gelap di luar menu */}
      <div 
        id="sidebar-overlay" 
        className="sidebar-overlay" 
        onClick={() => window.toggleSidebar?.()}
      ></div>

      {/* PANEL SIDEBAR */}
      <aside id="sidebar" className="sidebar-panel">
        
        <div className="sidebar-header">
          <h3>Menu Panggung</h3>
          <button className="close-sidebar-btn" onClick={() => window.toggleSidebar?.()}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="sidebar-menu">
          
          <button 
            id="menu-mic" 
            className="sidebar-menu-btn"
            onClick={(e) => window.toggleMicSidebar?.(e)}
          >
            <div className="menu-icon-box">
              <span className="material-icons" id="mic-icon">mic</span>
            </div>
            <span id="mic-text" className="menu-text">{t('turn_off_mic', 'Matikan Mic')}</span>
          </button>
          
          {/* Menu ini otomatis di-display 'flex' lewat page.tsx kalau dia Owner */}
          <button 
            id="menu-setting" 
            className="sidebar-menu-btn"
            style={{ display: 'none' }} 
            onClick={() => window.openRoomSetting?.()}
          >
            <div className="menu-icon-box">
              <span className="material-icons">settings</span>
            </div>
            <span className="menu-text">{t('room_settings', 'Pengaturan Room').replace(/⚙️\s?/g, '')}</span>
          </button>
          
          <div className="menu-divider"></div>

          <button 
            className="sidebar-menu-btn logout-item"
            onClick={() => window.keluarRoom?.()} 
          >
            <div className="menu-icon-box logout-box">
              <span className="material-icons">logout</span>
            </div>
            <span className="menu-text">{t('leave_room', 'Keluar Ruangan')}</span>
          </button>
          
        </div>
      </aside> 
    </>
  );
}
