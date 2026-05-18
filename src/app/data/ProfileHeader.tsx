'use client';
import React from 'react';

type Props = {
  isMe: boolean;
  username: string;
  isPrivate: boolean;
  onBack: () => void;
  onMenuClick: () => void;
};

const ProfileHeader: React.FC<Props> = ({ isMe, username, isPrivate, onBack, onMenuClick }) => {
  return (
    <header className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px' }}>
      {!isMe ? (
        <button className="header-btn" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
          <span className="material-icons">arrow_back</span>
        </button>
      ) : (
        <div style={{ width: '24px' }}></div>
      )}
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
        Hii {username}
        {isPrivate && <span className="material-icons" style={{fontSize: '14px', color: 'var(--text-secondary)'}}>lock</span>}
      </h2>
      {isMe ? (
        <button className="header-btn" onClick={onMenuClick} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
          <span className="material-icons">menu</span>
        </button>
      ) : (
        <div style={{ width: '24px' }}></div>
      )}
    </header>
  );
};

export default React.memo(ProfileHeader);