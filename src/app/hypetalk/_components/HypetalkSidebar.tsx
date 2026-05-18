'use client';
import React from 'react';

type Props = {
  isOpen: boolean;
  currentUser: any;
  sisaLimitDoi: number;
  onOpenModal: (name: string) => void;
  onCariDoi: () => void;
};

const HypetalkSidebar: React.FC<Props> = ({ isOpen, currentUser, sisaLimitDoi, onOpenModal, onCariDoi }) => (
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
      <button className="menu-item" onClick={() => onOpenModal('group')}><span className="material-icons">group_add</span> Buat Grup Baru</button>
      <button className="menu-item" onClick={() => onOpenModal('privacy-settings')}><span className="material-icons">lock</span> Privasi & Status</button>
      <button className="menu-item btn-cari-doi" onClick={onCariDoi} style={{ marginTop: '10px' }}><span className="material-icons">favorite</span> Cari Doi Sekarang <span className="limit-badge">{sisaLimitDoi}/10</span></button>
    </div>
  </aside>
);

export default React.memo(HypetalkSidebar);