'use client';
import React from 'react';
import { useConfirm } from '@/components/ConfirmProvider';

type Props = {
  profile: any;
  isBlocking: boolean;
  onClose: () => void;
  onChat: () => void;
  onShowInfo: () => void;
  onBlock: () => void;
};

const UserProfileModal: React.FC<Props> = ({ profile, isBlocking, onClose, onChat, onShowInfo, onBlock }) => {
  const confirm = useConfirm();

  if (!profile) return null;

  const handleBlockClick = async () => {
    try {
      const isConfirmed = await confirm({
        title: 'Konfirmasi Blokir',
        description: `Apakah Anda yakin ingin memblokir ${profile.username}? Anda tidak akan menerima pesan dari pengguna ini lagi.`,
        confirmText: 'Ya, Blokir',
        cancelText: 'Batal',
        variant: 'danger'
      });

      if (isConfirmed) {
        onBlock();
      }
    } catch (error) {
      console.error('Konfirmasi dibatalkan', error);
    }
  };

  return (
    <div
      className="tg-modal-overlay"
      style={{
        alignItems: 'center',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
        <div className="wa-profile-img-container">
          <img src={profile.avatar_url || "/asets/png/profile.webp"} alt="Profile" className="wa-profile-img" />
          <div className="wa-profile-name-bar">
            {/* ✅ Teks utama: pakai var(--text-main) biar hitam saat terang, putih saat gelap */}
            <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {profile.username}{profile.umur ? `, ${profile.umur}` : ''}
            </h2>
            {/* ✅ Teks sekunder: pakai var(--text-muted) */}
            {profile.pekerjaan && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                {profile.pekerjaan}
              </div>
            )}
          </div>
        </div>
        <div className="wa-profile-actions">
          <button onClick={onChat} className="wa-action-btn" style={{ color: '#1da1f2' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>chat</span> Chat
          </button>
          <button onClick={onShowInfo} className="wa-action-btn" style={{ color: '#2ecc71' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>info</span> Info
          </button>
          <button onClick={handleBlockClick} disabled={isBlocking} className="wa-action-btn" style={{ color: '#ff4757', opacity: isBlocking ? 0.5 : 1 }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>block</span> Blokir
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UserProfileModal);