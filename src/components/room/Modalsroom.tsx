'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Modalsroom.css'; // 🔥 FIX: CSS dipisah!

// Daftarin semua fungsi modal yang nempel di window
declare global {
  interface Window {
    closeRoomSetting?: () => void;
    saveRoomSetting?: () => void;
    closeConfirmModal?: () => void;
    prosesTurunMic?: () => void;
    closeTopGiftersModal?: () => void;
  }
}

export default function Modalsroom() {
  const { t } = useTranslation();

  return (
    <>
      {/* 1. MODAL SETTING ROOM */}
      <div id="setting-modal" className="modal-overlay">
        <div className="modal-box">
          <div className="modal-header">
            <h3>{t('room_settings', '⚙️ Room Settings')}</h3>
            <button className="close-modal" onClick={() => window.closeRoomSetting && window.closeRoomSetting()}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="modal-body">
            <label>{t('new_room_name', 'Nama Room Baru')}</label>
            <input type="text" id="edit-room-name" placeholder={t('room_name_placeholder', 'Contoh: Klasikan Galau...')} />
            <label>{t('system_message_label', 'Pesan Sistem (Broadcast ke Chat)')}</label>
            <textarea id="system-message" placeholder={t('system_message_placeholder', 'Tulis pesan pengumuman...')}></textarea>
            <button className="btn-save-setting" onClick={() => window.saveRoomSetting && window.saveRoomSetting()}>
              {t('save_changes', 'SIMPAN PERUBAHAN')}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODAL KONFIRMASI (TURUN MIC) */}
      <div id="confirm-modal" className="modal-overlay" style={{ zIndex: 10005 }}>
        <div className="modal-box modal-confirm">
          <div className="confirm-icon-wrapper">
            <span className="material-icons">mic_off</span>
          </div>
          <h3>{t('leave_stage_title', 'Turun Panggung?')}</h3>
          <p>{t('leave_stage_desc', 'Yakin mau turun dari panggung sekarang? Mic kamu akan otomatis dimatikan.')}</p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => window.closeConfirmModal && window.closeConfirmModal()}>
              {t('btn_cancel', 'BATAL')}
            </button>
            <button className="btn-danger" onClick={() => window.prosesTurunMic && window.prosesTurunMic()}>
              {t('btn_confirm', 'YAKIN')}
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL LEADERBOARD (SULTAN) - 🔥 CSS-nya udah dipindah ke file terpisah 🔥 */}
      <div 
        id="top-gifters-modal" 
        className="modal-overlay" 
        style={{ zIndex: 10006 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && window.closeTopGiftersModal) {
            window.closeTopGiftersModal();
          }
        }}
      >
        <div className="modal-box modal-leaderboard">
          <div className="sheet-handle"></div>
          <div className="modal-header">
            <h3 className="gold-title">{t('the_sultan', '🏆 THE SULTAN')}</h3>
            <button className="close-modal" onClick={() => window.closeTopGiftersModal && window.closeTopGiftersModal()}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div id="top-gifters-list" className="leaderboard-list">
            {/* List Sultan akan di-inject JS ke sini */}
          </div>
        </div>
      </div>
    </>
  );
}
