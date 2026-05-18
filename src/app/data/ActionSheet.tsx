'use client';
import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
};

const ActionSheet: React.FC<Props> = ({ isOpen, onClose, onReport, onBlock }) => {
  return (
    <>
      <div className={`p-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <aside className={`p-follow-sheet ${isOpen ? 'open' : ''}`}>
        <div className="follow-sheet-header">
          <div className="drag-handle"></div>
          <h3>Tindakan</h3>
          <span className="material-icons close-icon" onClick={onClose}>close</span>
        </div>
        <div className="follow-sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onReport} style={{ width: '100%', padding: '16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>Laporkan Pengguna</button>
          <button onClick={onBlock} style={{ width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>Blokir Pengguna</button>
        </div>
      </aside>
    </>
  );
};

export default React.memo(ActionSheet);