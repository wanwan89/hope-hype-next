'use client';
import React from 'react';

type Props = {
  onMenuClick: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
};

const HypetalkHeader: React.FC<Props> = ({ onMenuClick, searchQuery, onSearchChange }) => (
  <>
    {/* Tambahkan Google Font Dancing Script (script style) */}
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
      .hypetalk-logo {
        font-family: 'Dancing Script', cursive;
        font-weight: 700;
        font-size: 1.8rem;
        margin: 0;
        line-height: 1;
      }
    `}</style>
    <header className="tg-header">
      <div className="tg-header-top">
        <div className="tg-header-left">
          <button className="icon-btn" onClick={onMenuClick}>
            <span className="material-icons">menu</span>
          </button>
          <h2 className="hypetalk-logo">Hypetalk</h2>
        </div>
      </div>
      <div className="tg-search-container">
        <div className="tg-search-box">
          <span className="material-icons">search</span>
          <input type="text" placeholder="Cari obrolan..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
      </div>
    </header>
  </>
);

export default React.memo(HypetalkHeader);