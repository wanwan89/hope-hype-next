'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isMe: boolean;
  username: string;
  isPrivate: boolean;
  onBack: () => void;
  onMenuClick: () => void;
  onEditClick?: () => void;
  onShareClick?: () => void;
};

const ProfileHeader: React.FC<Props> = ({ 
  isMe, 
  username, 
  isPrivate, 
  onBack, 
  onMenuClick, 
  onEditClick, 
  onShareClick 
}) => {
  const router = useRouter();

  return (
    <header className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'var(--bg-main)' }}>
      
      {/* BAGIAN KIRI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {!isMe ? (
          <button className="header-btn" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
            <span className="material-icons">arrow_back</span>
          </button>
        ) : (
          <>
            {/* SVG Edit (Pensil) Khusus Owner */}
            <button className="header-btn" onClick={onEditClick} aria-label="Edit Profil" style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <g fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.586 3a2 2 0 0 1 2.828 0L21 5.586a2 2 0 0 1 0 2.828L19.414 10L14 4.586L15.586 3zm-3 3l-9 9A2 2 0 0 0 3 16.414V19a2 2 0 0 0 2 2h2.586A2 2 0 0 0 9 20.414l9-9L12.586 6z" fill="currentColor"/>
                </g>
              </svg>
            </button>
            
            {/* SVG Share Khusus Owner */}
            <button className="header-btn" onClick={onShareClick} aria-label="Bagikan Profil" style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m20 12l-6.4-7v3.5C10.4 8.5 4 10.6 4 19c0-1.167 1.92-3.5 9.6-3.5V19z"/>
              </svg>
            </button>
          </>
        )}
      </div>
      
      {/* BAGIAN TENGAH */}
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
        Hii {username}
        {isPrivate && <span className="material-icons" style={{fontSize: '14px', color: 'var(--text-secondary)'}}>lock</span>}
      </h2>
      
      {/* BAGIAN KANAN */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {isMe && (
          <button 
            className="header-btn" 
            onClick={() => router.push('/discover')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: 0 }}
          >
            <span className="material-icons">person_add</span>
          </button>
        )}
        
        {/* Menu Tiga Garis (Menu Owner) atau Titik Tiga (Pengunjung) */}
        <button className="header-btn" onClick={onMenuClick} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', padding: 0 }}>
          <span className="material-icons">{isMe ? 'menu' : 'more_vert'}</span>
        </button>
      </div>
    </header>
  );
};

export default React.memo(ProfileHeader);
