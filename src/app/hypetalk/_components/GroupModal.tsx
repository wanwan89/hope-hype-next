'use client';
import React from 'react';

type Props = {
  groupName: string;
  setGroupName: (val: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

const GroupModal: React.FC<Props> = ({ groupName, setGroupName, onCreate, onClose }) => (
  // Tambahkan z-index tinggi di sini untuk memastikan dia di atas navbar
  <div className="tg-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
    <div 
      className="tg-modal-content" 
      onClick={(e) => e.stopPropagation()}
      style={{ marginBottom: '60px' }} // Tambahan ruang agar tidak tertutup navbar
    >
      <div className="modal-header">
        <h3>Buat Grup Baru</h3>
        <button className="close-modal-btn" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>
      <div className="input-group">
        <span className="material-icons">groups</span>
        <input 
          type="text" 
          placeholder="Nama Grup (Max 20 Karakter)..." 
          maxLength={20} 
          value={groupName} 
          onChange={e => setGroupName(e.target.value)} 
        />
      </div>
      <button className="action-btn" onClick={onCreate}>Buat dan Mulai Obrolan</button>
    </div>
  </div>
);

export default React.memo(GroupModal);
