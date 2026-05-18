'use client';
import React from 'react';

type Props = {
  searchId: string;
  setSearchId: (val: string) => void;
  onSearch: () => void;
  onClose: () => void;
};

const SearchModal: React.FC<Props> = ({ searchId, setSearchId, onSearch, onClose }) => (
  <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
    <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>Mulai Chat Baru</h3><button className="close-modal-btn" onClick={onClose}><span className="material-icons">close</span></button></div>
      <div className="input-group">
        <span className="material-icons">tag</span>
        <input type="text" placeholder="ID teman (Contoh: ABCD)" value={searchId} onChange={e => setSearchId(e.target.value)} />
      </div>
      <button className="action-btn" onClick={onSearch}>Cari dan Chat</button>
    </div>
  </div>
);

export default React.memo(SearchModal);