'use client';
import React from 'react';

type Props = {
  onMenuClick: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
};

const HypetalkHeader: React.FC<Props> = ({ onMenuClick, searchQuery, onSearchChange }) => (
  <header className="tg-header">
    <div className="tg-header-top">
      <div className="tg-header-left">
        <button className="icon-btn" onClick={onMenuClick}>
          <span className="material-icons">menu</span>
        </button>
        <h2>Hypetalk</h2>
      </div>
    </div>
    <div className="tg-search-container">
      <div className="tg-search-box">
        <span className="material-icons">search</span>
        <input type="text" placeholder="Cari obrolan..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
      </div>
    </div>
  </header>
);

export default React.memo(HypetalkHeader);