'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  profile: any;
  isBlocking: boolean;
  onClose: () => void;
  onChat: () => void;
  onShowInfo: () => void;
  onBlock: () => void;
};

const UserProfileModal: React.FC<Props> = ({ profile, isBlocking, onClose, onChat, onShowInfo, onBlock }) => {
  if (!profile) return null;
  return (
    <div className="tg-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
        <div className="wa-profile-img-container">
          <img src={profile.avatar_url || "/asets/png/profile.webp"} alt="Profile" className="wa-profile-img" />
          <div className="wa-profile-name-bar">
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {profile.username}{profile.umur ? `, ${profile.umur}` : ''}
            </h2>
            {profile.pekerjaan && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '2px' }}>{profile.pekerjaan}</div>}
          </div>
        </div>
        <div className="wa-profile-actions">
          <button onClick={onChat} className="wa-action-btn" style={{ color: '#1da1f2' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>chat</span> Chat
          </button>
          <button onClick={onShowInfo} className="wa-action-btn" style={{ color: '#2ecc71' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>info</span> Info
          </button>
          <button onClick={onBlock} disabled={isBlocking} className="wa-action-btn" style={{ color: '#ff4757', opacity: isBlocking ? 0.5 : 1 }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>block</span> Blokir
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UserProfileModal);