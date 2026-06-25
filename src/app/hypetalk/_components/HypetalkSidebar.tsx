'use client';
import React from 'react';

type Props = {
  isOpen: boolean;
  currentUser: any;
  onOpenModal: (name: string) => void;
  onHypeMatch: () => void; // Diubah dari onCariDoi
};

const HypetalkSidebar: React.FC<Props> = ({ isOpen, currentUser, onOpenModal, onHypeMatch }) => (
  <aside className={`tg-sidebar ${isOpen ? 'open' : ''}`}>
    <div className="sidebar-header">
      <img className="side-avatar" src={currentUser?.avatar_url || "/asets/png/profile.webp"} alt="me" />
      <div className="sidebar-user-info">
        <h3 className="side-username">{currentUser?.username || "User"}</h3>
        <p className="side-id">#{currentUser?.short_id || "0000"}</p>
      </div>
      <button className="btn-edit-bio" onClick={() => onOpenModal('bio')}>Edit Biodata</button>
    </div>
    <div className="sidebar-menu">
      <button className="menu-item" onClick={() => onOpenModal('group')}>
        <span className="material-icons">group_add</span> Buat Grup Baru
      </button>
      <button className="menu-item" onClick={() => onOpenModal('privacy-settings')}>
        <span className="material-icons">lock</span> Privasi & Status
      </button>
      {/* Bagian Hype Match yang sudah disesuaikan */}
      <button className="menu-item btn-hype-match" onClick={onHypeMatch} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path 
            fill="none" 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="1.5" 
            d="m18.942 15.05l.626 2.44a2 2 0 0 1-1.44 2.434L7.433 22.67a2 2 0 0 1-2.435-1.44L1.22 6.51a2 2 0 0 1 1.44-2.434L13.354 1.33a2 2 0 0 1 2.215.912m3.371 9.11V3.543m-3.905 3.904h7.81"
          />
        </svg>
        Hype Match
      </button>
    </div>
  </aside>
);

export default React.memo(HypetalkSidebar);
