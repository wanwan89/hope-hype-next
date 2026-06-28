'use client';

import React from 'react';

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isOnStage: boolean;
  isMicActive: boolean;
  isOwner: boolean;
  onMintaNaik: () => void;
  onToggleMic: (e: any) => void;
  onTurunPanggung: () => void;
  onOpenSetting: () => void;
}

export default function ActionSheetroom({
  isOpen, onClose, isOnStage, isMicActive, isOwner,
  onMintaNaik, onToggleMic, onTurunPanggung, onOpenSetting
}: ActionSheetProps) {

  return (
    <div className={`user-profile-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="user-profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <h3 style={{ color: '#fff', marginBottom: '20px', fontWeight: 800 }}>Aksi Ruangan</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {!isOnStage ? (
            <button className="btn-action-sheet btn-gradient" onClick={() => { onClose(); onMintaNaik(); }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>front_hand</span> Minta Naik Panggung
            </button>
          ) : (
            <>
              <button
                className="btn-action-sheet"
                style={{ background: isMicActive ? 'rgba(255,255,255,0.1)' : 'rgba(255, 71, 87, 0.2)', color: isMicActive ? '#fff' : '#ff4757' }}
                onClick={(e) => { onClose(); onToggleMic(e); }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>{isMicActive ? 'mic' : 'mic_off'}</span>
                {isMicActive ? 'Matikan Mic' : 'Nyalakan Mic'}
              </button>
              <button className="btn-action-sheet danger" onClick={() => { onClose(); onTurunPanggung(); }}>
                <span className="material-icons" style={{ fontSize: '20px' }}>logout</span> Turun Panggung
              </button>
            </>
          )}

          {isOwner && (
            <button className="btn-action-sheet" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => { onClose(); onOpenSetting(); }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>settings</span> Pengaturan Panggung
            </button>
          )}
        </div>
      </div>
    </div>
  );
}