'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import './Modalsroom.css';

declare global {
  interface Window {
    closeRoomSetting?: () => void;
    saveRoomSetting?: () => void;
    closeConfirmModal?: () => void;
    prosesTurunMic?: () => void;
    closeTopGiftersModal?: () => void;
    updateRadarColor?: (color: string) => void;
  }
}

export default function Modalsroom() {
  const { t } = useTranslation();

  return (
    <>
      {/* 1. MODAL SETTING ROOM (SLIDE UP) */}
      <div 
        id="setting-modal" 
        className="modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && window.closeRoomSetting) {
            window.closeRoomSetting();
          }
        }}
      >
        <div className="modal-box modal-slideup">
          <div className="sheet-handle"></div>
          <div className="modal-header">
            <h3>{t('room_settings', 'Pengaturan Room')}</h3>
            <button className="close-modal" onClick={() => window.closeRoomSetting && window.closeRoomSetting()}>
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="modal-body">
            <label>{t('new_room_name', 'Nama Room Baru')}</label>
            <input type="text" id="edit-room-name" placeholder={t('room_name_placeholder', 'Contoh: Klasikan Galau...')} />
            
            <label>{t('system_message_label', 'Pesan Pengumuman')}</label>
            <textarea id="system-message" placeholder={t('system_message_placeholder', 'Tulis pesan pengumuman untuk chat...')}></textarea>
            
            <div className="radar-settings">
              <label style={{ marginTop: '8px', display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Warna Radar Mic
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button type="button" onClick={() => window.updateRadarColor && window.updateRadarColor('#ef4444')} style={{ background: '#ef4444', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}></button>
                <button type="button" onClick={() => window.updateRadarColor && window.updateRadarColor('#1f3cff')} style={{ background: '#1f3cff', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}></button>
                <button type="button" onClick={() => window.updateRadarColor && window.updateRadarColor('#22c55e')} style={{ background: '#22c55e', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}></button>
                <button type="button" onClick={() => window.updateRadarColor && window.updateRadarColor('rgb')} style={{ background: 'linear-gradient(45deg, red, blue, green)', width: '36px', height: '36px', borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}></button>
              </div>
            </div>

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

      {/* 3. MODAL LEADERBOARD (SULTAN) */}
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
        <div className="modal-box modal-slideup">
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
